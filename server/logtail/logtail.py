#!/usr/bin/env python3
"""Live web view of the Bedrock server console.

Streams the BDS container's stdout over SSE to a browser page, with script
errors pulled out into their own view. Standard library only -- nothing here
can rot from a dependency update.
"""

import base64
import http.server
import json
import os
import queue
import re
import socket
import socketserver
import threading
import time
from collections import deque
from urllib.parse import urlparse

DOCKER_SOCK = "/var/run/docker.sock"
TARGET = os.environ.get("TARGET_CONTAINER", "mc-bds")
SERVER_NAME = os.environ.get("SERVER_NAME", "Bedrock Server")
LOG_AUTH = os.environ.get("LOG_AUTH", "").strip()
STATE_FILE = "/state/deploy.json"
PORT = 8080

HISTORY = deque(maxlen=2000)
ERRORS = deque(maxlen=300)
SUBSCRIBERS: set[queue.Queue] = set()
LOCK = threading.Lock()

ERROR_RE = re.compile(
    r"(ScriptError|SyntaxError|TypeError|ReferenceError|RangeError"
    r"|Exception|Unhandled|failed to load|\berror\b)",
    re.IGNORECASE,
)
STACK_RE = re.compile(r"^\s+at\s")


def classify(text: str) -> str:
    if STACK_RE.match(text):
        return "stack"
    if ERROR_RE.search(text):
        return "error"
    if "warn" in text.lower() or "WARN" in text:
        return "warn"
    if "Player connected" in text or "Player disconnected" in text:
        return "player"
    return "info"


def publish(text: str) -> None:
    line = {"t": time.time(), "text": text, "level": classify(text)}
    with LOCK:
        HISTORY.append(line)
        if line["level"] in ("error", "stack"):
            ERRORS.append(line)
        dead = []
        for q in SUBSCRIBERS:
            try:
                q.put_nowait(line)
            except queue.Full:
                dead.append(q)
        for q in dead:
            SUBSCRIBERS.discard(q)


# --------------------------------------------------------------------------
# Docker engine API over the unix socket. Only ever issues GETs.
# --------------------------------------------------------------------------


class ByteStream:
    """Response body reader that transparently de-chunks.

    The Docker API answers some endpoints with Transfer-Encoding: chunked
    depending on daemon version. Reading that raw would splice chunk-size
    headers into the log text and, worse, shred the 8-byte multiplexing frames
    so every line after the first would be garbage.
    """

    def __init__(self, f, chunked: bool):
        self.f = f
        self.chunked = chunked
        self.buf = b""
        self.eof = False

    def _fill(self) -> None:
        if self.chunked:
            line = self.f.readline()
            if not line:
                self.eof = True
                return
            try:
                size = int(line.strip().split(b";")[0] or b"0", 16)
            except ValueError:
                self.eof = True
                return
            if size == 0:
                self.eof = True
                return
            self.buf += self.f.read(size)
            self.f.read(2)  # trailing CRLF
        else:
            # read1 so we return as soon as anything arrives rather than
            # blocking for a full buffer -- this is a live tail.
            chunk = self.f.read1(65536) if hasattr(self.f, "read1") else self.f.read(65536)
            if not chunk:
                self.eof = True
                return
            self.buf += chunk

    def read_exact(self, n: int) -> bytes:
        while len(self.buf) < n and not self.eof:
            self._fill()
        out, self.buf = self.buf[:n], self.buf[n:]
        return out

    def read_some(self) -> bytes:
        while not self.buf and not self.eof:
            self._fill()
        out, self.buf = self.buf, b""
        return out


def docker_get(path: str, stream: bool = False):
    sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
    sock.connect(DOCKER_SOCK)
    sock.sendall(
        f"GET {path} HTTP/1.1\r\nHost: docker\r\nConnection: close\r\n\r\n".encode()
    )
    f = sock.makefile("rb")
    status = f.readline().decode(errors="replace").split(" ")
    headers = {}
    while True:
        raw = f.readline()
        if raw in (b"\r\n", b"\n", b""):
            break
        k, _, v = raw.decode(errors="replace").partition(":")
        headers[k.strip().lower()] = v.strip()
    if len(status) < 2 or not status[1].startswith("2"):
        f.close()
        sock.close()
        raise RuntimeError(f"docker API {path} -> {' '.join(status).strip()}")

    body = ByteStream(f, headers.get("transfer-encoding", "").lower() == "chunked")
    if stream:
        return sock, f, body

    raw_body = b""
    while True:
        part = body.read_some()
        if not part:
            break
        raw_body += part
    f.close()
    sock.close()
    return json.loads(raw_body.decode(errors="replace"))


