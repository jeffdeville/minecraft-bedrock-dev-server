# Minecraft Bedrock dev server

A Bedrock Dedicated Server on a cheap x86 cloud box (Vultr, in our case), set
up so that when your add-on project writes a finished pack into a folder, the
change is live in the running world about fifteen seconds later, with the
server console readable in a browser.

Everything a dev machine needs to reach the server -- host, user, SSH key --
comes out of **one 1Password item**, so a MacBook and a Chromebook (Linux /
Crostini) are each set up with one command and nothing is generated or copied
by hand.

This repo is the **server and the sync loop only**. The add-on itself lives in
whatever project you author it with (Minecraft Creator Tools, Regolith, an
esbuild setup, hand-written JSON); the only contract is that its output lands
in `MC_ADDON_DIR`. Bedrock has no Bukkit-style plugin API: an "add-on" is a
behavior pack and/or resource pack, and behavior-pack scripts run against the
[`@minecraft/server` Script API](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/minecraft-server).

For day-to-day use read [QUICKSTART.md](QUICKSTART.md). This page is setup and
operations.

---

## The loop

```
  MacBook / Chromebook                             Server (/opt/mc/app)
  ────────────────────                             ────────────────────
  your add-on project
        │ writes hello.mcaddon (or a pack dir)
        ▼
  $MC_ADDON_DIR  ◀── fswatch / inotify / poll ── mc dev
        │
        │ rsync (key from 1Password)
        ▼
                                        addons/            ← exact mirror
                                            │  bin/deploy.sh
                                            ▼
                                        install-packs.py   unzip, classify, copy
                                            │              into data/{behavior,resource}_packs
                                            ▼
                                        world_behavior_packs.json  (activate on the world)
                                            │
                                            ▼
                                        restart BDS ──▶ 19132/udp
                                            │
                                            └──▶ console ──▶ :8080 log page
```

There is exactly one way a change reaches the world: `bin/deploy.sh` on the
server, run over ssh by `mc sync` / `mc dev` after two rsyncs (this repo's
tooling, then the add-ons). Deleting a pack from `MC_ADDON_DIR` removes it from
the server and the world on the next deploy.

## Operating it

| Command | What it does |
|---|---|
| `mc dev` | Watch `MC_ADDON_DIR`, deploy whenever a pack lands. **The main one.** |
| `mc sync` | Deploy once, right now |
| `mc logs` | Open the web console (`-t` tails it in the terminal) |
| `mc console "time set day"` | Run any Minecraft command |
| `mc backup` | Pull the world down to `backups/` |
| `mc update` | Upgrade BDS to Mojang's current release (`--check` only reports) |
| `mc status` | Did the last deploy work? |
| `mc ssh` | Shell on the server |
| `mc doctor` | Check 1Password, the key, the watcher, and ssh from this machine |
| `mc bootstrap` | One-time server setup over root ssh |

`mc dev` uses `fswatch` on macOS and `inotifywait` on Linux, coalesces a burst
of writes (a build tool emitting several files) into one deploy, and skips
events that changed nothing. If neither watcher is installed, or the folder
is on a filesystem that doesn't deliver events (a ChromeOS shared folder
mounted into Crostini), it polls -- set `MC_WATCH=poll` to force that.

### When things go wrong

Open the log page first (`mc logs`). It highlights script errors and stack
traces and has an **errors only** filter. The header shows the last deploy's
status and a short hash of the add-on tree, so you can tell whether what
you're looking at is the save you just made.

