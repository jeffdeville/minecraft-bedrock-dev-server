#!/usr/bin/env python3
"""provision.py NAME PORT TOKEN

Create or update one learner's stack. Runs inside the control container as
root, with /opt/redstone mounted at the same path as on the host. Idempotent:
re-running updates the env file, rebuilds images and restarts what changed,
and leaves the workspace and world alone.

  1. learners/NAME/{workspace,data,state}; workspace from course/bin/new-workspace
  2. the in-game check hook, workspace/.course/game-check
  3. learners/NAME/.env for learner.compose.yml (BDS_VERSION=LATEST resolved once)
  4. everything chowned to uid 1000, which is what the server, the editor and
     the sidecar all run as
  5. docker compose -p redstone-NAME up -d --build
  6. caddy/learners/NAME.caddy and a caddy reload
"""

import json
import os
import re
import shutil
import subprocess
import sys
import urllib.request
from pathlib import Path

ROOT = Path(os.environ.get("ROOT", "/opt/redstone"))
APP = ROOT / "app"
UID = 1000
API = "https://net-secondary.web.minecraft-services.net/api/v1.0/download/links"
NAME_RE = re.compile(r"^[a-z][a-z0-9]{1,23}$")


def die(msg):
    print(f"provision: {msg}", file=sys.stderr)
    sys.exit(1)


def run(*cmd, **kw):
    print("+", " ".join(str(c) for c in cmd), flush=True)
    subprocess.run([str(c) for c in cmd], check=True, **kw)


def latest_bds_version():
    """The same lookup bin/update-bds.sh does; the concrete version is pinned per learner."""
    with urllib.request.urlopen(urllib.request.Request(API, headers={"User-Agent": "redstone/1.0"}), timeout=20) as r:
        links = json.load(r)["result"]["links"]
    for link in links:
        if link.get("downloadType") == "serverBedrockLinux":
            m = re.search(r"bedrock-server-([\d.]+)\.zip", link["downloadUrl"])
            if m:
                return m.group(1)
    die("could not find the Linux server download in Mojang's link list")


def chown_tree(path):
    for p in [path, *path.rglob("*")]:
        try:
            os.chown(p, UID, UID, follow_symlinks=False)
        except FileNotFoundError:
            pass


def write_if_changed(path, text, mode=0o644):
    if path.exists() and path.read_text() == text:
        return False
    path.write_text(text)
    os.chmod(path, mode)
    return True


def main(argv):
    if len(argv) != 3:
        die(__doc__.strip())
    name, port, token = argv
    if not NAME_RE.match(name):
        die("name must be 2-24 lowercase letters or digits, starting with a letter")
    port = int(port)
    home = ROOT / "learners" / name
    ws = home / "workspace"
    for d in (home, home / "data", home / "state"):
        d.mkdir(parents=True, exist_ok=True)

    # 1. workspace
    if not (ws / ".git").is_dir():
        if ws.exists():
            shutil.rmtree(ws)
        run(sys.executable, APP / "course" / "bin" / "new-workspace", ws)
    else:
        # Refresh lessons and solution tags to the current course.
        run(sys.executable, APP / "course" / "bin" / "build-tags", ws)

    # 2. the in-game check hook: asks the control plane, which has the socket
    course_dir = ws / ".course"
    course_dir.mkdir(exist_ok=True)
    hook = course_dir / "game-check"
    write_if_changed(hook, """#!/bin/sh
# Written by the platform. `game-check <lesson-id>` asks the control plane to
# send scriptevent course:check to this learner's server and report the
# grader's answer. Exit 0 on PASS; the FAIL line is printed either way.
url="${COURSE_CONTROL:-http://redstone-control:8000}/game-check/${COURSE_LEARNER:?}/$1"
out=$(curl -sS -m 35 -H "Authorization: Bearer ${COURSE_TOKEN:?}" -w '\\n%{http_code}' "$url") || exit 1
code=${out##*
}
body=${out%
*}
printf '%s\\n' "$body"
[ "$code" = "200" ]
""", mode=0o755)

    # 3. env for the learner's compose project
    env_path = home / ".env"
    existing = {}
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            if "=" in line and not line.startswith("#"):
                k, _, v = line.partition("=")
                existing[k.strip()] = v.strip()
    version = existing.get("VERSION") or os.environ.get("BDS_VERSION", "LATEST")
    if version == "LATEST":
        version = latest_bds_version()
        print(f"pinned BDS {version} for {name}")
    env = {
        "LEARNER": name,
        "ROOT": str(ROOT),
        "PORT": str(port),
        "PORT6": str(port + 1),
        "TOKEN": token,
        "VERSION": version,
        "BEDROCK_IMAGE_TAG": os.environ.get("BEDROCK_IMAGE_TAG", "2026.8.2"),
        "SETTLE": os.environ.get("SETTLE", "2"),
        "BDS_MEMORY": os.environ.get("BDS_MEMORY", "1g"),
        "LEVEL_NAME": existing.get("LEVEL_NAME", "world"),
    }
    write_if_changed(env_path, "".join(f"{k}={v}\n" for k, v in env.items()), mode=0o600)

    # 4. ownership
    chown_tree(ws)
    chown_tree(home / "data")
    chown_tree(home / "state")

    # 5. containers
    run("docker", "compose", "-p", f"redstone-{name}", "--env-file", env_path,
        "-f", APP / "platform" / "learner.compose.yml", "up", "-d", "--build", "--remove-orphans")

    # 6. routing
    snippet = ROOT / "caddy" / "learners" / f"{name}.caddy"
    if write_if_changed(snippet, f"""# generated by provision.py
handle_path /u/{name}/* {{
\treverse_proxy redstone-{name}-code:8080
}}
"""):
        run("docker", "exec", "redstone-caddy", "caddy", "reload", "--config", "/etc/caddy/Caddyfile")

    print(f"provisioned {name}: editor /u/{name}/, Minecraft port {port} (v6 {port + 1}), BDS {version}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
