#!/usr/bin/env python3
"""The redstone control plane. Python stdlib only; listens on :8000 behind Caddy.

  /login, /logout          password login, signed session cookie
  /auth/check              Caddy's forward_auth target for /u/<name>/: 200 with
                           X-Learner when the cookie's user may see that editor
  /                        dashboard: the learner's lesson progress, last
                           deploy, editor link, restart and in-game check
  /admin                   create learners, reset passwords, see everyone
  /game-check/<name>/<id>  bearer-token endpoint the workspace hook calls:
                           send scriptevent course:check <id> to that learner's
                           server and return the grader's PASS/FAIL line
  /api/restart/<name>      bearer-token endpoint the deploy sidecar calls after
                           installing packs: warn players, docker restart, wait
                           for "Server started"

Users, sessions and the per-learner token and port live in
$ROOT/control.db (SQLite). Provisioning is provision.py in a thread; its
output goes to learners/<name>/provision.log and shows on the admin page.
"""

import hashlib
import hmac
import html
import json
import os
import re
import secrets
import sqlite3
import subprocess
import sys
import threading
import time
import urllib.parse
from http import cookies
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(os.environ.get("ROOT", "/opt/redstone"))
DB_PATH = ROOT / "control.db"
SECRET = os.environ.get("SECRET") or sys.exit("SECRET is not set")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "")
FIRST_PORT = int(os.environ.get("FIRST_PORT", "19132"))
SITE = os.environ.get("SITE", "")
SESSION_SECONDS = 30 * 24 * 3600
NAME_RE = re.compile(r"^[a-z][a-z0-9]{1,23}$")
GRADER_LINE_RE = re.compile(r"\[course\] (PASS|FAIL) ([^\s:]+)(?::\s*(.*))?")
GAME_WAIT = 20
RESTART_WAIT = 180

lock = threading.Lock()
provisioning = {}  # name -> Thread


# --- storage ------------------------------------------------------------------

