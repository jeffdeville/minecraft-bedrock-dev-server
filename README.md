# Minecraft Bedrock dev server

A Bedrock Dedicated Server on a cheap x86 cloud box, set up so that saving a
file puts the change in the running world about fifteen seconds later, with the
server console readable in a browser.

This is a **starter scaffold** for a Script-API-first add-on: TypeScript against
`@minecraft/server`, bundled with esbuild. If you want the loop without writing
the plumbing, clone it and go.

> **A live system was built from this.** The Doomsday Sock Bomb project
> (`jeffdeville/minecraft-bedrock-dev-server` → adapted into the sock bomb repo)
> runs the same server design against a Minecraft Creator Tools project instead
> of this esbuild one, and deploys to a Vultr box. The two have diverged: that
> one ships assembled pack directories from `behavior_packs/` and builds on the
> laptop; this one uses `packs/` and can build on the server. Fixes flow both
> ways by hand.

For day-to-day use, read [QUICKSTART.md](QUICKSTART.md) — that's the page for
whoever writes the code. This page is setup and operations.

---

## Operating it

Once set up, this is the whole job:

| Command | What it does |
|---|---|
| `bin/mc dev` | Watch files, deploy on every save. **The main one.** |
| `bin/mc sync` | Deploy once, right now |
| `bin/mc logs` | Open the web console (`-t` to tail in the terminal) |
| `bin/mc console "time set day"` | Run any Minecraft command |
| `bin/mc backup` | Pull the world down to `backups/` |
| `bin/mc status` | Did the last deploy work? |
| `bin/mc ssh` | Shell on the server |

Two ways to deploy, both landing in the same `bin/deploy.sh` on the server, so
there's one path from source to running world:

```
  Laptop / Chromebook                        Server
  ───────────────────                        ──────
  edit src/starter/main.ts
        │ save
        ▼
  mc dev  ──── rsync ────────────────────▶  /opt/mc/app
        │                                        │
  git push prod main ──── post-receive ────▶     │
                                                 ▼
                                              build (node container)
                                                 │  esbuild TS → scripts/main.js
                                                 ▼
                                              install packs → data/behavior_packs/
                                                 │
                                                 ▼
                                              write world_behavior_packs.json
                                                 │
                                                 ▼
                                              restart BDS  ──▶ 19132/udp
                                                 │
                                                 └──▶ console ──▶ :8080 log page
```

**Two git remotes doing different jobs:** `origin` is GitHub, for history.
`prod` is the bare repo on the server — pushing to it deploys. `mc push` sends
to `prod`.

### When things go wrong

Open the log page first (`bin/mc logs`). It highlights script errors and stack
traces and has an **errors only** filter. Almost every failure announces itself
there.

| Symptom | Cause |
|---|---|
| Deploy says OK, nothing changed in game | The world must *list* the pack. Check `data/worlds/<level>/world_behavior_packs.json` |
| Script didn't load | Usually a duplicate UUID, or a `dependencies` version this BDS doesn't offer |
| Can't connect | Bedrock is **UDP**. Confirm 19132/**udp** is open, including any cloud firewall |
| Client updated, now refuses to connect | Retail clients won't talk to an older-protocol server. `mc console stop` — it restarts on the newer BDS |
| Deploy hangs on first run | It's pulling the BDS image and generating a world. Watch the log page |

---

## What "plugin" means here

Bedrock has no Bukkit/Spigot-style plugin API and never has. What it has is
**behavior packs** containing JavaScript that runs against the
[`@minecraft/server` Script API](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/minecraft-server).
That's what this builds and deploys — Microsoft's supported path, tracking the
retail client.

| Thing | Version | Why |
|---|---|---|
| `@minecraft/server` | 2.9.0 | Current stable track. No experimental toggles needed |
| `@minecraft/server-ui` | 2.1.0 | Forms and dialogs, also stable |
| `itzg/minecraft-bedrock-server` | 2026.8.1 | Pinned so an upstream change can't break a session |
| BDS itself | `LATEST` | Must track the retail client, which auto-updates |

Beta-track APIs (a `-beta` suffix) additionally require the "Beta APIs"
experiment on the world. This uses only stable APIs, so there's nothing to
toggle. Check what's current with `npm view @minecraft/server dist-tags`.

---

## One-time setup

### 1. The box

Any **x86-64** Ubuntu machine, 2 GB RAM is plenty. 26.04 LTS is supported to
April 2031 and works fine — Docker publishes packages for it, and everything
that matters runs in containers anyway.

Near the US East Coast, roughly what you'll pay for 2 GB:

| Provider | Nearest DC | Price |
|---|---|---|
| **Vultr** | Piscataway NJ | **~$10/mo** |
| DigitalOcean | NYC | ~$12/mo |
| Hetzner | Ashburn VA | ~$23/mo |

Hetzner is the cheap option *in Europe*; after the June 2026 US price rise it is
the most expensive of these. Its cheap CX line is Europe-only.

