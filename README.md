# Minecraft Bedrock dev server

A Bedrock Dedicated Server on a cheap x86 cloud box, set up so that saving a
file on a Chromebook puts the change in the running world about fifteen seconds
later, with the server console readable in a browser.

For day-to-day use, read [QUICKSTART.md](QUICKSTART.md) — that's the page for
whoever is writing the code. This page is the setup and operations manual.

## The loop

```
  Chromebook (Crostini)                      Server (Hetzner, x86)
  ─────────────────────                      ─────────────────────
  edit src/starter/main.ts
        │ save
        ▼
  mc dev  ──── rsync ────────────────────▶  /opt/mc/app
        │                                        │
        └──── ssh deploy.sh ───────────────▶  build (node container)
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

`git push prod main` runs the identical `deploy.sh` via a post-receive hook, so
there is exactly one code path from source to running world regardless of which
route a change takes.

## What "plugin" means here

Bedrock has no Bukkit/Spigot-style plugin API and never has. What it has is
**behavior packs** containing JavaScript that runs against the
[`@minecraft/server` Script API](https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/minecraft-server).
That's what this project builds and deploys. It's Microsoft's supported path, it
tracks the retail client, and the docs and tutorials all assume it.

Pinned versions:

| Thing | Version | Why |
|---|---|---|
| `@minecraft/server` | 2.9.0 | Current stable track. No experimental toggles needed. |
| `@minecraft/server-ui` | 2.1.0 | Forms and dialogs, also stable. |
| `itzg/minecraft-bedrock-server` | 2026.8.1 | Pinned so an upstream change can't break a session. |
| BDS itself | `LATEST` | Must track the retail client — Bedrock clients auto-update and refuse older protocols. |

Beta-track APIs (anything with a `-beta` suffix) additionally require the
"Beta APIs" experiment enabled on the world. This setup deliberately uses only
stable APIs so there is nothing extra to toggle.

## One-time setup

### 1. The box

Any x86-64 Ubuntu 24.04 machine. On Hetzner, a **CX22** (2 vCPU, 4 GB, ~€4/mo)
is comfortable for a handful of players.

> **It must be x86.** Hetzner's CAX line is ARM, and Mojang ships BDS as an
> x86-64 binary only. A CAX box will not run this.

### 2. Bootstrap the server

From this repo on the Chromebook:

```bash
ssh root@<server-ip> 'bash -s' < bin/bootstrap-server.sh
```

Installs Docker, creates the `mcdev` deploy user, lays out `/opt/mc`, creates
the bare git repo with its post-receive hook, and opens the firewall. Idempotent.

### 3. Set up the Chromebook

Needs ChromeOS **Linux (Crostini)** turned on: Settings → Advanced → Developers
→ Linux development environment. Then, inside the Linux terminal:

```bash
bin/setup-chromebook.sh <server-ip>
```

Installs rsync/inotify-tools/git/node, generates an SSH key, configures a
connection-reusing SSH alias, writes `.mcrc`, and adds the `prod` git remote.

It prints a public key. Put it on the server:

```bash
ssh root@<server-ip> "cat >> /home/mcdev/.ssh/authorized_keys" <<< "<the key>"
```

### 4. First deploy

```bash
bin/mc sync
```

First run pulls the BDS image and generates the world, so give it a couple of
minutes. After that, deploys are seconds.

Add `bin/` to PATH so it's just `mc`:

```bash
echo 'export PATH="'$PWD'/bin:$PATH"' >> ~/.bashrc && source ~/.bashrc
```

## Connecting

Address `<server-ip>`, port `19132`. In Minecraft: Play → Servers → Add Server.

Minecraft Bedrock runs on ChromeOS via Google Play on supported Chromebooks. If
his doesn't support it, he can test from a phone, tablet, Windows PC, or Switch —
the code loop is unaffected either way, and testing from a second device is
arguably better anyway.

## Adding another pack

Two matching directories, same name:

```bash
mkdir -p src/mything packs/behavior/mything
```

1. `src/mything/main.ts` — your code.
2. `packs/behavior/mything/manifest.json` — copy the starter's and replace
   **both** UUIDs with fresh ones:

   ```bash
   python3 -c "import uuid;print(uuid.uuid4());print(uuid.uuid4())"
   ```

Reusing a UUID is the single most common Bedrock packaging mistake — two packs
sharing one and neither loads. The build picks up the new directory
automatically; `deploy.sh` regenerates `world_behavior_packs.json` so the world
actually activates it.

Resource packs (textures, sounds, UI) go in `packs/resource/<name>/` with the
same manifest rules.

## Logs

`http://<server-ip>:8080` — live console over SSE, with script errors and stack
traces coloured and an **errors only** filter. The header shows the last deploy's
status, git revision, and how long it took.

