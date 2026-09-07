#!/usr/bin/env bash
# Runs ON THE DEV MACHINE. Installs or updates the course box:
#
#   platform/install.sh <host>
#
# rsyncs this repository to root@<host>:/opt/redstone/app and runs
# platform/bootstrap.sh there (idempotent: first run installs everything,
# later runs update and rebuild). Uses the same key as `mc`: MC_SSH_PRIVATE_KEY
# from .envrc, written to ~/.ssh/mc/<host>.key because ssh needs a path.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

die() { printf '✗ %s\n' "$*" >&2; exit 1; }

HOST="${1:-${REDSTONE_HOST:-}}"
[ -n "$HOST" ] || die "usage: platform/install.sh <host>"

if [ -z "${MC_SSH_PRIVATE_KEY:-}" ] && [ -f .envrc ]; then
  # shellcheck disable=SC1091
  . ./.envrc
fi

SSH_DIR="$HOME/.ssh/mc"
mkdir -p "$SSH_DIR" && chmod 700 "$SSH_DIR"
SSH_OPTS=(-o StrictHostKeyChecking=accept-new -o ServerAliveInterval=30)
if [ -n "${MC_SSH_PRIVATE_KEY:-}" ]; then
  KEY="$SSH_DIR/$HOST.key"
  if [ ! -f "$KEY" ] || [ "$(cat "$KEY")" != "$(printf '%s' "$MC_SSH_PRIVATE_KEY")" ]; then
    (umask 077; printf '%s\n' "$MC_SSH_PRIVATE_KEY" > "$KEY.tmp" && mv "$KEY.tmp" "$KEY")
  fi
  SSH_OPTS+=(-i "$KEY" -o IdentitiesOnly=yes)
fi

echo "==> rsync to root@$HOST:/opt/redstone/app"
ssh "${SSH_OPTS[@]}" "root@$HOST" 'mkdir -p /opt/redstone/app'
rsync -az --delete \
  --exclude .git --exclude data/ --exclude state/ --exclude addons/ --exclude backups/ \
  --exclude .env --exclude .envrc --exclude __pycache__ --exclude .serena/ \
  -e "ssh ${SSH_OPTS[*]}" ./ "root@$HOST:/opt/redstone/app/"

echo "==> bootstrap"
ssh "${SSH_OPTS[@]}" "root@$HOST" 'bash /opt/redstone/app/platform/bootstrap.sh'