def db():
    conn = sqlite3.connect(DB_PATH, timeout=10)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    with db() as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS users (
                name TEXT PRIMARY KEY,
                hash TEXT NOT NULL,
                salt TEXT NOT NULL,
                is_admin INTEGER NOT NULL DEFAULT 0,
                token TEXT,
                port INTEGER,
                created_at TEXT NOT NULL
            );
        """)
        if not conn.execute("SELECT 1 FROM users WHERE is_admin = 1").fetchone():
            if not ADMIN_PASSWORD:
                sys.exit("no admin user yet and ADMIN_PASSWORD is empty")
            create_user(conn, "admin", ADMIN_PASSWORD, is_admin=True)
            print("created the admin user")


def hash_password(password, salt):
    return hashlib.scrypt(password.encode(), salt=bytes.fromhex(salt), n=2 ** 14, r=8, p=1).hex()


def create_user(conn, name, password, is_admin=False):
    salt = secrets.token_hex(16)
    conn.execute(
        "INSERT INTO users (name, hash, salt, is_admin, created_at) VALUES (?, ?, ?, ?, ?)",
        (name, hash_password(password, salt), salt, int(is_admin), time.strftime("%Y-%m-%dT%H:%M:%S%z")),
    )


def check_password(conn, name, password):
    row = conn.execute("SELECT hash, salt FROM users WHERE name = ?", (name,)).fetchone()
    return bool(row) and hmac.compare_digest(row["hash"], hash_password(password, row["salt"]))


def learners(conn):
    return conn.execute("SELECT * FROM users WHERE is_admin = 0 ORDER BY port").fetchall()


# --- sessions ---------------------------------------------------------------------

def sign(value):
    return hmac.new(SECRET.encode(), value.encode(), hashlib.sha256).hexdigest()


def make_cookie(name):
    expiry = str(int(time.time()) + SESSION_SECONDS)
    payload = f"{name}|{expiry}"
    return f"{payload}|{sign(payload)}"


def read_cookie(value):
    try:
        name, expiry, sig = value.split("|")
    except (ValueError, AttributeError):
        return None
    if not hmac.compare_digest(sig, sign(f"{name}|{expiry}")):
        return None
    if int(expiry) < time.time():
        return None
    return name


# --- docker helpers --------------------------------------------------------------

def docker(*args, timeout=30):
    return subprocess.run(["docker", *args], capture_output=True, text=True, timeout=timeout)


def console(container, *words):
    """Send one console line to a Bedrock server via the image's send-command.

    That script finds the server process by scanning /proc, which Ubuntu's
    docker-default AppArmor profile denies to a normal exec (even as root);
    a privileged exec is outside the profile. Verified on the box; a plain
    `docker exec` works on Docker Desktop and fails on Ubuntu.
    """
    return docker("exec", "-u", "0", "--privileged", container, "send-command", *words, timeout=15)


def container_state(name):
    r = docker("inspect", "-f", "{{.State.Status}}", name, timeout=10)
    return r.stdout.strip() if r.returncode == 0 else "absent"


def game_check(name, lesson_id):
    """Send the scriptevent, watch the log for the grader's answer. Returns (passed, line)."""
    c = f"redstone-{name}-bds"
    if container_state(c) != "running":
        return False, f"[course] FAIL {lesson_id}: your server is not running; press Restart on the course page"
    since = int(time.time()) - 1
    r = console(c, "scriptevent", "course:check", lesson_id)
    if r.returncode != 0:
        return False, f"[course] FAIL {lesson_id}: could not reach the server console ({r.stderr.strip()[:120]})"
    deadline = time.time() + GAME_WAIT
    while time.time() < deadline:
        time.sleep(1)
        logs = docker("logs", "--since", str(since), c, timeout=10)
        for line in reversed((logs.stdout + logs.stderr).splitlines()):
            m = GRADER_LINE_RE.search(line)
            if m and m.group(2) == lesson_id:
                return m.group(1) == "PASS", line[line.index("[course]"):]
    return False, f"[course] FAIL {lesson_id}: the grader did not answer in {GAME_WAIT}s; if your server just restarted, wait and try again"


def restart_server(name, wait=True):
    """Warn players, restart the learner's server, wait for it to come up."""
    c = f"redstone-{name}-bds"
    if container_state(c) == "running":
        console(c, "say", "§eYour pack changed. Restarting, back in a few seconds.")
        time.sleep(2)
    since = int(time.time())
    r = docker("restart", c, timeout=90)
    if r.returncode != 0:
        return False, f"could not restart the server: {r.stderr.strip()[:200]}"
    if not wait:
        return True, "restarting"
    deadline = time.time() + RESTART_WAIT
    while time.time() < deadline:
        time.sleep(2)
        if container_state(c) != "running":
            continue
        logs = docker("logs", "--since", str(since), c, timeout=10)
        if "Server started" in logs.stdout + logs.stderr:
            return True, "started"
    return False, f"the server did not report 'Server started' within {RESTART_WAIT}s"


def provision(name):
    """Run provision.py for a learner in the background; output to their provision.log."""
    def work():
        with db() as conn:
            row = conn.execute("SELECT port, token FROM users WHERE name = ?", (name,)).fetchone()
        home = ROOT / "learners" / name
        home.mkdir(parents=True, exist_ok=True)
        with open(home / "provision.log", "w") as log:
            log.write(f"== provision {name} {time.strftime('%Y-%m-%dT%H:%M:%S%z')}\n")
            log.flush()
            r = subprocess.run([sys.executable, "/app/provision.py", name, str(row["port"]), row["token"]],
                               stdout=log, stderr=subprocess.STDOUT, env=dict(os.environ, ROOT=str(ROOT)))
            log.write(f"== exit {r.returncode}\n")
    with lock:
        t = provisioning.get(name)
        if t and t.is_alive():
            return
        t = threading.Thread(target=work, daemon=True)
        provisioning[name] = t
        t.start()


# --- learner state for the dashboard ----------------------------------------------

