#!/usr/bin/env bash
# Runs ON THE SERVER. The single deploy path -- both `mc dev` (rsync) and
# `git push prod` end up here, so there is exactly one way a change reaches
# the running world.
#
#   build -> install packs -> point the world at them -> restart -> record state

set -euo pipefail

APP="${APP:-/opt/mc/app}"
DATA="$APP/data"
STATE="$APP/state"
LOCK=/tmp/mc-deploy.lock

cd "$APP"

# Serialize. A fast typist can trigger two deploys inside one build.
exec 9>"$LOCK"
if ! flock -n 9; then
  echo "deploy already running, skipping" >&2
  exit 0
fi

# First deploy on a fresh box: .env is gitignored and not rsynced, so seed it.
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

started=$(date +%s)
mkdir -p "$STATE"

fail() {
  echo "DEPLOY FAILED: $*" >&2
  write_state "failed" "$*"
  exit 1
}

write_state() {
  local status="$1" detail="${2:-}"
  # post-receive exports DEPLOY_REV. The rsync path has no commit behind it --
  # the working tree is whatever was on the Chromebook a second ago.
  local sha="${DEPLOY_REV:-rsync}"
  python3 - "$STATE/deploy.json" "$status" "$detail" "$sha" "$(( $(date +%s) - started ))" <<'PY'
import json, sys, time, os
path, status, detail, sha, secs = sys.argv[1:6]
tmp = path + ".tmp"
with open(tmp, "w") as f:
    json.dump({
        "status": status,
        "detail": detail,
        "revision": sha,
        "duration_seconds": int(secs),
        "at": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
        "at_epoch": int(time.time()),
    }, f)
os.replace(tmp, path)
PY
}

# --- 1. Build ---------------------------------------------------------------
# Runs in a container so the host needs no Node toolchain at all. node_modules
# persists in the working tree between deploys, so the warm path is ~1s.
echo "==> build"
# package-lock.json may not exist yet; `cat` failing under pipefail would
# otherwise abort the whole deploy.
deps_hash=$( { cat package.json; cat package-lock.json 2>/dev/null || true; } \
  | sha256sum | cut -d' ' -f1)
install_cmd="true"
if [ ! -f node_modules/.deps-hash ] || [ "$(cat node_modules/.deps-hash)" != "$deps_hash" ]; then
  echo "    dependencies changed, installing"
  install_cmd="if [ -f package-lock.json ]; then npm ci --no-audit --no-fund; else npm install --no-audit --no-fund; fi"
fi

docker run --rm \
  -v "$APP:/app" -w /app \
  -u "$(id -u):$(id -g)" \
  -e HOME=/tmp \
  node:22-slim \
  sh -ec "$install_cmd; node build.mjs" || fail "build failed -- see the log page"

echo "$deps_hash" > node_modules/.deps-hash

# --- 2. Install packs into the BDS data volume ------------------------------
echo "==> install packs"
mkdir -p "$DATA/behavior_packs" "$DATA/resource_packs" "$DATA/worlds/$LEVEL_NAME"

# --delete so that deleting a pack locally actually removes it from the server.
rsync -a --delete packs/behavior/ "$DATA/behavior_packs/"
if [ -d packs/resource ] && [ -n "$(ls -A packs/resource 2>/dev/null)" ]; then
  rsync -a --delete packs/resource/ "$DATA/resource_packs/"
fi

# --- 3. Point the world at the packs ----------------------------------------
# BDS ignores anything in behavior_packs/ that the world doesn't explicitly
# list. This is the step everyone forgets and then wonders why nothing ran.
#
# Only OUR packs get listed. BDS unpacks ~140 stock packs (vanilla, chemistry,
# editor) into these same directories on first boot, and listing those would
# tell the world to load vanilla content a second time. The allow-list is
# simply whatever this repo ships under packs/.
MANAGED_BP=$(ls packs/behavior 2>/dev/null | tr '\n' ' ')
MANAGED_RP=$(ls packs/resource 2>/dev/null | tr '\n' ' ')

python3 - "$DATA" "$LEVEL_NAME" "$MANAGED_BP" "$MANAGED_RP" <<'PY' || exit 1
import json, os, re, sys

data, level = sys.argv[1], sys.argv[2]
managed = {"behavior_packs": sys.argv[3].split(), "resource_packs": sys.argv[4].split()}
world = os.path.join(data, "worlds", level)

def load(path):
    """Mojang's own manifests use // comments (JSONC). Ours don't, but be
    tolerant so a hand-copied pack can't take the deploy down."""
    with open(path) as f:
        return json.loads(re.sub(r"(?m)^\s*//.*$", "", f.read()))

def collect(kind, out_name):
    root = os.path.join(data, kind)
    entries = []
    for name in managed[kind]:
        manifest = os.path.join(root, name, "manifest.json")
        if not os.path.isfile(manifest):
            continue
        try:
            header = load(manifest)["header"]
        except (json.JSONDecodeError, KeyError) as e:
            print(f"  !! {name}/manifest.json is unusable ({e}) -- deploy stopped",
                  file=sys.stderr)
            sys.exit(1)
        entries.append({"pack_id": header["uuid"], "version": header["version"]})
    path = os.path.join(world, out_name)
    tmp = path + ".tmp"
    with open(tmp, "w") as f:
        json.dump(entries, f, indent=2)
    os.replace(tmp, path)
    print(f"  {out_name}: {len(entries)} pack(s)")

collect("behavior_packs", "world_behavior_packs.json")
collect("resource_packs", "world_resource_packs.json")
PY

# --- 4. Apply -----------------------------------------------------------------
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
