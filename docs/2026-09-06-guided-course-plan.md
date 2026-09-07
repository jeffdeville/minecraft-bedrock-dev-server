# Guided course: project plan

Status: plan, 2026-09-06. Follows the
[feasibility brief](./2026-09-06-guided-course-feasibility.md). Research behind
the decisions here is in [`research/`](./research/): the
[lesson sequence](./research/2026-09-06-bedrock-lesson-sequence.md), the
[lesson format evaluation](./research/2026-09-06-lesson-format-evaluation.md),
and the [platform stack](./research/2026-09-06-one-box-platform-stack.md).
All work happens on the `guided-course` branch; `main` and the live server are
untouched until the branch has been installed and exercised on a fresh box.

## What we are building

The project is called **redstone**: `redstone.clny.dev`, `/opt/redstone` on
the box, `redstone-*` containers, `platform/` in this repository.

One installable package for a fresh Ubuntu VPS. After `platform/install.sh`
runs, an admin opens a web page, creates a learner, and the learner logs in to
find VS Code in the browser with lesson 1 open beside a starter behavior pack.
Every save deploys their pack into their own Bedrock server on the same box
within about fifteen seconds. A checker in the editor's terminal tells them,
step by step, whether the edit was right, offers a hint, and can show the
answer. Fifteen lessons take them from "a pack is a folder with a manifest" to
a small quest driven by their own script.

Definition of done for the prototype:

1. Fresh 4 GB VPS to working login page with one command, and it survives a
   reboot.
2. Admin creates two learners; each gets an isolated workspace, editor, and
   Bedrock server; neither can open the other's editor.
3. Lessons 1 to 15 exist, each passes its own checks against its own solution
   tags, and at least lessons 1 to 8 have been run by the learner.
4. The in-game milestone check works from the checker with no player online.

## Decisions

**Lesson format: our own Markdown convention, not MakeCode's.** MakeCode's
format was examined seriously and rejected. Its reusable residue is "one
Markdown file, `## Step` headings, a hint marker", which any convention has.
Everything that makes it a format is bound to the Blockly editor: the
`||category:block||` chips, the ```` ```blocks ```` toolbox restriction, and
the validators, which check that a block *type exists* on the live Blockly
workspace and cannot express "this manifest's dependency version is 2.9.0".
Its metadata lines and `#### ~ tutorialhint` render as junk in a stock
Markdown preview. Adopting it would mean writing our own parser for a foreign
syntax with no tooling gain. The spec we use instead is in the
"Lesson format" section below and is about a page.

**Editor: one code-server container per learner, no auth inside, Caddy in
front.** code-server 4.135 (weekly releases, tracks VS Code) with
`--auth none`, `chat.disableAIFeatures: true` baked in (that setting alone
halves memory, 565 MiB to 310 MiB per open editor). OpenVSCode Server is
unmaintained since March 2026. Coder wants Postgres, Terraform and 4 GB for
itself. Gitea/Forgejo would add 200 MB to solve remotes we do not need.

**Accounts: a small Python control plane, SQLite, Caddy `forward_auth`.** One
stdlib-only Python service (same rule as `install-packs.py`) holds users,
sessions and progress, answers Caddy's auth check with an `X-Learner` header,
provisions learners, and renders the dashboard. No identity provider.

**One Bedrock server per learner, from the start.** A shared world would mix
two learners' packs, UUIDs and grader state, and one learner's infinite loop
would take down the other's session. Per-learner BDS costs about 500 to 700 MB
each, capped at 1 GB in compose. Ports are `19132 + 10n` for v4 and `+1` for
v6, set explicitly because the image's default v6 port would collide.

**Deploy-on-save: the existing installer, per learner, with no rsync.** An
`inotifywait` sidecar per learner watches `workspace/packs/`, waits two
seconds of quiet, assembles the packs plus the grader, and runs the same
`install-packs.py` that `bin/deploy.sh` runs today against that learner's
data directory. Half-saved JSON fails loudly and the next save retries,
exactly as now. The sidecar has no Docker socket: it asks the control plane
to restart the server over HTTP with the learner's token, and the control
plane warns players, restarts the container and waits for `Server started`.
A first design that shared the server's PID namespace and wrote `stop` to its
stdin was tried and dropped: the sidecar died with every server restart, and
its own restart then stopped the server again, in a loop.

