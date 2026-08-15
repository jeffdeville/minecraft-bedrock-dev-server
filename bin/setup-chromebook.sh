#!/usr/bin/env bash
# Run once inside the Chromebook's Linux (Crostini) container.
# Usage: bin/setup-chromebook.sh <server-ip-or-hostname>

set -euo pipefail

HOST="${1:-}"
if [ -z "$HOST" ]; then
  echo "usage: bin/setup-chromebook.sh <server-ip-or-hostname>" >&2
  exit 1
fi

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "==> installing tools"
sudo apt-get update -qq
sudo apt-get install -y -qq rsync inotify-tools git curl openssh-client

# Node is only needed for editor autocomplete and local typechecking --
# the actual build happens on the server. Skip it and everything still works.
if ! command -v node >/dev/null; then
  echo "==> installing node (for editor autocomplete)"
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - >/dev/null
  sudo apt-get install -y -qq nodejs
fi

echo "==> ssh key"
if [ ! -f ~/.ssh/id_ed25519 ]; then
  ssh-keygen -t ed25519 -N "" -f ~/.ssh/id_ed25519
fi

# ControlMaster keeps one connection warm so each deploy's ssh call is ~50ms
# instead of ~600ms of handshake.
mkdir -p ~/.ssh/sockets
if ! grep -q "Host mc-server" ~/.ssh/config 2>/dev/null; then
  cat >> ~/.ssh/config <<EOF

Host mc-server
  HostName $HOST
  User mcdev
  ControlMaster auto
  ControlPath ~/.ssh/sockets/%r@%h:%p
  ControlPersist 10m
  ServerAliveInterval 30
EOF
  chmod 600 ~/.ssh/config
fi

cat > .mcrc <<EOF
MC_HOST=mc-server
MC_LOG_URL=http://$HOST:8080
EOF

echo "==> git remote"
# The server's bare repo only deploys refs/heads/main, so make sure that is
# what we're on regardless of the local git default.
git branch -M main 2>/dev/null || git symbolic-ref HEAD refs/heads/main
git remote remove prod 2>/dev/null || true
git remote add prod "mc-server:/opt/mc/repo.git"

echo "==> node deps (for autocomplete)"
command -v npm >/dev/null && npm install --silent --no-audit --no-fund || true

cat <<EOF

Done. One manual step left -- copy this key to the server:

$(cat ~/.ssh/id_ed25519.pub)

Paste it into /home/mcdev/.ssh/authorized_keys on $HOST, then:

  bin/mc sync     # first deploy
  bin/mc dev      # start the watch loop

Tip: add this project's bin/ to your PATH so you can just type 'mc':
  echo 'export PATH="$ROOT/bin:\$PATH"' >> ~/.bashrc
EOF