def read_json(path):
    try:
        return json.loads(path.read_text())
    except (OSError, ValueError):
        return None


def learner_view(row):
    home = ROOT / "learners" / row["name"]
    progress = read_json(home / "workspace" / ".course" / "progress.json") or {}
    deploy = read_json(home / "workspace" / ".course" / "deploy.json")
    lessons = sorted(p.stem for p in (ROOT / "app" / "course" / "lessons").glob("*.md"))
    current = progress.get("current") or (lessons[0] if lessons else "")
    entry = (progress.get("lessons") or {}).get(current, {})
    log = home / "provision.log"
    t = provisioning.get(row["name"])
    return {
        "name": row["name"],
        "port": row["port"],
        "editor": f"/u/{row['name']}/?folder=/workspace",
        "server": container_state(f"redstone-{row['name']}-bds"),
        "editor_state": container_state(f"redstone-{row['name']}-code"),
        "current": current,
        "step": (entry.get("passed_steps") or 0) + 1 if not entry.get("done") else entry.get("steps"),
        "steps": entry.get("steps"),
        "done": sum(1 for v in (progress.get("lessons") or {}).values() if v.get("done")),
        "total": len(lessons),
        "deploy": deploy,
        "provisioning": bool(t and t.is_alive()),
        "provision_log": log.read_text()[-3000:] if log.exists() else "",
    }


# --- html -----------------------------------------------------------------------------

STYLE = """
body{font:16px/1.5 system-ui,sans-serif;max-width:56rem;margin:2rem auto;padding:0 1rem;color:#222;background:#fafafa}
h1{font-size:1.5rem}h2{font-size:1.2rem;margin-top:2rem}
a.button,button{display:inline-block;padding:.4rem .9rem;border:1px solid #888;border-radius:6px;background:#fff;color:#222;text-decoration:none;font:inherit;cursor:pointer}
a.button.primary,button.primary{background:#2a6;border-color:#2a6;color:#fff}
.ok{color:#2a6}.bad{color:#c33}.muted{color:#777}
table{border-collapse:collapse;width:100%}td,th{text-align:left;padding:.4rem .6rem;border-bottom:1px solid #ddd}
pre{background:#eee;padding:.6rem;overflow-x:auto;font-size:.85rem}
input[type=text],input[type=password]{padding:.4rem;font:inherit;border:1px solid #aaa;border-radius:4px}
form.inline{display:inline}
.card{background:#fff;border:1px solid #ddd;border-radius:8px;padding:1rem 1.2rem;margin:1rem 0}
"""


def page(title, body, user=None):
    nav = ""
    if user:
        nav = (f'<p class="muted">Signed in as <b>{html.escape(user)}</b> · '
               f'<a href="/">home</a> · <a href="/admin">admin</a> · <a href="/logout">log out</a></p>')
    return f"""<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{html.escape(title)} · redstone</title><style>{STYLE}</style></head>
<body>{nav}<h1>{html.escape(title)}</h1>{body}</body></html>"""


def e(text):
    return html.escape(str(text if text is not None else ""))


