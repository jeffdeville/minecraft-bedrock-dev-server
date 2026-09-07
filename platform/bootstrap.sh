#!/usr/bin/env bash
# Runs ON THE COURSE BOX as root, from /opt/redstone/app/platform/bootstrap.sh,
# invoked by platform/install.sh over ssh. Idempotent: the first run installs
# Docker, seeds /opt/redstone/.env and starts the stack; every later run
# updates the images and restarts what changed.

set -euo pipefail

ROOT=/opt/redstone
APP="$ROOT/app"
ENV_FILE="$ROOT/.env"
COMPOSE=(docker compose --env-file "$ENV_FILE" -f "$APP/platform/docker-compose.yml")

[ "$(id -u)" -eq 0 ] || { echo "run as root" >&2; exit 1; }
[ -d "$APP/platform" ] || { echo "$APP/platform is missing; run platform/install.sh from the dev machine" >&2; exit 1; }

echo "==> packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq ca-certificates curl git rsync python3 ufw

if ! command -v docker >/dev/null; then
  echo "==> docker"
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] \
https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -qq
  apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi

echo "==> directories"
install -d "$ROOT/learners" "$ROOT/caddy/learners" "$ROOT/caddy/data" "$ROOT/caddy/config"
# Caddy's import glob must match at least one file.
[ -f "$ROOT/caddy/learners/_base.caddy" ] || echo "# one snippet per learner is generated here by the control plane" > "$ROOT/caddy/learners/_base.caddy"

if [ ! -f "$ENV_FILE" ]; then
  echo "==> seeding $ENV_FILE"
  cp "$APP/platform/.env.example" "$ENV_FILE"
  chmod 600 "$ENV_FILE"
fi
# Fill in anything generated that is still empty (safe to re-run).
set_if_empty() {
  local key="$1" value="$2"
  if ! grep -qE "^$key=.+" "$ENV_FILE"; then
    sed -i "/^$key=/d" "$ENV_FILE"
    echo "$key=$value" >> "$ENV_FILE"
  fi
}
set_if_empty ROOT "$ROOT"
set_if_empty SITE "http://$(curl -4 -fsS --max-time 5 https://ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')"
set_if_empty ADMIN_PASSWORD "$(python3 -c 'import secrets; print(secrets.token_urlsafe(12))')"
set_if_empty SECRET "$(python3 -c 'import secrets; print(secrets.token_hex(32))')"

echo "==> network"
docker network inspect redstone >/dev/null 2>&1 || docker network create redstone >/dev/null

echo "==> firewall"
ufw allow 22/tcp >/dev/null
ufw allow 80/tcp >/dev/null
ufw allow 443/tcp >/dev/null
ufw allow 443/udp >/dev/null
ufw allow 19132:19199/udp >/dev/null
ufw --force enable >/dev/null

echo "==> systemd"
install -m 0644 "$APP/platform/systemd/redstone.service" /etc/systemd/system/redstone.service
systemctl daemon-reload
systemctl enable redstone.service >/dev/null

echo "==> core stack"
"${COMPOSE[@]}" up -d --build --remove-orphans

echo "==> learners"
for env in "$ROOT"/learners/*/.env; do
  [ -f "$env" ] || continue
  name=$(basename "$(dirname "$env")")
  echo "    $name"
  docker compose -p "redstone-$name" --env-file "$env" -f "$APP/platform/learner.compose.yml" up -d --build
done

# shellcheck disable=SC1090
. "$ENV_FILE"
cat <<EOF

==> redstone is up.

  Site           : $SITE
  Admin login    : admin / $ADMIN_PASSWORD   (in $ENV_FILE)

Create learners on the admin page. Point the site's DNS name at this box
before setting SITE to an https:// address, or Caddy cannot get a certificate.
EOF