def container_uses_tty() -> bool:
    info = docker_get(f"/containers/{TARGET}/json")
    return bool(info.get("Config", {}).get("Tty"))


def read_frames(stream: ByteStream, tty: bool):
    """Yield decoded text chunks from the docker log stream."""
    if tty:
        while True:
            chunk = stream.read_some()
            if not chunk:
                return
            yield chunk.decode("utf-8", errors="replace")
    else:
        # Multiplexed: 8-byte header [stream, 0, 0, 0, big-endian length]
        while True:
            header = stream.read_exact(8)
            if len(header) < 8:
                return
            size = int.from_bytes(header[4:8], "big")
            payload = stream.read_exact(size)
            if not payload:
                return
            yield payload.decode("utf-8", errors="replace")


def tail_loop() -> None:
    buffer = ""
    while True:
        try:
            tty = container_uses_tty()
            path = (
                f"/containers/{TARGET}/logs"
                f"?stdout=1&stderr=1&follow=1&tail=300&timestamps=0"
            )
            sock, f, body = docker_get(path, stream=True)
            publish(f"--- attached to {TARGET} ---")
            try:
                for chunk in read_frames(body, tty):
                    buffer += chunk
                    while "\n" in buffer:
                        line, buffer = buffer.split("\n", 1)
                        line = line.rstrip("\r")
                        if line:
                            publish(line)
            finally:
                f.close()
                sock.close()
            publish(f"--- {TARGET} stream ended (restarting?) ---")
        except Exception as exc:  # container down, socket gone, mid-restart
            publish(f"--- log reader: {exc} ---")
        time.sleep(2)


def deploy_state() -> dict:
    try:
        with open(STATE_FILE) as f:
            return json.load(f)
    except (OSError, json.JSONDecodeError):
        return {"status": "unknown"}


# --------------------------------------------------------------------------
# HTTP
# --------------------------------------------------------------------------

PAGE = r"""<!doctype html>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>__NAME__ console</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body { margin:0; background:#0d1117; color:#c9d1d9;
         font:13px/1.55 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace; }
  header { position:sticky; top:0; z-index:2; background:#161b22;
           border-bottom:1px solid #30363d; padding:8px 12px;
           display:flex; gap:10px; align-items:center; flex-wrap:wrap; }
  h1 { font-size:13px; margin:0 8px 0 0; font-weight:600; color:#e6edf3; }
  .pill { padding:2px 8px; border-radius:999px; font-size:11px; font-weight:600; }
  .ok { background:#12331d; color:#3fb950; }
  .failed { background:#3d1418; color:#f85149; }
  .unknown { background:#30363d; color:#8b949e; }
  input[type=search] { flex:1; min-width:140px; background:#0d1117; color:#c9d1d9;
      border:1px solid #30363d; border-radius:6px; padding:4px 8px; font:inherit; }
  label { font-size:11px; color:#8b949e; display:flex; align-items:center; gap:4px; }
  #log { padding:8px 12px; white-space:pre-wrap; word-break:break-word; }
  .line { display:block; }
  .line.error { color:#ff7b72; }
  .line.stack { color:#ffa198; padding-left:2ch; }
  .line.warn  { color:#e3b341; }
  .line.player{ color:#79c0ff; }
  .line.info  { color:#c9d1d9; }
  .hidden { display:none; }
  .meta { color:#6e7681; font-size:11px; }
</style>
<header>
  <h1>__NAME__</h1>
  <span id="status" class="pill unknown">…</span>
  <span class="meta" id="meta"></span>
  <input type="search" id="filter" placeholder="filter…" autocomplete="off">
  <label><input type="checkbox" id="errorsOnly"> errors only</label>
  <label><input type="checkbox" id="follow" checked> follow</label>
</header>
<div id="log"></div>
<script>
const log = document.getElementById('log');
const filterBox = document.getElementById('filter');
const errorsOnly = document.getElementById('errorsOnly');
const follow = document.getElementById('follow');

function visible(el) {
  const q = filterBox.value.toLowerCase();
  const isErr = el.classList.contains('error') || el.classList.contains('stack');
  if (errorsOnly.checked && !isErr) return false;
  if (q && !el.textContent.toLowerCase().includes(q)) return false;
  return true;
}
function reflow() {
  for (const el of log.children) el.classList.toggle('hidden', !visible(el));
}
filterBox.addEventListener('input', reflow);
errorsOnly.addEventListener('change', reflow);

function add(line) {
  const el = document.createElement('span');
  el.className = 'line ' + line.level;
  el.textContent = line.text;
  if (!visible(el)) el.classList.add('hidden');
  log.appendChild(el);
  while (log.children.length > 3000) log.removeChild(log.firstChild);
  if (follow.checked) window.scrollTo(0, document.body.scrollHeight);
}

const es = new EventSource('/stream');
es.onmessage = (e) => add(JSON.parse(e.data));
es.onerror = () => {
  const el = document.createElement('span');
  el.className = 'line warn';
  el.textContent = '--- log connection lost, retrying ---';
  log.appendChild(el);
};

async function poll() {
  try {
    const s = await (await fetch('/status')).json();
    const pill = document.getElementById('status');
    pill.className = 'pill ' + (s.status || 'unknown');
    pill.textContent = s.status === 'ok' ? 'deployed' : (s.status || 'unknown');
    const ago = s.at_epoch ? Math.round(Date.now()/1000 - s.at_epoch) : null;
    document.getElementById('meta').textContent = s.at_epoch
      ? `${s.revision} · ${s.duration_seconds}s · ${ago < 90 ? ago + 's' : Math.round(ago/60) + 'm'} ago`
        + (s.detail ? ` · ${s.detail}` : '')
      : '';
  } catch (_) {}
}
poll(); setInterval(poll, 5000);
</script>
"""


