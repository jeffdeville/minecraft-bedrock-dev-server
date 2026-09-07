#!/usr/bin/env bash
# One deploy for one learner, the same steps as bin/deploy.sh without rsync
# or compose:
#
#   assemble packs/ + grader -> install-packs.py -> ask the control plane to
#   restart the server -> write .course/deploy.json -> snapshot
#
# Runs inside the sidecar container. Nothing to restart when the packs are
# the same as the last successful deploy (the sidecar itself restarting must
# not bounce the server).
set -uo pipefail

WS=/workspace
DATA=/data
STATE=/state
ADDONS="$STATE/addons"
LEVEL="${LEVEL_NAME:-world}"
started=$(date +%s)

SCRIPT_ERRORS='[]'
write_state() {
  # write_state STATUS DETAIL   (SCRIPT_ERRORS: a JSON list from the restart endpoint)
  SCRIPT_ERRORS="$SCRIPT_ERRORS" python3 - "$WS/.course/deploy.json" "$1" "$2" "$STATE/installed-packs.json" "${revision:-}" "$(( $(date +%s) - started ))" <<'PY'
import json, os, sys, time
path, status, detail, installed, rev, secs = sys.argv[1:7]
try:
    script_errors = json.loads(os.environ.get("SCRIPT_ERRORS") or "[]")
except ValueError:
    script_errors = []
packs = {"behavior_packs": [], "resource_packs": []}
try:
    with open(installed) as f:
        for kind, names in json.load(f).items():
            packs[kind] = [n for n in names if n != "grader_bp"]
except (OSError, ValueError):
    pass
os.makedirs(os.path.dirname(path), exist_ok=True)
tmp = path + ".tmp"
with open(tmp, "w") as f:
    json.dump({
        "status": status,
        "detail": detail,
        "revision": rev,
        "duration_seconds": int(secs),
        "at": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
        "at_epoch": int(time.time()),
        "script_errors": script_errors,
        **packs,
    }, f, indent=2)
os.replace(tmp, path)
PY
}

mkdir -p "$ADDONS" "$STATE"
revision=$( { find "$WS/packs" /grader_bp -type f -print0 2>/dev/null | sort -z | xargs -0 -r sha256sum; } | sha256sum | cut -c1-7)
last=$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1])).get("revision",""))' "$WS/.course/deploy.json" 2>/dev/null || true)
if [ "$last" = "$revision" ]; then
  # Nothing changed since the last attempt, successful or not: the poll path
  # lands here every few seconds, and a failed deploy is only worth retrying
  # once the learner has changed something.
  exit 0
fi
echo "==> deploy $revision for $LEARNER"

# --- 1. assemble: the learner's packs plus the grader ------------------------
rsync -a --delete --exclude '.*' "$WS/packs/" "$ADDONS/" || { write_state failed "could not copy packs/"; exit 1; }
rsync -a --delete /grader_bp/ "$ADDONS/grader_bp/" || { write_state failed "could not copy the grader"; exit 1; }

# --- 2. install and activate ---------------------------------------------------
out=$(python3 /app/bin/install-packs.py "$ADDONS" "$DATA" "$STATE" "$LEVEL" 2>&1)
rc=$?
printf '%s\n' "$out"
if [ $rc -ne 0 ]; then
  detail=$(printf '%s\n' "$out" | grep '!!' | sed 's/^ *!! //; s/ -- deploy stopped$//' | head -1)
  write_state failed "${detail:-install failed: $(printf '%s' "$out" | tail -1)}"
  exit 1
fi

# --- 3. restart the server -------------------------------------------------
write_state ok "server restarting"
answer=$(curl -sS -m 200 -X POST -H "Authorization: Bearer ${COURSE_TOKEN:-}" \
  "${COURSE_CONTROL:-http://redstone-control:8000}/api/restart/$LEARNER" 2>&1)
rc=$?
started=$(printf '%s' "$answer" | python3 -c 'import json,sys
try:
    d=json.load(sys.stdin); print("yes" if d.get("started") else "no"); print(json.dumps(d.get("script_errors", [])))
except Exception: print("no"); print("[]")' 2>/dev/null)
SCRIPT_ERRORS=$(printf '%s\n' "$started" | sed -n 2p)
[ -n "$SCRIPT_ERRORS" ] || SCRIPT_ERRORS='[]'
echo "==> restart: ${answer:0:200}"
if [ $rc -eq 0 ] && [ "$(printf '%s\n' "$started" | sed -n 1p)" = "yes" ]; then
  if [ "$SCRIPT_ERRORS" != "[]" ]; then
    echo "==> the server refused a script:"; printf '%s\n' "$SCRIPT_ERRORS" | python3 -c 'import json,sys; [print("   ", e) for e in json.load(sys.stdin)]'
  fi
  write_state ok ""
else
  write_state ok "packs installed; the server is taking a while to come back (${answer:0:120})"
fi

# --- 4. snapshot ----------------------------------------------------------------
if [ -d "$WS/.git" ]; then
  git -C "$WS" add -A packs >/dev/null 2>&1 && \
  git -c user.name=course -c user.email=course@localhost -c commit.gpgsign=false \
      -C "$WS" commit -q -m "deploy $revision" >/dev/null 2>&1 || true
fi
echo "==> done in $(( $(date +%s) - started ))s"
