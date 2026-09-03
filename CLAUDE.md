# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

The server and sync loop for a Minecraft Bedrock Dedicated Server: a dev
machine watches a folder that an *external* add-on project writes finished
packs into, rsyncs them to the server, and the server installs, activates and
restarts within ~15 seconds. Add-on source code does not live here. There is
no Bukkit/Spigot-style plugin API on Bedrock -- an add-on is a behavior pack
and/or resource pack whose scripts run against `@minecraft/server`.

Two machines are in play, and every file belongs to one:

- **The dev machine** (macOS or ChromeOS/Crostini) -- `bin/mc`,
  `bin/setup-client.sh`, `.envrc.template`, `examples/`.
- **The server** (x86-64 Ubuntu, everything in Docker) -- `bin/deploy.sh`,
  `bin/install-packs.py`, `bin/update-bds.sh`, `bin/bootstrap-server.sh`, `docker-compose.yml`,
  `server/logtail/`, `.env.example`.

`bin/deploy.sh` and `bin/install-packs.py` live in the repo but only ever *run*
on the server under `/opt/mc/app/`. `bin/bootstrap-server.sh` runs once on the
server as root, streamed over ssh by `mc bootstrap`.

## Configuration

Dev-machine config is `.envrc`, rendered by `op inject` from the committed
`.envrc.template` (1Password `op://` references, single source of truth). It
supplies `MC_HOST`, `MC_SSH_USER`, `MC_SSH_PRIVATE_KEY`, `MC_ADDON_DIR`, and
optionally `MC_LOG_URL`, `MC_LOG_AUTH`, `MC_WATCH`, `MC_SETTLE`. direnv loads
it; `bin/mc` sources it itself if direnv hasn't. Never put values in the
template, and never commit `.envrc`.

Server config is `/opt/mc/app/.env`, seeded from `.env.example` on the first
deploy and never rsynced. `.env.example` is the file to update when adding a
knob.

## Commands

There is no build, no test suite and no linter. Verification is `bash -n` on
the shell scripts, `python3 -m py_compile bin/install-packs.py`, and watching
the log page after a deploy. `bin/install-packs.py` can be exercised locally
against a scratch tree: `install-packs.py ADDONS DATA STATE LEVEL`.

```bash
bin/mc dev              # watch MC_ADDON_DIR, deploy on change -- the main loop
bin/mc sync             # rsync tooling + add-ons, run deploy.sh once
bin/mc doctor           # op / .envrc / key / watcher / ssh checks
bin/mc bootstrap        # one-time server setup over root ssh
bin/mc update [--check] # upgrade BDS via bin/update-bds.sh on the server
bin/mc logs | console | backup | status | ssh
```

## The deploy path

Exactly one: `mc sync`/`mc dev` → rsync this repo to `/opt/mc/app` (excluding
`data/`, `state/`, `addons/`, `.env`, `.envrc`) → rsync `MC_ADDON_DIR` to
`/opt/mc/app/addons/` with `--delete` → ssh `bin/deploy.sh`.

`deploy.sh`: flock → seed/load `.env` → `update-bds.sh --pin` (turns
`VERSION=LATEST` into the running version so a deploy never upgrades the game)
→ install/remove the `# mc-update` crontab line per `AUTO_UPDATE`/`UPDATE_CRON`
→ hash the addons tree (the log page's "revision") → `install-packs.py` →
`docker compose up -d --build` → restart or `/reload` per `RELOAD_MODE` →
write `state/deploy.json`.

`update-bds.sh` (server, also the nightly cron): Mojang download API →
compare with `data/bedrock_server-<ver>` → world tarball into `backups/`
(prune to `BACKUP_KEEP`) → chat warning → `VERSION=` in `.env` → compose up →
wait for `Server started` + `Version:` → on failure re-pin, restore the
tarball, write `state/update.json` `rolled_back`/`failed`. Shares the deploy
flock. `--check` reports, `--to V` forces a version, `--pin` is deploy's hook.

`install-packs.py`: walks `addons/` for every `manifest.json`, extracting
`.mcpack`/`.mcaddon`/`.zip` into a temp dir (zip-slip checked), classifies by
module type (`resources`/`client_data` → resource pack, else behavior; world
templates and skin packs skipped), refuses duplicate UUIDs, copies into
`data/{behavior,resource}_packs/<name>`, removes packs it installed previously
that are now gone (tracked in `state/installed-packs.json`), and rewrites the
world's `world_behavior_packs.json` / `world_resource_packs.json` listing only
managed packs.

The git-push deploy path (bare repo + post-receive) was removed: add-ons no
longer live in git, so rsync is the only way anything reaches the server.
`origin` is GitHub, for history only.

## Things that will bite you

**A pack in `behavior_packs/` does nothing unless the world lists it.** That is
`activate()` in `install-packs.py`. If a deploy reports OK and nothing changed
in game, read the deploy output's `world_behavior_packs.json: N pack(s) [...]`
line.

**Never touch or list stock packs.** BDS unpacks ~140 packs (vanilla,
chemistry, editor) into the same `data/*_packs` directories. Only names in
`state/installed-packs.json` are ever deleted; only packs from `addons/` are
listed. Do not "clean up" those directories with `rsync --delete`. Mojang's
manifests are JSONC (`//` comments); the reader strips them.

**Every UUID must be globally unique** (header and each module). The installer
fails the deploy on a duplicate rather than let two packs silently not load.

**`dependencies` versions in a manifest must match what the running BDS
offers.** The example pack pins `@minecraft/server` 2.9.0. A mismatch shows up
as "script didn't load".

**Use `console.warn`, not `console.log`** in pack scripts; BDS drops `log`.

**`RELOAD_MODE=reload` leaks event subscriptions** across `/reload`. When
behaviour gets strange, `mc console stop` before debugging.

**Never set `VERSION=LATEST` on a running server** and never bypass
`update-bds.sh` to change it: BDS upgrades worlds in place and cannot go back,
so the pre-upgrade tarball is the only way down.

**Half-written archives.** The watcher waits `MC_SETTLE` seconds of quiet
before deploying; a bad zip fails the deploy loudly and the next write retries.

**`op inject` resolves `op://` references anywhere in the template, comments
included**, and any reference it cannot resolve fails the whole render. Never
put an example or commented-out reference in `.envrc.template`. The private
key reference needs `?ssh-format=openssh`: 1Password's default is PKCS#8,
which OpenSSH rejects for ed25519.

**The SSH key is written to `~/.ssh/mc/<host>.key` (0600)** from
`MC_SSH_PRIVATE_KEY` because ssh/rsync need a path. It is rewritten when the
value changes. If the variable is empty, `mc` falls back to ssh's defaults.

## Conventions

- Shell scripts are `set -euo pipefail`; the deploy fails loudly and records
  the failure in `state/deploy.json` rather than half-apply.
- `bin/install-packs.py` and `server/logtail/logtail.py` are Python stdlib
  only, so nothing on the server can rot from a dependency update.
- `bin/mc` must work identically on macOS and Debian/Crostini: prefer POSIX
  tools (`cksum`, `find`, `xargs`), detect `fswatch`/`inotifywait` at runtime,
  never edit `~/.ssh/config` (all ssh options are passed on the command line).
- `bin/setup-client.sh` is the only place that assumes brew or apt.
- Per-world add-on mapping is a documented stretch goal (README "Roadmap");
  keep install and activate separate in `install-packs.py` so it stays cheap.