class Handler(http.server.BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, *args):  # keep our own stdout clean
        pass

    def _authed(self) -> bool:
        if not LOG_AUTH:
            return True
        expected = "Basic " + base64.b64encode(LOG_AUTH.encode()).decode()
        if self.headers.get("Authorization") == expected:
            return True
        self.send_response(401)
        self.send_header("WWW-Authenticate", 'Basic realm="minecraft"')
        self.send_header("Content-Length", "0")
        self.end_headers()
        return False

    def _send(self, body: bytes, ctype: str) -> None:
        self.send_response(200)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if not self._authed():
            return
        path = urlparse(self.path).path

        if path == "/":
            self._send(PAGE.replace("__NAME__", SERVER_NAME).encode(), "text/html; charset=utf-8")
        elif path == "/status":
            self._send(json.dumps(deploy_state()).encode(), "application/json")
        elif path == "/errors":
            with LOCK:
                body = json.dumps(list(ERRORS), indent=2).encode()
            self._send(body, "application/json")
        elif path == "/stream":
            self.stream()
        else:
            self.send_response(404)
            self.send_header("Content-Length", "0")
            self.end_headers()

    def stream(self):
        q: queue.Queue = queue.Queue(maxsize=1000)
        with LOCK:
            backlog = list(HISTORY)
            SUBSCRIBERS.add(q)
        self.send_response(200)
        self.send_header("Content-Type", "text/event-stream")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Connection", "close")
        self.end_headers()
        try:
            for line in backlog:
                self.wfile.write(f"data: {json.dumps(line)}\n\n".encode())
            self.wfile.flush()
            while True:
                try:
                    line = q.get(timeout=20)
                    self.wfile.write(f"data: {json.dumps(line)}\n\n".encode())
                except queue.Empty:
                    self.wfile.write(b": keepalive\n\n")
                self.wfile.flush()
        except (BrokenPipeError, ConnectionResetError, OSError):
            pass
        finally:
            with LOCK:
                SUBSCRIBERS.discard(q)


class Server(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True


if __name__ == "__main__":
    threading.Thread(target=tail_loop, daemon=True).start()
    print(f"log viewer on :{PORT} watching {TARGET}"
          f"{' (auth on)' if LOG_AUTH else ' (public)'}", flush=True)
    Server(("0.0.0.0", PORT), Handler).serve_forever()