**Checking: static checks first, in-game checks only for milestones.** The
checker is a stdlib Python CLI printing TAP. In-game checks send
`scriptevent course:check <lesson>` through the image's `send-command` and
grep the container log for a `PASS` line from a grader pack. This was verified
on BDS 1.26.45.1 with no player connected; `sourceType` is `Server`. It
requires `CONTENT_LOG_CONSOLE_OUTPUT_ENABLED=true` on the container, or script
output never reaches the log at all.

**Rendering: a VS Code extension, decided 2026-09-07.** The first cut was the
built-in Markdown preview plus the checker as a watch loop in the terminal.
That is too hidden for a twelve-year-old, so the guidance is a small
extension (`extension/`): a Course panel in the activity bar showing the
Idea, the step list, the current step, live check results after every save,
Hint, Show answer, Write the answer, Next lesson, Check in the game, and the
deploy state in the status bar. It runs in the extension host, so it works
the same in code-server and in desktop VS Code, and it holds no lesson
logic: it renders `lesson json` and turns buttons into checker commands, so
the format and the checker stay the contract. It is built in a Node stage
of the editor image and side-loaded as a `.vsix`; the box never needs Node.
Later, a desktop mode can upload packs to the control plane over HTTPS with
the learner's token, so a kid on any laptop needs only VS Code and the
extension; the checker would be ported to TypeScript then, so the client
needs no Python. vscode.dev is out: browser-only extensions cannot spawn
processes. The terminal checker stays as the fallback and the authoring tool.

**Course content is generic, not the submarine project.** Lessons build a fresh
pack in a `kid:` namespace so they are reusable by any learner and do not
depend on the Sea Wolf assets. The learning track's Lesson 0 and Step 5
pre-work can point at course lessons 1 to 7 once they exist.

**Game version is pinned by the course.** Lessons assume `@minecraft/server`
2.9.0 (stable in BDS 1.26.40 and later) and `format_version: 2` manifests.
`update-bds.sh --pin` keeps a learner's server from upgrading under them; the
course version bumps deliberately, together with any check that names a
version.

## Layout on the branch

```
course/                      Thread A. Content and the checker. No server needed.
  FORMAT.md                  the lesson format spec (the contract between threads)
  bin/lesson                 checker CLI: check, watch, hint, answer, next
  lessons/NN-slug.md         one file per lesson
  templates/                 starter workspace: packs/kid_bp, packs/kid_rp, settings
  grader_bp/                 behavior pack that answers scriptevent course:check
  solutions/                 built by `course/bin/build-tags` into git tags of a workspace
extension/                   The guidance UI: a VS Code extension over `lesson json`.
platform/                    Thread B. Everything that runs on the box.
  install.sh                 dev machine: rsync to root@host:/opt/redstone/app, run bootstrap
  bootstrap.sh               on the box, idempotent: docker, .env, network, firewall, systemd, compose up
  docker-compose.yml         caddy + control plane
  learner.compose.yml        template: bds + code-server + deploy sidecar
  Caddyfile                  routes; one snippet per learner generated into caddy/learners/
  control/                   Python stdlib service: auth, provision, dashboard, in-game check, SQLite
  sidecar/                   Dockerfile + watch loop + deploy wrapper
  code-server/               Dockerfile + baked User settings
  systemd/                   unit that runs compose up/down
```

The existing `bin/mc` loop and `bin/deploy.sh` are untouched. The sidecar
reuses `bin/install-packs.py` as is (it already takes its directories as
arguments) and `state/installed-packs.json` for the pack list in
`deploy.json`; nothing in `bin/` needed parameterising.

## Lesson format

The whole spec. `course/FORMAT.md` will carry it with examples.

- One file per lesson, `course/lessons/NN-slug.md`. YAML-style frontmatter
  with `id`, `title`, `concept` (one sentence), `files` (paths the lesson
  touches), `game` (`true` if the last step needs an in-game check).
- Body opens with an **Idea** section: at most 150 words explaining the one
  concept, with a Minecraft analogy, before any instruction. This is where the
  "explain each concept as we go" work lives, and it is the part the learner
  reads aloud at the start of a session.