> **It must be x86.** Mojang ships BDS as an x86-64 binary only. ARM boxes
> (Hetzner's CAX line, Ampere instances, an Apple Silicon Mac) can't run it
> without emulation.

Generate an SSH key if you don't have one, and give the provider the public half
at create time — it saves dealing with an emailed root password:

```bash
ssh-keygen -t ed25519
```

### 2. Bootstrap the server

```bash
ssh root@<server-ip> 'bash -s' < bin/bootstrap-server.sh
```

Installs Docker, creates the `mcdev` deploy user, lays out `/opt/mc`, creates
the bare git repo with its post-receive hook, and opens the firewall.
Idempotent — safe to re-run.

### 3. Set up the client machine

On ChromeOS this needs **Linux (Crostini)** enabled: Settings → Advanced →
Developers → Linux development environment. Then:

```bash
bin/setup-chromebook.sh <server-ip>
```

Installs rsync/git/node, generates an SSH key, configures a connection-reusing
SSH alias, writes `.mcrc`, and adds the `prod` git remote. It prints a public
key — put it on the server:

```bash
ssh root@<server-ip> "cat >> /home/mcdev/.ssh/authorized_keys" <<< "<the key>"
```

The file watcher is a portable poll (`cksum`), so `bin/mc dev` works on macOS
too, with no `inotify-tools` or `fswatch` to install. Only the apt commands in
`setup-chromebook.sh` are Debian-specific.

### 4. First deploy

```bash
bin/mc sync
```

First run pulls the BDS image and generates the world — give it a couple of
minutes. After that, deploys are seconds.

```bash
echo 'export PATH="'$PWD'/bin:$PATH"' >> ~/.bashrc && source ~/.bashrc
```

---

## Connecting

Address `<server-ip>`, port `19132`. In Minecraft: Play → Servers → Add Server.
That works on mobile/tablet and Windows; consoles can't add servers directly.

A DNS name works but **can't carry the port** — Bedrock ignores SRV records — so
players still type `19132`. If you put the name behind Cloudflare, the record
must be **DNS-only (grey cloud)**: their proxy is HTTP-only and Bedrock is UDP,
so proxying breaks it in a way that looks like a firewall problem.

---

## Adding another pack

Two matching directories, same name:

```bash
mkdir -p src/mything packs/behavior/mything
```

1. `src/mything/main.ts` — your code
2. `packs/behavior/mything/manifest.json` — copy the starter's and replace
   **both** UUIDs with fresh ones:

   ```bash
   python3 -c "import uuid;print(uuid.uuid4());print(uuid.uuid4())"
   ```

Reusing a UUID is the most common Bedrock packaging mistake — two packs share
one and neither loads. The build finds the new directory automatically, and
`deploy.sh` regenerates `world_behavior_packs.json` so the world activates it.

Resource packs go in `packs/resource/<name>/`, same rules.

**Only packs under `packs/` get listed in the world.** BDS unpacks about 140
stock packs (vanilla, chemistry, editor) into the same server directories on
first boot; listing those would tell the world to load vanilla content twice.
Mojang's `chemistry` manifests also use `//` comments, which isn't legal JSON —
the manifest reader tolerates that.

---

## Logs

`http://<server-ip>:8080` — the live console over SSE, script errors and stack
traces highlighted, with an **errors only** filter. The header shows the last
deploy's status, revision, and duration.

- `/errors` — recent error lines as JSON
- `/status` — last deploy result as JSON

**The page is public by default.** Anyone with the URL can read the console,
including player gamertags and any file paths in stack traces. To require a
password, set one line in the server's `/opt/mc/app/.env`:

```
LOG_AUTH=user:somepassword
```

then `mc sync`. Nothing else changes.

---

## restart vs reload

`RELOAD_MODE` in `.env`:

- **`restart`** (default) — stops and starts BDS. ~15 s, disconnects players,
  always correct.
- **`reload`** — sends `/reload` to the running server. ~2 s, players stay
  connected. Faster, but the Script API leaks event subscriptions across
  reloads, so after a dozen reloads handlers fire multiple times per event.

Reasonable practice: `reload` while iterating hard, and a real restart
(`mc console stop`) the moment something looks wrong, before you go debugging a
bug that isn't there.

---

## Locking down who can join

`ONLINE_MODE=true` (the default) already requires a real Xbox Live sign-in. To
restrict further, set `ALLOW_LIST=true` in `.env` and add people:

```bash
mc console "allowlist add SomeGamertag"
mc console "allowlist reload"
```

Worth doing before sharing the IP.

**A note on the firewall:** Docker publishes ports straight to the kernel, past
ufw's INPUT chain. The ufw rules `bootstrap-server.sh` adds document intent and
cover non-Docker services, but they do **not** restrict the game or log ports.
For real restriction use your provider's cloud firewall, which sits upstream —
it must allow 22/tcp, 19132/**udp**, and 8080/tcp.

---

## Backups

```bash
mc backup     # -> backups/world-YYYYmmdd-HHMMSS.tar.gz
```

Uses BDS's `save hold` / `save resume`, so it's a consistent snapshot rather
than a tar of a live world. Nothing is automatic — if the world starts to
matter, put it on a cron job.

---

## Updating Minecraft

`VERSION=LATEST` means BDS re-checks on every container start, so a restart
usually picks up a new release on its own.

When a Minecraft update changes the Script API surface, bump
`@minecraft/server` in `package.json` **and** the matching `dependencies`
version in every `manifest.json`, then `mc sync`. The image tag
(`BEDROCK_IMAGE_TAG`) is pinned deliberately — bump it when you choose to, not
mid-session.

---

## Layout

```
bin/mc                    the CLI (runs on your machine)
bin/deploy.sh             the deploy path (runs on the server)
bin/bootstrap-server.sh   one-time server setup
bin/setup-chromebook.sh   one-time client setup
src/<pack>/main.ts        your TypeScript
packs/behavior/<pack>/    manifest + build output
server/logtail/           the web log viewer (stdlib Python, no dependencies)
server/post-receive       reference copy of the git hook
docker-compose.yml        BDS + log viewer
.env.example              all the knobs
```

On the server:

```
/opt/mc/repo.git          bare repo, push target
/opt/mc/app               working tree (rsync and git checkout both land here)
/opt/mc/app/data          BDS volume: worlds, packs, server.properties
/opt/mc/app/state         deploy.json, read by the log page
```
