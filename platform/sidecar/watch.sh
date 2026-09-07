#!/usr/bin/env bash
# The deploy sidecar's loop: deploy once at start (the grader at least), then
# whenever /workspace/packs changes.
#
# inotify is the fast path: a burst of saves settles for SETTLE seconds and
# deploys once. A poll every POLL seconds is the safety net for filesystems
# that do not deliver inotify events across mounts (Docker Desktop on a
# laptop; ChromeOS shared folders, the same reason `mc dev` can poll).
# deploy-learner.sh exits at once when nothing changed, so the poll is a
# hash of a small tree, and flock keeps the two paths from deploying at once.
# A failed deploy never ends the loop; the next save is another try.
set -uo pipefail

WS=/workspace
SETTLE="${SETTLE:-2}"
POLL="${POLL:-5}"
LOCK=/state/deploy.lock
mkdir -p "$WS/packs" "$WS/.course" /state

LOG="$WS/.course/deploy.log"
deploy() {
  # The editor tails deploy.log into its Deploy output channel. Keep the
  # file bounded; an unchanged-packs run prints nothing, so polls stay quiet.
  flock "$LOCK" /sidecar/deploy-learner.sh 2>&1 | tee -a "$LOG" || true
  if [ "$(stat -c %s "$LOG" 2>/dev/null || echo 0)" -gt 300000 ]; then
    tail -c 150000 "$LOG" > "$LOG.tmp" && mv "$LOG.tmp" "$LOG"
  fi
}

echo "==> initial deploy"
deploy

echo "==> watching $WS/packs (settle ${SETTLE}s, poll ${POLL}s)"
inotifywait -m -r -q -e close_write,moved_to,moved_from,create,delete --format '%w%f' "$WS/packs" 2>/dev/null |
while read -r _; do
  while read -r -t "$SETTLE" _; do :; done
  deploy
done &

while sleep "$POLL"; do
  deploy
done