- Then `## Step N: <imperative title>`, N contiguous from 1. Each step is one
  edit in one file. The instruction says what to change and leaves latitude
  where it is safe ("make the message say what you want").
- Immediately after the heading, a check block hidden from the preview:
  `<!-- check` then one JSON object per line then `-->`. Check types:
  `json` (`file`, `path`, one of `equals`/`matches`/`exists`/`oneOf`),
  `regex` (`file`, `pattern`, optional `count`), `exists` (`file`),
  `same` (two `file`/`path` pairs must be equal, for identifier drift across
  BP, RP, lang and script), `js` (`file` must pass `node --check`; `top-level
  only subscribe/run` rule), `game` (`lesson` id to send with `scriptevent`).
  JSON rather than YAML so the checker stays stdlib-only.
- Every check carries a `msg` written for the learner, not the author:
  "the version must be exactly 2.9.0, because that is what the server offers".
- Checks are forgiving by construction: `regex` patterns ignore whitespace and
  case unless the lesson is about case; string checks strip quotes and
  trailing commas from the diagnostic so the message can say what was found.
- A hint per step in `<details><summary>Hint</summary>…</details>`. The
  checker prints it on the first failure of that step.
- Solutions are git tags in the learner's workspace: `lesson/<id>/step-N` and
  `lesson/<id>/step-N-solution`. `lesson answer` runs the diff between them and
  `lesson answer --apply` checks the solution out. `course/bin/build-tags`
  builds those tags from `course/solutions/` so authoring a solution is editing
  files, not writing patches.
- Checker output is TAP: `ok 3 - script module has an entry`, `not ok 4 -
  dependency version # got "1.5.0", want "2.9.0"`. Progress is written to
  `workspace/.course/progress.json` and read by the control plane.

## Thread A: content

Independent of the platform. Everything here runs on a laptop against a
scratch workspace, and can be tried on the live server today with `mc dev`
pointing at a workspace's `packs/` directory.

The sequence, one new idea per lesson, every lesson ending with something
visible in game. S is static check, G is an in-game milestone check.

| # | Concept | Steps (each one edit) | Check | Payoff |
|---|---|---|---|---|
| 1 | A pack is a folder with a manifest | manifest from template; header UUID; module UUID; name | S | deploy log lists one pack |
| 2 | Resource pack and the link between halves | RP manifest; pack icon; BP `dependencies` on RP uuid | S, G | both packs listed, icon shows |
| 3 | A resource pack can rename vanilla things | `texts/en_US.lang` line; `languages.json` | S | a diamond has a new name |
| 4 | Scripts exist | script module; `@minecraft/server` 2.9.0 dependency; `scripts/main.js` with the import | S, G | deploy OK, no content-log error |
| 5 | An event runs your code | subscribe `playerSpawn`; `world.sendMessage` inside it | S | chat says hello on join |
| 6 | Event data and strings | use `ev.player.name`; switch to `player.sendMessage` | S | greeting with their name, only they see it |
| 7 | `if` | wrap in `if (ev.initialSpawn)`; add `else` | S | different message on respawn |
| 8 | Timers | `system.runInterval` message; change the interval | S | a message every ten seconds |
| 9 | A variable that changes | `let seconds = 0`; `seconds += 1`; show it | S | counting chat |
| 10 | A function is a named recipe | `function greet(player)`; call it from the handler | S | same behaviour, tidier |
| 11 | Scoreboard | objective in `worldLoad`; `playerBreakBlock` adds score; sidebar; import `DisplaySlotId` | S, G | sidebar counts blocks broken |
| 12 | A custom item is JSON | `items/wand.json`; texture; `item_texture.json`; lang line | S, G | `/give @s kid:wand` works, named and textured |
| 13 | Tie an event to your item | `itemUse` subscribe; `if typeId === "kid:wand"`; `addEffect` | S | right-click the wand and float |
| 14 | State that survives a restart | `getDynamicProperty ?? 0`; `setDynamicProperty`; show the count | S, G | "wand used 7 times" after a restart |
| 15 | A tiny quest | `dialogue/scene.json` button running `scriptevent kid:quest`; handler; win at ten uses | S, G | talk to an NPC, use the wand, win |

