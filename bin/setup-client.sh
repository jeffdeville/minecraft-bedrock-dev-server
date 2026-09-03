#!/usr/bin/env bash
# One-time setup of a dev machine: macOS (Homebrew) or Debian/Ubuntu, which
# includes the Linux (Crostini) container on a Chromebook.
#
#   bin/setup-client.sh
#
# Installs rsync, ssh, direnv, a filesystem watcher and the 1Password CLI, then
# renders .envrc from .envrc.template with `op inject` and trusts it with
# direnv. Nothing is generated locally: the SSH key, host and user all come from
# the 1Password item referenced in .envrc.template. Safe to re-run.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "==> tools"
if command -v brew >/dev/null; then
  brew list rsync  >/dev/null 2>&1 || brew install rsync
  brew list direnv >/dev/null 2>&1 || brew install direnv
  brew list fswatch >/dev/null 2>&1 || brew install fswatch
  command -v op >/dev/null || brew install --cask 1password-cli
elif command -v apt-get >/dev/null; then
  sudo apt-get update -qq
  sudo apt-get install -y -qq rsync openssh-client curl gnupg direnv inotify-tools python3
  if ! command -v op >/dev/null; then
    echo "==> 1Password CLI (apt repo, per developer.1password.com/docs/cli/get-started)"
    arch=$(dpkg --print-architecture)
    curl -sS https://downloads.1password.com/linux/keys/1password.asc \
      | sudo gpg --dearmor --yes --output /usr/share/keyrings/1password-archive-keyring.gpg
    echo "deb [arch=$arch signed-by=/usr/share/keyrings/1password-archive-keyring.gpg] https://downloads.1password.com/linux/debian/$arch stable main" \
      | sudo tee /etc/apt/sources.list.d/1password.list >/dev/null
    sudo mkdir -p /etc/debsig/policies/AC2D62742012EA22 /usr/share/debsig/keyrings/AC2D62742012EA22
    curl -sS https://downloads.1password.com/linux/debian/debsig/1password.pol \
      | sudo tee /etc/debsig/policies/AC2D62742012EA22/1password.pol >/dev/null
    curl -sS https://downloads.1password.com/linux/keys/1password.asc \
      | sudo gpg --dearmor --yes --output /usr/share/debsig/keyrings/AC2D62742012EA22/debsig.gpg
    sudo apt-get update -qq
    sudo apt-get install -y -qq 1password-cli
  fi
else
  echo "Neither brew nor apt-get found; install rsync, direnv, 1password-cli and fswatch/inotify-tools by hand." >&2
  exit 1
fi

echo "==> direnv shell hook"
for rc in ~/.bashrc ~/.zshrc; do
  shell=$(basename "$rc" | sed 's/^\.//; s/rc$//')
  [ -f "$rc" ] || continue
  grep -q 'direnv hook' "$rc" || printf '\neval "$(direnv hook %s)"\n' "$shell" >> "$rc"
done

echo "==> 1Password sign-in"
# On a Mac with the desktop app, `op` authenticates through it. Inside Crostini
# there is no desktop app, so sign in with the account directly.
if ! op whoami >/dev/null 2>&1; then
  if op account list --format json 2>/dev/null | grep -q '"url"'; then
    eval "$(op signin)"
  else
    echo "No 1Password account configured for op yet. Run:"
    echo "    op account add --address my.1password.com --email you@example.com"
    echo "    eval \"\$(op signin)\""
    echo "then re-run bin/setup-client.sh."
    exit 1
  fi
fi

echo "==> rendering .envrc from .envrc.template"
op inject -f -i .envrc.template -o .envrc
chmod 600 .envrc
direnv allow . 2>/dev/null || true

# shellcheck disable=SC1091
. ./.envrc
mkdir -p "$MC_ADDON_DIR"

cat <<EOF

Done.

  server      $MC_SSH_USER@$MC_HOST
  add-ons     $MC_ADDON_DIR   (point your add-on project's output here)

Next:
  bin/mc doctor       check everything lines up
  bin/mc bootstrap    first time only: set up the server
  bin/mc dev          start the watch loop

Tip: put bin/ on your PATH so you can just type 'mc':
  echo 'export PATH="$ROOT/bin:\$PATH"' >> ~/.${SHELL##*/}rc
EOF
