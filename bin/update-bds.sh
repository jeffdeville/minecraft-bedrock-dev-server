#!/usr/bin/env bash
# Runs ON THE SERVER. Upgrades BDS to Mojang's current release, deliberately:
#
#   check -> backup world -> warn players -> pin VERSION in .env -> recreate -> verify
#
# Called by `mc update` and by the nightly cron entry bin/deploy.sh installs.
#
#   update-bds.sh            upgrade if a newer release exists
#   update-bds.sh --check    report only
#   update-bds.sh --to V     upgrade (or downgrade the binary) to exactly V
#   update-bds.sh --pin      write the running version into .env if it says LATEST
#
# Bedrock clients auto-update within a day and refuse to join an older server,
# so the goal is to follow releases promptly but never by accident: .env is
# pinned to an exact version, and only this script changes it. A failed upgrade
# re-pins the previous version and restores the world from the backup it took.

set -euo pipefail

APP="${APP:-/opt/mc/app}"
DATA="$APP/data"
STATE="$APP/state"
BACKUPS="$APP/backups"
LOCK=/tmp/mc-deploy.lock
API=https://net-secondary.web.minecraft-services.net/api/v1.0/download/links
COMPOSE=(docker compose -f "$APP/docker-compose.yml" --project-directory "$APP")

cd "$APP"

mode=apply; target=""
while [ $# -gt 0 ]; do
  case "$1" in
    --check) mode=check ;;
    --pin)   mode=pin ;;
    --to)    target="${2:?--to needs a version}"; shift ;;
    *) sed -n '2,13p' "$0" | sed 's/^# \{0,1\}//' >&2; exit 2 ;;
  esac
  shift
done

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env
  set +a
fi
LEVEL_NAME="${LEVEL_NAME:-devworld}"
BACKUP_KEEP="${BACKUP_KEEP:-10}"
mkdir -p "$STATE" "$BACKUPS"

log() { printf '%s %s\n' "$(date -u +%FT%TZ)" "$*"; }

write_state() {
  python3 - "$STATE/update.json" "$@" <<'PY'
import json, sys, time, os
path, status, frm, to, detail = sys.argv[1:6]
tmp = path + ".tmp"
with open(tmp, "w") as f:
    json.dump({"status": status, "from": frm, "to": to, "detail": detail,
               "at": time.strftime("%Y-%m-%dT%H:%M:%S%z"), "at_epoch": int(time.time())}, f)
os.replace(tmp, path)
PY
}

set_env() {  # set_env KEY VALUE  -- edit .env in place, append if missing
  local key="$1" val="$2"
  if grep -q "^$key=" .env 2>/dev/null; then
    sed -i "s|^$key=.*|$key=$val|" .env
  else
    printf '%s=%s\n' "$key" "$val" >> .env
  fi
}

latest_version() {
  curl -fsS -m 20 -A "mc-update/1.0" "$API" | python3 -c '
import json, re, sys
for l in json.load(sys.stdin)["result"]["links"]:
    if l["downloadType"] == "serverBedrockLinux":
        print(re.search(r"bedrock-server-([0-9.]+)\.zip", l["downloadUrl"]).group(1)); break
'
}

# The itzg image leaves the unpacked binary as data/bedrock_server-<version>;
# the newest of those is what runs. Fall back to the log's Version line.
running_version() {
  local v
  v=$(ls "$DATA"/bedrock_server-* 2>/dev/null | sed 's/.*bedrock_server-//' | sort -V | tail -1)
  [ -n "$v" ] || v=$(docker logs mc-bds 2>&1 | grep -o 'Version: [0-9.]*' | tail -1 | cut -d' ' -f2)
  echo "${v:-unknown}"
}

backup_world() {  # prints the tarball path
  local stamp; stamp=$(date +%Y%m%d-%H%M%S)
  local out="$BACKUPS/world-$1-$stamp.tar.gz"
  if docker ps --format '{{.Names}}' | grep -qx mc-bds; then
    docker exec mc-bds send-command save hold  >/dev/null 2>&1 || true
    sleep 2
    docker exec mc-bds send-command save query >/dev/null 2>&1 || true
    sleep 1
    tar czf "$out" -C "$DATA" worlds
    docker exec mc-bds send-command save resume >/dev/null 2>&1 || true
  else
    tar czf "$out" -C "$DATA" worlds
  fi
  ls -1t "$BACKUPS"/world-*.tar.gz 2>/dev/null | tail -n +$((BACKUP_KEEP + 1)) | xargs -r rm -f
  echo "$out"
}

restore_world() {
  "${COMPOSE[@]}" stop bds >/dev/null 2>&1 || true
  rm -rf "$DATA/worlds"
  tar xzf "$1" -C "$DATA"
}

wait_started() {  # wait_started SINCE VERSION -> 0 if BDS logged "Server started" on that version
  local since="$1" want="$2" i
  for i in $(seq 1 60); do
    if docker logs --since "$since" mc-bds 2>&1 | grep -q "Server started"; then
      docker logs --since "$since" mc-bds 2>&1 | grep -q "Version: $want" && return 0
      return 1
    fi
    sleep 5
  done
  return 1
}

current=$(running_version)

if [ "$mode" = "pin" ]; then
  if [ "${VERSION:-LATEST}" = "LATEST" ] || [ -z "${VERSION:-}" ]; then
    v="$current"; [ "$v" = "unknown" ] && v=$(latest_version)
    set_env VERSION "$v"
    log "pinned VERSION=$v in .env"
  fi
  grep '^VERSION=' .env | cut -d= -f2
  exit 0
fi

latest="${target:-$(latest_version)}"
[ -n "$latest" ] || { log "could not determine the latest version"; exit 1; }
log "running $current, pinned ${VERSION:-LATEST}, latest $latest"

if [ "$current" = "$latest" ] && [ "${VERSION:-}" = "$latest" ]; then
  log "up to date"
  exit 0
fi
if [ "$mode" = "check" ]; then
  log "update available: $current -> $latest  (run: mc update)"
  exit 0
fi

# Share the deploy lock so an upgrade never races a deploy. Deploys that arrive
# meanwhile are skipped by deploy.sh and the next save redeploys.
exec 9>"$LOCK"
flock -w 300 9 || { log "could not take the deploy lock"; exit 1; }

log "backing up world before upgrade"
backup=$(backup_world "$current")
log "backup: $backup"

docker exec mc-bds send-command say "§eUpdating the server to $latest -- back in about a minute" \
  >/dev/null 2>&1 || true
sleep 10

set_env VERSION "$latest"
since=$(date -u +%FT%TZ)
log "starting BDS $latest"
if "${COMPOSE[@]}" up -d bds >/dev/null 2>&1 && wait_started "$since" "$latest"; then
  log "upgrade ok: $current -> $latest"
  write_state ok "$current" "$latest" "$backup"
  exit 0
fi

log "upgrade FAILED, rolling back to $current"
set_env VERSION "$current"
restore_world "$backup"
since=$(date -u +%FT%TZ)
"${COMPOSE[@]}" up -d bds >/dev/null 2>&1 || true
if wait_started "$since" "$current"; then
  write_state rolled_back "$current" "$latest" "restored $backup"
  log "rollback ok, still on $current"
else
  write_state failed "$current" "$latest" "rollback did not come up; restore $backup by hand"
  log "rollback did not come up -- see the log page"
fi
exit 1