Custom blocks, custom entities, TypeScript and custom commands are deliberately
after 15. Sources per lesson and the API facts each one pins are in the
research report; the ones that matter most: `worldInitialize` is gone
(`worldLoad`), `world.sendMessage` at module top level throws under 2.x early
execution, `console.log` never reaches the server log, Microsoft's own
scripting intro still pins 1.5.0 and is wrong for us.

Pitfalls the checker catches before the game does, because the game says
nothing: identifier drift across the four files that name an item; a
dependency entry with both `uuid` and `module_name`; a `-beta` version; UUID
reuse from a copied manifest, naming the file; `min_engine_version` too low
for the format versions used; `//` comments in learner JSON; a BOM;
`beforeEvents` (read-only) where an `afterEvents` was meant; `Scripts/Main.js`
on a case-insensitive laptop.

Tasks:

- **A1. Lessons 1 to 5, authored and passing.** Each with Idea, steps, checks,
  hints, and a solution in `course/solutions/`. Done when `lesson check --all`
  passes against the built tags and each payoff has been seen on the live
  server via `mc dev`.
- **A2. Lessons 6 to 11.** Same bar. Lesson 11 is the first in-game check
  after lesson 2; it exercises the grader pack for real.
- **A3. Lessons 12 to 15.** The cross-file `same` checks earn their keep here.
- **A4. Learner test of lessons 1 to 8.** Sit beside them. Record every check
  that fails on an answer that was actually fine, and every hint that did not
  help. Fix strictness first, wording second. This is the task the feasibility
  brief called the top risk, and it repeats after A3.
- **A5. Payoff GIFs (optional).** Thirty seconds per lesson, no narration,
  only after A4.

Authoring rules, from the Code Kingdoms lessons: one edit per step; the check
tolerates case, whitespace and naming unless the lesson is about them, and
says what it found; two-level rescue, hint then answer; latitude inside the
step; nothing on screen the learner has not been introduced to yet.

## Thread B: platform

Independent of the content. Needs only the workspace layout from
`course/FORMAT.md` and one dummy lesson to test with.

- **B1. Reuse the deploy path.** Done without changes: `install-packs.py`
  takes its directories positionally and the sidecar's wrapper mirrors
  `deploy.sh`'s steps. `bin/` stays as it is.
- **B2. Learner compose template.** `platform/learner.compose.yml` rendered
  per learner with name, ports, and paths: `bds` (itzg image pinned to
  `2026.8.2`, `SERVER_PORT`/`SERVER_PORT_V6`, `CONTENT_LOG_CONSOLE_OUTPUT_ENABLED=true`,
  `FORCE_PACK_COPY=false`, memory limit 1g, `restart: unless-stopped`),
  `code` (our code-server image, `--auth none`, workspace bind-mounted),
  `deploy` (the sidecar, workspace and BDS data bind-mounted, no socket).
  Done when `docker compose -p alice up -d` on a laptop gives a joinable
  server and an editor on a local port.
- **B3. Deploy sidecar.** `inotifywait -m -r -e close_write,moved_to,create,delete`
  on `workspace/packs`, drain to two seconds of quiet, run the deploy wrapper,
  never exit the loop. The wrapper runs `install-packs.py` and restarts BDS
  via `send-command` and the compose restart, writes `deploy.json` to the
  learner's state directory, and on success commits a snapshot into the
  workspace repo. Done when a save in the editor shows in the world within
  fifteen seconds and a broken manifest shows its error on the dashboard.
- **B4. code-server image.** `codercom/code-server:4.135.0` plus baked User
  settings: `chat.disableAIFeatures`, `editorAssociations` for
  `lessons/**/*.md` as preview, `files.autoSave` afterDelay, a terminal
  profile that starts `lesson watch`. No marketplace extensions. Done when the
  learner URL opens lesson 1 as a preview beside `manifest.json` with the
  checker running.