- `/errors` returns the recent error lines as JSON.
- `/status` returns the last deploy result as JSON.

**This page is public.** Anyone with the URL can read the console, which includes
player gamertags and any file paths that appear in stack traces. To require a
password, set one line in the server's `/opt/mc/app/.env`:

```
LOG_AUTH=kid:somepassword
```

then `mc sync`. There is no other change needed.

## restart vs reload

`RELOAD_MODE` in `.env`:

- **`restart`** (default) — stops and starts BDS. ~15 s, disconnects players,
  always correct.
- **`reload`** — sends `/reload` to the running server. ~2 s, players stay
  connected. Faster, but the Script API leaks event subscriptions across
  reloads, so after a dozen reloads handlers fire multiple times per event and
  behaviour gets strange.

Reasonable practice: `reload` while iterating hard, and a real restart
(`mc console stop`) whenever something looks wrong before you go debugging a bug
that isn't there.

## Locking down who can join

`ONLINE_MODE=true` (the default) already requires a real Xbox Live sign-in. To
restrict to specific people, set `ALLOW_LIST=true` in `.env` and add them:

```bash
mc console "allowlist add SomeGamertag"
mc console "allowlist reload"
```

Worth doing before you share the IP with anyone.

## Backups

```bash
mc backup     # -> backups/world-YYYYmmdd-HHMMSS.tar.gz
```

Uses BDS's `save hold` / `save resume` so the snapshot is consistent rather than
a tar of a live world. Nothing here is automatic — if the world starts to matter,
put that command on a cron job or a `/loop`.

## Updating Minecraft

`VERSION=LATEST` means BDS re-checks on every container start, so a restart
usually picks up a new release on its own.

When a Minecraft update breaks the Script API surface, bump `@minecraft/server`
in `package.json` **and** the matching `dependencies` version in every
`manifest.json`, then `mc sync`. Check what's current with:

```bash
npm view @minecraft/server dist-tags
```

The image tag itself (`BEDROCK_IMAGE_TAG`) is pinned deliberately; bump it when
you want to, not mid-session.

## Layout

```
bin/mc                    the CLI (runs on the Chromebook)
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
/opt/mc/app               working tree (rsync + git checkout land here)
/opt/mc/app/data          BDS volume: worlds, packs, server.properties
/opt/mc/app/state         deploy.json, read by the log page
```

## Troubleshooting

**Script didn't load.** Look for `failed to load` or a UUID complaint on the log
page. Almost always a duplicate UUID or a `dependencies` version the running BDS
doesn't offer.

**Deploy says OK but nothing changed in game.** The world has to list the pack.
`deploy.sh` writes `world_behavior_packs.json` every time — check it exists:
`mc ssh` then `cat /opt/mc/app/data/worlds/devworld/world_behavior_packs.json`.

**Can't connect.** Bedrock is UDP. Confirm 19132/**udp** is open in both ufw and
the Hetzner cloud firewall if you enabled one.

**Deploy hangs on first run.** It's pulling the BDS image and generating a world.
Watch it on the log page.

**Client updated and now refuses to connect.** Retail Bedrock clients won't talk
to an older-protocol server. `mc console stop` — the container restarts and picks
up the newer BDS.
