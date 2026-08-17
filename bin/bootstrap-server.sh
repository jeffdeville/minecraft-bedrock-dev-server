#!/usr/bin/env bash
# Run ONCE on a fresh Ubuntu 24.04 x86-64 box, as root.
#
# From your Chromebook:
#   ssh root@<server-ip> 'bash -s' < bin/bootstrap-server.sh
#
# Idempotent -- safe to re-run.

set -euo pipefail

MC_USER=mcdev
MC_ROOT=/opt/mc

[ "$(id -u)" -eq 0 ] || { echo "run as root" >&2; exit 1; }

echo "==> packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq ca-certificates curl git rsync python3 ufw

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
install -d -m 0700 -o "$MC_USER" -g "$MC_USER" "/home/$MC_USER/.ssh"
touch "/home/$MC_USER/.ssh/authorized_keys"
chown "$MC_USER:$MC_USER" "/home/$MC_USER/.ssh/authorized_keys"
chmod 600 "/home/$MC_USER/.ssh/authorized_keys"

# Convenience: if root already has keys, let the same key reach mcdev.
if [ -s /root/.ssh/authorized_keys ]; then
  sort -u /root/.ssh/authorized_keys "/home/$MC_USER/.ssh/authorized_keys" \
    > "/home/$MC_USER/.ssh/authorized_keys.new"
  mv "/home/$MC_USER/.ssh/authorized_keys.new" "/home/$MC_USER/.ssh/authorized_keys"
  chown "$MC_USER:$MC_USER" "/home/$MC_USER/.ssh/authorized_keys"
  chmod 600 "/home/$MC_USER/.ssh/authorized_keys"
  echo "    copied root's authorized_keys to $MC_USER"
fi

echo "==> directories"
install -d -o "$MC_USER" -g "$MC_USER" "$MC_ROOT" "$MC_ROOT/app" \
  "$MC_ROOT/app/data" "$MC_ROOT/app/state"

echo "==> bare git repo (push target)"
if [ ! -d "$MC_ROOT/repo.git" ]; then
  sudo -u "$MC_USER" git init -q --bare --initial-branch=main "$MC_ROOT/repo.git"
fi
cat > "$MC_ROOT/repo.git/hooks/post-receive" <<'HOOK'
#!/usr/bin/env bash
set -euo pipefail
APP=/opt/mc/app
REPO=/opt/mc/repo.git
while read -r _old new ref; do
  [ "$ref" = "refs/heads/main" ] || continue
  echo "--> checking out ${new:0:7}"
  git --work-tree="$APP" --git-dir="$REPO" checkout -f main
  echo "--> deploying"
  unset GIT_DIR GIT_WORK_TREE GIT_QUARANTINE_PATH
  APP="$APP" DEPLOY_REV="${new:0:7}" "$APP/bin/deploy.sh"
done
HOOK
chmod +x "$MC_ROOT/repo.git/hooks/post-receive"
chown -R "$MC_USER:$MC_USER" "$MC_ROOT"

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
  Deploy user       : $MC_USER

Next, on the Chromebook:

  1. bin/setup-chromebook.sh $IP
  2. paste the printed public key into
     /home/$MC_USER/.ssh/authorized_keys on this box
  3. bin/mc sync

Note: docker publishes ports past ufw's INPUT rules, so 19132/udp and 8080/tcp
are reachable regardless -- the ufw rules above document intent and cover the
non-docker services. Do not add other published ports casually.
EOF