| Symptom | Cause |
|---|---|
| Deploy says OK, nothing changed in game | Check the deploy output: `world_behavior_packs.json: N pack(s) [...]`. If your pack isn't listed, its `manifest.json` wasn't found or was classified as a resource pack |
| `UUID ... is used by both` | Two packs (or a pack and a module) share a UUID. Generate fresh ones; this is the most common Bedrock packaging mistake |
| `not a valid zip (still being written?)` | The watcher fired mid-write. The next save redeploys; raise `MC_SETTLE` (seconds of quiet before deploying, default 1) if it keeps happening |
| Script didn't load | The `dependencies` version in your manifest isn't one this BDS offers. Check `npm view @minecraft/server dist-tags` |
| Can't connect | Bedrock is **UDP**. Confirm 19132/**udp** is open, including the cloud firewall |
| Client updated, now refuses to connect | Retail clients won't talk to an older-protocol server. `mc console stop` -- it restarts on the newer BDS |
| `mc` says no `.envrc` | Run `bin/setup-client.sh`, or `op inject -i .envrc.template -o .envrc` |
| Deploy hangs on first run | It's pulling the BDS image and generating a world. Watch the log page |

---

## One-time setup

### 1. Put the server in 1Password

One "SSH Key" item holds the key pair plus two text fields. The names below
are what `.envrc.template` references; change either to taste.

```bash
op item create --category "SSH Key" --vault ArdenShared --title minecraft-vps --ssh-generate-key ed25519
op item edit minecraft-vps --vault ArdenShared 'host[text]=203.0.113.7' 'username[text]=mcdev'
op read "op://ArdenShared/minecraft-vps/public key"
```

The last line prints the public key; give it to the cloud provider when you
create the box so it becomes root's login key. Fill in `host` once you have
the IP. Nothing else is ever created locally: every dev machine reads the same
item.

### 2. The box

Any **x86-64** Ubuntu machine, 2 GB RAM is plenty. On Vultr, pick the SSH key
you just added at create time. Roughly, near the US East Coast:

| Provider | Nearest DC | Price |
|---|---|---|
| **Vultr** | Piscataway NJ | **~$10/mo** |
| DigitalOcean | NYC | ~$12/mo |
| Hetzner | Ashburn VA | ~$23/mo |

> **It must be x86.** Mojang ships BDS as an x86-64 binary only. ARM boxes
> (Hetzner CAX, Ampere, an Apple Silicon Mac) can't run it without emulation.

### 3. Set up this machine

```bash
bin/setup-client.sh
```

Installs rsync, direnv, a file watcher and the 1Password CLI (Homebrew on
macOS, apt on Debian/Ubuntu/Crostini), renders `.envrc` from
`.envrc.template` with `op inject`, and runs `direnv allow`. Re-run it any
time the 1Password item changes (rotated key, new IP).

On a **Chromebook**, first enable Linux: Settings → About ChromeOS →
Developers → Linux development environment. There is no 1Password desktop
app inside Crostini, so `op` signs in with the account directly:

```bash
op account add --address my.1password.com --email you@example.com
eval "$(op signin)"
bin/setup-client.sh
```