def render_learner(v, is_admin=False, notice=""):
    d = v["deploy"]
    if d is None:
        deploy_line = '<span class="muted">no deploy yet; save a file in the editor</span>'
    elif d.get("status") == "ok":
        packs = ", ".join(d.get("behavior_packs", []) + d.get("resource_packs", [])) or "no packs"
        deploy_line = f'<span class="ok">deployed</span> {e(packs)} <span class="muted">({e(d.get("at", ""))}) {e(d.get("detail", ""))}</span>'
    else:
        deploy_line = f'<span class="bad">deploy failed:</span> {e(d.get("detail", ""))} <span class="muted">({e(d.get("at", ""))})</span>'
    server = v["server"]
    server_line = f'<span class="{"ok" if server == "running" else "bad"}">{e(server)}</span>'
    who = e(v["name"])
    step = f'step {v["step"]} of {v["steps"]}' if v["steps"] else "not started"
    body = f"""
<div class="card">
  <p><a class="button primary" href="{e(v['editor'])}" target="_blank">Open the editor</a>
     &nbsp; Lesson <b>{e(v['current'])}</b>, {step}. {v['done']} of {v['total']} lessons done.</p>
</div>
<div class="card">
  <p><b>Minecraft server:</b> {server_line} on port <b>{e(v['port'])}</b>.
     In Minecraft, Play → Servers → Add Server, address <b>{e(SITE.split('://')[-1])}</b>, port <b>{e(v['port'])}</b>.</p>
  <p><b>Last deploy:</b> {deploy_line}</p>
  <form class="inline" method="post" action="/restart"><input type="hidden" name="learner" value="{who}"><button>Restart my server</button></form>
  <form class="inline" method="post" action="/game-check"><input type="hidden" name="learner" value="{who}">
     <input type="hidden" name="lesson" value="{e(v['current'])}"><button>Run the in-game check for {e(v['current'])}</button></form>
  {f'<p><b>{e(notice)}</b></p>' if notice else ''}
</div>
"""
    if v["provisioning"] or (is_admin and v["provision_log"]):
        state = "Setting up… refresh in a minute." if v["provisioning"] else "Setup log"
        body += f'<div class="card"><p><b>{state}</b></p><pre>{e(v["provision_log"])}</pre></div>'
    return body


# --- the server ---------------------------------------------------------------------------

