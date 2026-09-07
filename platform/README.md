# The course box

Everything that runs on the server hosting the guided course. The content it
serves is `course/`; the contract between the two is `course/FORMAT.md`; the
plan is `docs/2026-09-06-guided-course-plan.md`. The project's name is
**redstone**: `redstone.clny.dev`, `/opt/redstone`, `redstone-*` containers.

## Install

From the dev machine, with `.envrc` rendered (`MC_SSH_PRIVATE_KEY` is the
key the box was created with):

```
platform/install.sh <host>
```

It rsyncs this repository to `root@<host>:/opt/redstone/app` and runs
`platform/bootstrap.sh` there. The first run installs Docker, seeds
`/opt/redstone/.env` with a generated admin password, and starts the stack;
later runs update the code and rebuild the images. Both are idempotent.

## What runs

```
/opt/redstone/
  app/                 this repository (rsynced; only platform/, course/ and bin/ matter)
  .env                 site address, admin password, secret, BDS version (server-local)
  control.db           users and sessions (SQLite)
  caddy/learners/      one routing snippet per learner, generated
  learners/<name>/
    .env               that learner's compose variables (port, token)
    workspace/         the git repo the learner edits (course/FORMAT.md)
    data/              that learner's Bedrock server (itzg image /data)
    state/             installer state, assembled addons dir, deploy log
```

Core stack (`docker-compose.yml`, project `redstone`, run by systemd):

- **caddy**: TLS, routes `/u/<name>/` to that learner's editor after asking
  the control plane, everything else to the control plane.
- **control**: Python stdlib HTTP service. Login, `/auth/check` for Caddy,
  the dashboard, learner provisioning, the in-game check endpoint. It is the
  only container with the Docker socket.

Per learner (`learner.compose.yml`, project `redstone-<name>`):

- **bds**: their Bedrock server on `FIRST_PORT + 10n` (v6 on `+1`), memory
  capped at `BDS_MEMORY` (1 GB by default), content logging to the console on so the grader's output
  reaches the log.
- **code**: code-server, no auth of its own, `course/bin` on `PATH`, editor
  settings baked in.
- **deploy**: the sidecar. Watches `workspace/packs/` with inotify (and a
  `POLL`-second revision check as a fallback), waits `SETTLE` seconds of quiet, assembles `packs/` plus the grader into an addons dir, runs
  `bin/install-packs.py` against the learner's data dir, then asks the
  control plane to restart the server (`POST /api/restart/<name>` with the
  learner's token), so it needs no Docker socket. A deploy whose packs match
  the last successful one does nothing, so a sidecar restart never bounces
  the server. Writes `workspace/.course/deploy.json` for the checker and the
  dashboard, and commits a snapshot of `packs/` on every successful deploy.

The in-game check hook (`workspace/.course/game-check`) calls the control
plane with the learner's token; the control plane sends
`scriptevent course:check <id>` to that learner's server and watches its log
for the grader's `PASS`/`FAIL` line.

## Ports

22, 80, 443 (tcp and udp) and 19132 to 19199/udp are open. Docker publishes
learner ports past ufw, as with the main server.