On a Mac with the 1Password app installed, `op` authenticates through it
(enable *Integrate with 1Password CLI* in the app's Developer settings).

`.envrc` is gitignored and holds the resolved values, including the private
key. `mc` writes the key to a `0600` file under `~/.ssh/mc/` because ssh and
rsync need a path; it is rewritten whenever the value changes. If you'd rather
use the 1Password SSH agent or your own keys, leave `MC_SSH_PRIVATE_KEY` empty
and `mc` uses ssh's defaults.

### 4. Bootstrap the server

```bash
mc bootstrap
```

Connects as root with the 1Password key, installs Docker, creates the `mcdev`
deploy user with the same public key, lays out `/opt/mc`, and opens the
firewall. Idempotent.

### 5. First deploy

```bash
cp -r examples/hello-pack "$MC_ADDON_DIR/"
mc sync
```

The first run pulls the BDS image and generates the world; give it a couple of
minutes. Join the server and you'll get a green "hello-pack is live" message.
After that, `mc dev` and leave it running.

```bash
echo 'export PATH="'$PWD'/bin:$PATH"' >> ~/.zshrc   # or ~/.bashrc
```

---

## What goes in `MC_ADDON_DIR`

Whatever your add-on project emits, in any mix, nested however it likes:

```
$MC_ADDON_DIR/
  hello-pack/manifest.json            an assembled pack directory
  dist/behavior_packs/thing/          ...nested is fine
  thing.mcpack                        a zipped single pack
  thing.mcaddon                       a zip of several packs (dirs or .mcpack inside)
```

`bin/install-packs.py` on the server finds every `manifest.json`, unzipping as
needed, classifies each pack by its module types (`resources` → resource pack,
anything else → behavior pack), copies it into the BDS data volume, and writes
the world's `world_behavior_packs.json` / `world_resource_packs.json` listing
**only those packs**. That last step is the one everybody forgets: a pack in
`behavior_packs/` does nothing until the world lists it.

Only packs this tool installed are ever removed or listed. BDS unpacks ~140
stock packs (vanilla, chemistry, editor) into the same directories on first
boot; listing those would load vanilla content twice. Mojang's own manifests
use `//` comments, which the reader tolerates.

Rules for your packs:

- **Every UUID unique** -- the header's and each module's, across all packs.
  The installer refuses to deploy a duplicate. `python3 -c "import uuid;print(uuid.uuid4())"`.
- **`dependencies` versions must exist on the running BDS.** Currently
  `@minecraft/server` 2.9.0 and `@minecraft/server-ui` 2.1.0 (stable track,
  no experiments needed). A mismatch shows up as "script didn't load".
- **Use `console.warn`, not `console.log`** in scripts. BDS drops `log`
  unless content logging is on.
- Dotfiles in `MC_ADDON_DIR` are not synced.

---

## Connecting

Address `<server-ip>`, port `19132`. In Minecraft: Play → Servers → Add Server.
Works on mobile/tablet and Windows; consoles can't add servers directly.

A DNS name works but **can't carry the port** -- Bedrock ignores SRV records --
so players still type `19132`. Behind Cloudflare the record must be **DNS-only
(grey cloud)**: their proxy is HTTP-only and Bedrock is UDP.

---

## Logs

`http://<server-ip>:8080` -- the live console over SSE, script errors and stack
traces highlighted, with an **errors only** filter.

- `/errors` -- recent error lines as JSON
- `/status` -- last deploy result as JSON

**The page is public by default.** To require a password, set
`LOG_AUTH=user:somepassword` in the server's `/opt/mc/app/.env` and
`mc sync`. Put the same value on the 1Password item as a `log-auth` field and
add `export MC_LOG_AUTH="op://ArdenShared/minecraft-vps/log-auth"` to
`.envrc.template` so `mc status` can still read it.

---

## restart vs reload

`RELOAD_MODE` in the server's `.env`:

- **`restart`** (default) -- stops and starts BDS. ~15 s, disconnects players,
  always correct.
- **`reload`** -- sends `/reload`. ~2 s, players stay connected, but the Script
  API leaks event subscriptions across reloads, so after a dozen of them
  handlers fire multiple times per event.

Reasonable practice: `reload` while iterating hard, and `mc console stop` (a
real restart) the moment something looks wrong.

---

## Locking down who can join

`ONLINE_MODE=true` (the default) already requires a real Xbox Live sign-in. To
restrict further, set `ALLOW_LIST=true` in `.env` and add people:

```bash
mc console "allowlist add SomeGamertag"
mc console "allowlist reload"
```

Docker publishes ports straight to the kernel, past ufw. For real restriction
use the provider's cloud firewall: allow 22/tcp, 19132/**udp**, 8080/tcp.

---

## Backups

```bash
mc backup     # -> backups/world-YYYYmmdd-HHMMSS.tar.gz
```

Uses BDS's `save hold` / `save resume`, so it's a consistent snapshot. Nothing
is automatic -- if the world starts to matter, put it on a cron job.

---

## Updating Minecraft

Bedrock clients and servers must match protocol. Phones, tablets and consoles
auto-update within a day of a release and then refuse an older server with
"Outdated server", so the server has to follow releases promptly. What it must
never do is follow them *by accident*.

- **The version is pinned.** `deploy.sh` writes the running BDS version into
  the server's `.env` (`VERSION=1.26.45.1`), so a deploy's restart never
  changes the game version. `VERSION=LATEST` in `.env.example` only means
  "pin whatever is current on the first deploy of a fresh box".
- **Upgrades are a deliberate step.** `bin/update-bds.sh` on the server asks
  Mojang's download API for the current release and, if it is newer: takes a
  consistent world backup into `/opt/mc/app/backups/` (keeping
  `BACKUP_KEEP`), warns players in chat, pins the new version, recreates the
  container, and waits for `Server started` on that version. If that fails it
  re-pins the old version and restores the backup. Result in
  `state/update.json` and `state/update.log`.
- **Nightly by default.** `deploy.sh` installs a cron entry
  (`UPDATE_CRON`, default 08:00 UTC = 04:00 US Eastern) in the deploy user's
  crontab on every deploy, so any box you bootstrap gets it. `AUTO_UPDATE=false`
  removes it. Run it by hand any time with `mc update`, or just look with
  `mc update --check`.
- **Worlds and settings survive.** Worlds, `allowlist.json` and
  `permissions.json` live in `data/`; `server.properties` is regenerated from
  `.env` on every start; packs that pin `@minecraft/server` 2.9.0 keep working
  because new BDS releases ship the older stable API versions too. A world
  upgraded by a new BDS cannot be opened by an older one, which is what the
  pre-upgrade backup is for.
- **The image tag is separate.** `BEDROCK_IMAGE_TAG` pins the itzg wrapper
  image, not the game. Bump it a few times a year, deliberately.

The only unavoidable gap is the few hours between Mojang publishing a release
and the app stores rolling it out; Realms has the same gap.

---

## Layout

```
bin/mc                    the CLI (runs on your machine)
bin/setup-client.sh       one-time dev-machine setup (macOS or Debian/Crostini)
bin/bootstrap-server.sh   one-time server setup (streamed over ssh by mc bootstrap)
bin/deploy.sh             the deploy path (runs on the server)
bin/install-packs.py      unzip / classify / install / activate packs (server, stdlib)
bin/update-bds.sh         pin / check / upgrade BDS with backup and rollback (server; nightly cron)
.envrc.template           op:// references -> .envrc (gitignored)
.env.example              server-side knobs; seeded to /opt/mc/app/.env on first deploy
examples/hello-pack/      a finished pack, for smoke-testing the loop
server/logtail/           the web log viewer (stdlib Python)
docker-compose.yml        BDS + log viewer
```

On the server:

```
/opt/mc/app               this repo, rsynced
/opt/mc/app/addons        mirror of MC_ADDON_DIR
/opt/mc/app/data          BDS volume: worlds, packs, server.properties
/opt/mc/app/state         deploy.json (read by the log page), installed-packs.json, update.json/log
/opt/mc/app/backups       pre-upgrade world tarballs (BACKUP_KEEP newest)
```

---

## Roadmap: one server, several worlds

The stretch goal is to use the box as a shared hangout server too -- a
Realms alternative -- with each world getting its own set of add-ons. The
pieces are already shaped for it:

- BDS runs one world at a time, chosen by `LEVEL_NAME`. Switching worlds is a
  `.env` edit plus a restart; every world keeps its own `world_*_packs.json`.
- `install-packs.py` separates *installing* packs (shared, in
  `data/behavior_packs`) from *activating* them on a world (`activate()`,
  which already takes a world directory).

The plan: a committed `worlds.json` mapping world name → pack names
(`{"devworld": ["hello-pack"], "hangout": []}`), `install-packs.py` writing
each listed world's pack files from it (default: everything to `LEVEL_NAME`),
and `mc world <name>` to switch the active world. Not built yet.