- **B5. Control plane.** Python stdlib HTTP server and `sqlite3`. Tables:
  `users(name, hash, is_admin)`, `sessions`, `progress(user, lesson, step,
  status, at)`. Routes: `/login`, `/logout`, `/auth/check` (200 plus
  `X-Learner`, else 302), `/` dashboard (per learner: current lesson, last
  check output, last deploy status from their `deploy.json`, a "restart my
  server" button, and the checker's in-game check trigger), `/admin/learners`
  (create, reset password, remove). Provision: `mkdir`, copy
  `course/templates`, `git init`, build the solution tags, render the compose
  file and Caddy block, `docker compose -p <name> up -d`, `caddy reload`.
  Done when two learners can log in and only reach their own `/u/<name>/`.
- **B6. Caddy.** `Caddyfile` with `forward_auth` on `/u/*`, a generated
  per-learner matcher block, admin allowed into every learner's editor. Done
  when a forged path from Alice to Bob's editor gets 403 and TLS is automatic
  on a real hostname.
- **B7. Packaging.** `platform/install.sh HOST` rsyncs the repository to
  the box and runs `platform/bootstrap.sh` there: Docker from Docker's apt
  repo, `/opt/redstone/.env` seeded with a generated admin password, the
  `redstone` network, firewall, the systemd unit, `compose up`. Re-running is
  the update path. Debian packaging and
  Nix were considered and are not worth it for three users.
- **B8. Fresh-VPS install and reboot test.** New 4 GB Vultr box, not the live
  one. Run bootstrap, create two learners, join both servers from a phone and
  the Chromebook, reboot the box, confirm everything comes back. Record RAM
  with both editors open and one player in each world; the research estimate
  is about 2.9 GB, so 4 GB is the floor and 8 GB the comfortable size.

## Where the threads meet

`course/FORMAT.md` and `course/bin/lesson` are the contract. Thread A writes
lessons to the spec; Thread B mounts a workspace and runs the checker. Two
integration points need both:

- **The grader pack.** Content owns what `PASS <lesson>` means; the platform
  owns sending `scriptevent course:check <lesson>` and grepping the log. The
  workspace hook `.course/game-check` calls the control plane over HTTP with
  the learner's token, because the editor container has no Docker access.
  Lesson 2's in-game check is the first end-to-end test, and it only asserts
  "both packs are listed", so it can pass before any scripting lesson exists.
- **Progress.** The checker writes `.course/progress.json`; the dashboard
  reads it. The file format is three fields and lives in `FORMAT.md`.

## Milestones

- **M0, the contract (first).** `FORMAT.md`, the checker with `check`,
  `watch`, `hint`, `answer`, the workspace template, the grader pack, and
  lesson 1 written to the spec and passing against its tags. Runs on a laptop.
  Both threads start from here.
- **M1, one learner on one box.** B1 to B4 plus B7 minimally: bootstrap brings
  up Caddy, one hard-coded learner, editor, server, sidecar. Lessons 1 to 5
  (A1) are on it. Save to world in fifteen seconds; checker in the terminal.
- **M2, accounts and the dashboard.** B5, B6, B8. Two learners, admin page,
  in-game check wired. Lessons 6 to 11 (A2) land during this.
- **M3, content complete.** A3, A4. Lessons 12 to 15 and the first learner
  test. Strictness fixes from the test are the deliverable, not the lessons.
- **M4, iterate.** Second learner test, GIFs if wanted, and the roadmap items
  below only if they are asked for.

## Risks and open calls

- **Content is the expensive part.** The scaffold is days; each lesson that
  survives a learner is hours. A4 is scheduled twice for that reason.
- **Exact-match strictness** turned parents into debuggers in Code Kingdoms.
  Every check has a learner-facing message and tolerance is the default.
- **In-game check flakiness.** Restarts and log parsing make G checks slower
  than S checks. Only six lessons have them, and each has an S fallback the
  learner can pass without the game.
- **Console clients.** Xbox, PlayStation and Switch cannot add a server on a
  custom port. If a console learner appears, a BedrockConnect container on
  UDP 19132 is the workaround; not in scope until then.
- **Memory.** BDS numbers were measured under emulation; B8 gets the real
  ones. code-server can grow over multi-day sessions; a nightly container
  restart is cheap insurance.
- **The Chromebook.** Chrome only; no Crostini needed. The Android Minecraft
  client joins the learner's port.

## Not in scope

Narrated videos, a webview extension, a git remote, per-world add-on
mapping, TypeScript or a build step in lessons, custom blocks and entities,
any identity provider, more than a handful of learners on one box.