class Handler(BaseHTTPRequestHandler):
    server_version = "redstone/1.0"

    def log_message(self, fmt, *args):
        sys.stderr.write("%s %s\n" % (self.address_string(), fmt % args))

    # helpers
    def user(self):
        c = cookies.SimpleCookie(self.headers.get("Cookie", ""))
        if "session" not in c:
            return None
        return read_cookie(c["session"].value)

    def is_admin(self, name):
        with db() as conn:
            row = conn.execute("SELECT is_admin FROM users WHERE name = ?", (name,)).fetchone()
        return bool(row and row["is_admin"])

    def send_html(self, body, status=200, extra=None):
        data = body.encode()
        self.send_response(status)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        for k, v in (extra or {}).items():
            self.send_header(k, v)
        self.end_headers()
        self.wfile.write(data)

    def send_text(self, text, status=200):
        data = text.encode()
        self.send_response(status)
        self.send_header("Content-Type", "text/plain; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def redirect(self, location, extra=None):
        self.send_response(302)
        self.send_header("Location", location)
        for k, v in (extra or {}).items():
            self.send_header(k, v)
        self.send_header("Content-Length", "0")
        self.end_headers()

    def form(self):
        n = int(self.headers.get("Content-Length", "0"))
        data = self.rfile.read(n).decode() if n else ""
        return {k: v[0] for k, v in urllib.parse.parse_qs(data).items()}

    def cookie_header(self, value, max_age):
        secure = "; Secure" if SITE.startswith("https") else ""
        return {"Set-Cookie": f"session={value}; Path=/; HttpOnly; SameSite=Lax; Max-Age={max_age}{secure}"}

    # routes
    def do_GET(self):
        path = urllib.parse.urlparse(self.path).path
        query = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
        if path == "/auth/check":
            return self.auth_check()
        if path.startswith("/game-check/"):
            return self.api_game_check(path)
        if path == "/login":
            return self.send_html(page("Log in", LOGIN_FORM))
        if path == "/logout":
            return self.redirect("/login", self.cookie_header("", 0))
        if path == "/healthz":
            return self.send_text("ok")
        user = self.user()
        if not user:
            return self.redirect("/login")
        if path == "/":
            return self.dashboard(user, query)
        if path == "/admin":
            return self.admin(user)
        self.send_text("not found", 404)

    def do_POST(self):
        path = urllib.parse.urlparse(self.path).path
        if path == "/login":
            f = self.form()
            with db() as conn:
                ok = check_password(conn, f.get("name", "").strip().lower(), f.get("password", ""))
            if not ok:
                time.sleep(1)
                return self.send_html(page("Log in", '<p class="bad">Wrong name or password.</p>' + LOGIN_FORM), 401)
            return self.redirect("/", self.cookie_header(make_cookie(f["name"].strip().lower()), SESSION_SECONDS))
        if path.startswith("/api/restart/"):
            return self.api_restart(path)
        user = self.user()
        if not user:
            return self.redirect("/login")
        f = self.form()
        admin = self.is_admin(user)
        if path == "/restart":
            name = self.owned(user, admin, f.get("learner"))
            if not name:
                return self.send_text("forbidden", 403)
            threading.Thread(target=restart_server, args=(name, False), daemon=True).start()
            return self.redirect(f"/?learner={name}&notice=restarting" if admin else "/?notice=restarting")
        if path == "/game-check":
            name = self.owned(user, admin, f.get("learner"))
            if not name:
                return self.send_text("forbidden", 403)
            _, line = game_check(name, f.get("lesson", ""))
            q = urllib.parse.urlencode({"learner": name, "notice": line})
            return self.redirect(f"/?{q}")
        if path == "/admin/learners" and admin:
            return self.create_learner(f)
        if path == "/admin/password" and admin:
            return self.reset_password(f)
        if path == "/admin/reprovision" and admin:
            if f.get("name") and NAME_RE.match(f["name"]):
                provision(f["name"])
            return self.redirect("/admin")
        self.send_text("forbidden", 403)

    def owned(self, user, admin, requested):
        """The learner name a request may act on: their own, or any if admin."""
        if admin and requested and NAME_RE.match(requested):
            return requested
        if not admin and (not requested or requested == user):
            return user
        return None

    def auth_check(self):
        user = self.user()
        uri = self.headers.get("X-Forwarded-Uri", "")
        if not user:
            return self.redirect("/login")
        m = re.match(r"^/u/([a-z0-9]+)/", uri + "/")
        target = m.group(1) if m else ""
        if user == target or self.is_admin(user):
            self.send_response(200)
            self.send_header("X-Learner", user)
            self.send_header("Content-Length", "0")
            self.end_headers()
            return
        self.send_text("that editor belongs to someone else", 403)

    def token_owner(self, name):
        auth = self.headers.get("Authorization", "")
        token = auth[7:] if auth.startswith("Bearer ") else ""
        with db() as conn:
            row = conn.execute("SELECT token FROM users WHERE name = ?", (name,)).fetchone()
        return bool(row and token and hmac.compare_digest(row["token"] or "", token))

    def api_restart(self, path):
        parts = path.split("/")
        if len(parts) != 4 or not NAME_RE.match(parts[3]):
            return self.send_text("usage: /api/restart/<learner>", 400)
        name = parts[3]
        if not self.token_owner(name):
            return self.send_text("forbidden", 403)
        ok, detail = restart_server(name)
        self.send_text(detail + "\n", 200 if ok else 504)

    def api_game_check(self, path):
        parts = path.split("/")
        if len(parts) != 4:
            return self.send_text("usage: /game-check/<learner>/<lesson-id>", 400)
        _, _, name, lesson_id = parts
        if not NAME_RE.match(name) or not self.token_owner(name):
            return self.send_text("forbidden", 403)
        if not re.match(r"^[a-z0-9-]+$", lesson_id):
            return self.send_text("bad lesson id", 400)
        passed, line = game_check(name, lesson_id)
        self.send_text(line + "\n", 200 if passed else 409)

    def dashboard(self, user, query):
        admin = self.is_admin(user)
        notice = query.get("notice", [""])[0]
        with db() as conn:
            rows = learners(conn)
        if admin:
            name = query.get("learner", [""])[0]
            row = next((r for r in rows if r["name"] == name), None)
            if row is None:
                return self.redirect("/admin")
            v = learner_view(row)
            return self.send_html(page(f"{name}", render_learner(v, is_admin=True, notice=notice), user))
        row = next((r for r in rows if r["name"] == user), None)
        if row is None:
            return self.send_html(page("Hello", "<p>Your account is not set up yet.</p>", user))
        return self.send_html(page(f"Hi {user}", render_learner(learner_view(row), notice=notice), user))

    def admin(self, user):
        if not self.is_admin(user):
            return self.redirect("/")
        with db() as conn:
            rows = learners(conn)
        table = "".join(
            f'<tr><td><a href="/?learner={e(v["name"])}">{e(v["name"])}</a></td>'
            f'<td>{e(v["port"])}</td><td class="{"ok" if v["server"] == "running" else "bad"}">{e(v["server"])}</td>'
            f'<td class="{"ok" if v["editor_state"] == "running" else "bad"}">{e(v["editor_state"])}</td>'
            f'<td>{e(v["current"])} · {v["done"]}/{v["total"]} done</td>'
            f'<td>{"setting up…" if v["provisioning"] else ""}'
            f'<form class="inline" method="post" action="/admin/reprovision"><input type="hidden" name="name" value="{e(v["name"])}"><button>re-provision</button></form></td></tr>'
            for v in map(learner_view, rows)
        )
        body = f"""
<h2>Learners</h2>
<table><tr><th>name</th><th>port</th><th>server</th><th>editor</th><th>progress</th><th></th></tr>{table}</table>
<h2>Add a learner</h2>
<form method="post" action="/admin/learners">
  <label>name <input type="text" name="name" pattern="[a-z][a-z0-9]{{1,23}}" required></label>
  <label>password <input type="text" name="password" required></label>
  <button class="primary">Create</button>
</form>
<p class="muted">Lowercase letters and digits. Setup takes a minute or two the first time (it pulls the Bedrock server).</p>
<h2>Reset a password</h2>
<form method="post" action="/admin/password">
  <label>name <input type="text" name="name" required></label>
  <label>new password <input type="text" name="password" required></label>
  <button>Reset</button>
</form>
"""
        self.send_html(page("Admin", body, user))

    def create_learner(self, f):
        name = f.get("name", "").strip().lower()
        password = f.get("password", "")
        if not NAME_RE.match(name) or name == "admin" or len(password) < 4:
            return self.send_html(page("Admin", '<p class="bad">Bad name or password (min 4 characters).</p><p><a href="/admin">back</a></p>'), 400)
        with db() as conn:
            if conn.execute("SELECT 1 FROM users WHERE name = ?", (name,)).fetchone():
                return self.send_html(page("Admin", '<p class="bad">That name is taken.</p><p><a href="/admin">back</a></p>'), 400)
            used = {r["port"] for r in learners(conn)}
            port = FIRST_PORT
            while port in used:
                port += 10
            create_user(conn, name, password)
            conn.execute("UPDATE users SET token = ?, port = ? WHERE name = ?", (secrets.token_hex(24), port, name))
        provision(name)
        return self.redirect(f"/?learner={name}")

    def reset_password(self, f):
        name = f.get("name", "").strip().lower()
        password = f.get("password", "")
        with db() as conn:
            row = conn.execute("SELECT salt FROM users WHERE name = ?", (name,)).fetchone()
            if not row or len(password) < 4:
                return self.send_html(page("Admin", '<p class="bad">No such user, or password too short.</p><p><a href="/admin">back</a></p>'), 400)
            salt = secrets.token_hex(16)
            conn.execute("UPDATE users SET hash = ?, salt = ? WHERE name = ?", (hash_password(password, salt), salt, name))
        return self.redirect("/admin")


LOGIN_FORM = """
<form method="post" action="/login" class="card">
  <p><label>name<br><input type="text" name="name" autofocus autocapitalize="none" autocomplete="username"></label></p>
  <p><label>password<br><input type="password" name="password" autocomplete="current-password"></label></p>
  <p><button class="primary">Log in</button></p>
</form>
"""


def main():
    init_db()
    server = ThreadingHTTPServer(("0.0.0.0", 8000), Handler)
    print(f"redstone control on :8000, root {ROOT}, site {SITE}", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()
