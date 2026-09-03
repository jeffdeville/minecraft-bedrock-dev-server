#!/usr/bin/env bash
# Run ONCE on a fresh Ubuntu x86-64 box (Vultr or anywhere), as root.
# Normally invoked from the dev machine as `mc bootstrap`, which streams this
# script over root ssh and passes the deploy user's public key in MC_PUBKEY.
# By hand:
#   ssh root@<server-ip> "MC_PUBKEY='ssh-ed25519 AAAA...' bash -s" < bin/bootstrap-server.sh
#
# Idempotent -- safe to re-run.

set -euo pipefail

MC_USER="${MC_USER:-mcdev}"
MC_ROOT=/opt/mc
MC_PUBKEY="${MC_PUBKEY:-}"

[ "$(id -u)" -eq 0 ] || { echo "run as root" >&2; exit 1; }

echo "==> packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq ca-certificates curl rsync python3 ufw cron

if ! command -v docker >/dev/null; then
  echo "==> docker"
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
    -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] \
https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -qq
  apt-get install -y -qq docker-ce docker-ce-cli containerd.io \
    docker-buildx-plugin docker-compose-plugin
fi

echo "==> user $MC_USER"
id -u "$MC_USER" >/dev/null 2>&1 || useradd -m -s /bin/bash "$MC_USER"
usermod -aG docker "$MC_USER"
AUTH="/home/$MC_USER/.ssh/authorized_keys"
install -d -m 0700 -o "$MC_USER" -g "$MC_USER" "/home/$MC_USER/.ssh"
touch "$AUTH"

if [ -n "$MC_PUBKEY" ]; then
  grep -qxF "$MC_PUBKEY" "$AUTH" || echo "$MC_PUBKEY" >> "$AUTH"
  echo "    installed the deploy key for $MC_USER"
elif [ -s /root/.ssh/authorized_keys ]; then
  # No key given: let whatever reaches root also reach the deploy user.
  sort -u /root/.ssh/authorized_keys "$AUTH" > "$AUTH.new" && mv "$AUTH.new" "$AUTH"
  echo "    copied root's authorized_keys to $MC_USER"
fi
chown "$MC_USER:$MC_USER" "$AUTH"
chmod 600 "$AUTH"

echo "==> directories"
install -d -o "$MC_USER" -g "$MC_USER" "$MC_ROOT" "$MC_ROOT/app" \
  "$MC_ROOT/app/data" "$MC_ROOT/app/state" "$MC_ROOT/app/addons"

echo "==> firewall"
ufw allow 22/tcp    >/dev/null
ufw allow 19132/udp >/dev/null   # Minecraft Bedrock
ufw allow 8080/tcp  >/dev/null   # log viewer
ufw --force enable  >/dev/null
ufw status numbered

IP=$(curl -4 -fsS --max-time 5 https://ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')

cat <<EOF

==> Server ready.

  Minecraft address : $IP  port 19132
  Log viewer        : http://$IP:8080
  Deploy user       : $MC_USER  (ssh $MC_USER@$IP)

Next, on the dev machine:  mc sync    (first deploy pulls the BDS image; give it a couple of minutes)

Note: docker publishes ports past ufw's INPUT rules, so 19132/udp and 8080/tcp
are reachable regardless -- the ufw rules above document intent and cover the
non-docker services. Do not add other published ports casually.
EOF
