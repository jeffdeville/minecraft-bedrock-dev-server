#!/usr/bin/env bash
# Runs ON THE SERVER, at /opt/mc/app/bin/deploy.sh, invoked over ssh by
# `mc sync` / `mc dev` after they rsync this tree and the add-ons up. It is
# the only way a change reaches the running world:
#
#   install add-ons -> point the world at them -> restart/reload BDS -> record state

set -euo pipefail

APP="${APP:-/opt/mc/app}"
DATA="$APP/data"
STATE="$APP/state"
ADDONS="$APP/addons"
LOCK=/tmp/mc-deploy.lock

cd "$APP"

# Serialize. A build tool can emit several files inside one deploy.
exec 9>"$LOCK"
if ! flock -n 9; then
  echo "deploy already running, skipping" >&2
  exit 0
fi

# First deploy on a fresh box: .env is server-local and never rsynced, so seed it.
if [ ! -f .env ] && [ -f .env.example ]; then
  cp .env.example .env
  echo "seeded .env from .env.example -- edit it on the server to change settings"
fi
if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env
  set +a
fi
LEVEL_NAME="${LEVEL_NAME:-devworld}"
RELOAD_MODE="${RELOAD_MODE:-restart}"
AUTO_UPDATE="${AUTO_UPDATE:-true}"
UPDATE_CRON="${UPDATE_CRON:-0 8 * * *}"

started=$(date +%s)
mkdir -p "$STATE" "$ADDONS"

# Pin the game version. With VERSION=LATEST the image would upgrade BDS on any
# restart -- i.e. on every deploy -- with no backup. update-bds.sh --pin writes
# the running version (or today's release on a fresh box) into .env once, and
# from then on only `mc update` changes it.
VERSION=$("$APP/bin/update-bds.sh" --pin | tail -1)
export VERSION

# Nightly update check, installed in the deploy user's crontab so any box this
# script deploys to gets it. AUTO_UPDATE=false in .env removes it.
cron_line="$UPDATE_CRON APP=$APP $APP/bin/update-bds.sh >> $STATE/update.log 2>&1 # mc-update"
{ crontab -l 2>/dev/null || true; } | grep -v '# mc-update$' > /tmp/mc-crontab.$$ || true
if [ "$AUTO_UPDATE" = "true" ]; then
  echo "$cron_line" >> /tmp/mc-crontab.$$
fi
crontab /tmp/mc-crontab.$$ && rm -f /tmp/mc-crontab.$$

# A short content hash of the add-ons tree stands in for a git revision on the
# log page, so you can tell whether the deploy you're looking at is the one you
# just saved.
revision=$(find "$ADDONS" -type f -print0 | sort -z | xargs -0 -r sha256sum \
  | sha256sum | cut -c1-7)

write_state() {
  local status="$1" detail="${2:-}"
  python3 - "$STATE/deploy.json" "$status" "$detail" "$revision" "$(( $(date +%s) - started ))" <<'PY'
import json, sys, time, os
path, status, detail, rev, secs = sys.argv[1:6]
tmp = path + ".tmp"
with open(tmp, "w") as f:
    json.dump({
        "status": status,
        "detail": detail,
        "revision": rev,
        "duration_seconds": int(secs),
        "at": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
        "at_epoch": int(time.time()),
    }, f)
os.replace(tmp, path)
PY
}

fail() {
  echo "DEPLOY FAILED: $*" >&2
  write_state "failed" "$*"
  exit 1
}

# --- 1. Install add-ons and activate them on the world ----------------------
echo "==> install add-ons ($revision) on BDS $VERSION"
python3 "$APP/bin/install-packs.py" "$ADDONS" "$DATA" "$STATE" "$LEVEL_NAME" \
  || fail "add-on install failed -- see the log page"

# --- 2. Apply -----------------------------------------------------------------
was_running=no
if docker ps --format '{{.Names}}' | grep -qx mc-bds; then
  was_running=yes
fi

# Brings up anything not running (first deploy, after a reboot) and rebuilds the
# log viewer image if its source changed. No-op once warm.
echo "==> ensure stack up"
docker compose -f "$APP/docker-compose.yml" --project-directory "$APP" up -d --build \
  || fail "docker compose up failed"

if [ "$was_running" = "no" ]; then
  echo "==> server was down; it just started with the new packs"
elif [ "$RELOAD_MODE" = "reload" ]; then
  echo "==> /reload"
  docker exec mc-bds send-command say "§ereloading scripts..." >/dev/null 2>&1 || true
  docker exec mc-bds send-command reload || fail "reload command failed"
else
  echo "==> restart"
  docker exec mc-bds send-command say "§erestarting, reconnect in a few seconds" \
    >/dev/null 2>&1 || true
  docker compose -f "$APP/docker-compose.yml" --project-directory "$APP" restart bds \
    || fail "container restart failed"
fi

write_state "ok" ""
echo "==> done in $(( $(date +%s) - started ))s"
