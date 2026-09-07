# Course format

The contract between the content (`course/`), the platform (`platform/`) and
the editor extension (`extension/`). Everything a lesson author or a platform
script needs to know is on this page. The
[project plan](../docs/2026-09-06-guided-course-plan.md) says why, and the
[review of the first five lessons](../docs/reviews/2026-09-07-lesson-review-01-05.md)
is where most of the rules below come from.

## Three rules above all others

1. **Every lesson has a playable impact.** Before the lesson ends, the learner
   sees, hears or does something in their own world that was not there
   before, and the lesson's last step is that moment. A lesson that ends with
   "nothing changes in the game yet" does not ship.
2. **The skeleton is complete and working.** A fresh workspace already holds
   a behavior pack and a resource pack that load cleanly: manifests with
   this workspace's own UUIDs, a script module with an entry file, lang and
   texture wiring, an icon. Lessons edit the skeleton; no lesson asks the
   learner to build plumbing (manifests, UUIDs, module lists) from nothing.
   Plumbing is explained where it earns a payoff, never as a prerequisite.
3. **Lessons do not depend on each other.** A lesson's checks assert only
   what that lesson adds; they pass on a skeleton where no other lesson was
   done. Lessons may share files (`scripts/main.js` accumulates) and may
   *mention* an earlier lesson, but must never *require* it. The learner can
   do them in any order.

## A learner's workspace

Created by `course/bin/new-workspace DIR` (the platform's provisioner calls
the same script). It is a git repository:

```
lessons/NN-slug.md         a copy of course/lessons/, what the learner reads
packs/                     what the learner edits, from course/templates/workspace/packs
  kid_bp/                  behavior pack: manifest (data + script modules), scripts/main.js, ...
  kid_rp/                  resource pack: manifest, pack_icon.png, texts/, textures/, ...
assets/                    images the lessons ask the learner to copy into place
.course/                   ignored by git
  vars.json                this workspace's UUIDs and other per-workspace values (see Placeholders)
  progress.json            written by `lesson`, read by the dashboard
  events.jsonl             one JSON line per learner event, written by `lesson` and the extension
  deploy.json              written by the platform's deploy sidecar after each deploy
  deploy.log               the sidecar's output, tailed into the editor's Deploy channel
  game-check               executable provided by the platform; `game-check ID` runs an in-game check
.vscode/settings.json      editor settings the course owns
README.md                  one paragraph: what this folder is
```

The platform deploys `packs/` plus `course/grader_bp/` into the learner's
Bedrock server. The grader pack is never in the workspace; the learner cannot
edit it and does not see it. The platform also puts `course/bin` on `PATH` in
the learner's terminal, so `lesson` is a command there.

## Placeholders

Files under `course/templates/workspace/` and `course/solutions/` may contain
`{{NAME}}` placeholders. `new-workspace` generates `.course/vars.json` once
per workspace and `build-tags` renders every placeholder from it, in the
template and in every solution overlay. So two learners get different UUIDs,
and "write the answer" never overwrites a learner's UUIDs with someone
else's.

Standard variables, all generated as fresh UUIDs: `BP_HEADER_UUID`,
`BP_DATA_UUID`, `BP_SCRIPT_UUID`, `RP_HEADER_UUID`, `RP_MODULE_UUID`,
`SPARE_UUID_1` to `SPARE_UUID_4`. A file whose rendered text is identical to
its unrendered text is copied as is, so binaries are safe.

Lesson files are rendered too, so a lesson can tell the learner exactly
what to type to reach *their* server: `{{SERVER_ADDRESS}}`,
`{{SERVER_PORT}}` and `{{LEARNER}}` are set by the platform's provisioner
(a laptop workspace gets readable defaults).

## Solutions and "the answer"

Solutions live in git tags in the workspace, built by `course/bin/build-tags`:

- `lesson/<id>/step-N` is the state before step N.
- `lesson/<id>/step-N-solution` is the state after step N.

`course/solutions/<id>/step-N/` is an overlay: files at their workspace
paths, rendered and copied over the workspace to produce the state after
step N. A step with no overlay changes nothing (a check-only step). Tags are
built by replaying the template, then every lesson's overlays in lesson
order, verifying after each step that steps 1..N of that lesson pass. Because
lessons are independent, a solution overlay must contain only the change the
step asks for, in the files the step names.

`lesson answer` diffs the working tree against the solution tag for the step
the learner is on, limited to **the files that step's checks name** (falling
back to the lesson's `files`), so it never shows or touches an unrelated
file. `lesson answer --apply` writes exactly those files. When a file stops
parsing every step fails, so the step shown is the furthest one the learner
had reached (`high` in progress.json), never earlier.

## A lesson file

`course/lessons/NN-slug.md`. `NN-slug` is the lesson id, used in tags, in
`progress.json`, in events, and as the key the grader pack answers to. Ids
are chosen by the course design, not fixed here; `build-tags` refuses a
`game` check whose id the grader does not know.

```markdown
---
id: 03-rename-a-diamond
title: Rename anything in the game
concept: Every name the game shows comes from a text file, and your pack can replace any line of it.
files: [packs/kid_rp/texts/en_US.lang]
game: false
---

# Rename anything in the game

## The idea

At most 100 words. One concept, a reason to care, one Minecraft analogy, no
instructions. End with a **Predict:** line: one question the learner answers
in their head before touching anything.

## Step 1: Write the new name
<!-- check
{"regex": "packs/kid_rp/texts/en_US.lang", "pattern": "^item\\.diamond\\.name=\\S", "msg": "the file needs a line that starts with item.diamond.name= followed by your new name"}
-->
At most 40 words before a code block and 20 after. One edit, one file, said
in the learner's words. Leave latitude where it is safe.

<details><summary>Hint</summary>
The hint: what the learner most likely did instead, and the fix.
</details>

## Step 2: See it
<!-- check
{"deploy": "ok", "resource_packs": ["kid_rp"], "msg": "your pack has not reached the server yet; the Deploy panel at the bottom says why"}
-->
The payoff, with the shared rejoin paragraph, then:

**Try this:** one variation the learner makes on their own, unchecked.

**Say it back:** one sentence the learner says to whoever is nearby.
```

Rules:

- Frontmatter keys: `id` (must equal the filename without `.md`), `title`,
  `concept` (one sentence), `files` (paths relative to the workspace that the
  lesson touches), `game` (`true` when a step uses a `game` check; the
  checker refuses a mismatch).
- Steps are `## Step N: <imperative title>`, N contiguous from 1. The last
  step is the playable moment. The checker refuses a lesson with a gap.
- The check block is an HTML comment starting with `<!-- check`, immediately
  after the step heading, one JSON object per line. Exactly one block per
  step. Every check has a `msg` written for the learner: what is wrong and
  what to do next, in a twelve-year-old's words, never the check's name.
  The checker refuses a check without a `msg`, with a key it does not know,
  or with a file outside the workspace.
- One `<details><summary>Hint</summary>…</details>` per step.
- Teach, do not allude. If a lesson names a distinction (two halves, event
  and effect, key and value), it shows one concrete example of each side
  and one thing that happens when they are confused, before asking the
  learner to tell them apart. A tour that says "kid_bp is the code half"
  has not taught what a behavior pack is.
- Reading load: the panel is about 300 pixels wide. Idea ≤ 100 words with a
  **Predict:** line (the tour may run longer, in short paragraphs, because
  it carries the one distinction everything else rests on); ≤ 40 words before a code block and ≤ 20 after; code
  lines ≤ 44 characters so they do not scroll sideways; a snippet that goes
  after a `]` or `}` starts with the comma the learner must add.
- Words: say "save" only when autosave is off (it is on); never point at
  "the course page" or "the dashboard" (the editor has neither); the deploy
  state is "the status bar" and the errors are "the Deploy panel".
- The rejoin paragraph, verbatim in every payoff step (except the tour,
  whose payoff is the first join): "Wait for the status
  bar to say **live**. Your phone shows *Disconnected from server*: tap your
  server in the list to join again, and tap **Download** if it asks about a
  resource pack."
- Nothing in a step may use a word or a file the learner has not met in an
  earlier step of the same lesson or in the skeleton tour.

## Checks

The checker runs steps in order and stops at the first step with a failure.
Output is TAP: `ok N - label` or `not ok N - label` followed by `# msg` and
`# got: …` lines. Checks that need the platform are `ok N - label # SKIP
reason` when the platform is absent, so content can be written and verified
on a laptop.

**Matching is exact by default.** The game parses identifiers, paths, keys,
event names and JSON exactly, so a check must too, or the checker says yes
to something the server then refuses in silence. `"loose": true` on a
`json`, `regex` or `same` check trims whitespace and ignores case; use it only
for text a human reads (a pack name, a chat message).

JSON files are read strictly: a BOM, `//` or `/* */` comments, or a trailing
comma fail with a message that says so. A JSON or JS file whose first
non-blank line starts with ```` ``` ```` fails with "that line is part of the
lesson page, not the file; delete it and the ``` at the end".

| Check | Keys | Passes when |
|---|---|---|
| `exists` | `"exists": FILE`, optional `"png": true` | the file exists (and starts with the PNG signature). When it does not, the message says where a file of that name, or that name with another case or extension, actually is under `packs/` |
| `json` | `"json": FILE, "path": PATH` plus one or more of `"exists": true`, `"absent": true`, `"equals": V`, `"not": V`, `"matches": REGEX`, `"oneOf": [..]`, `"uuid": true`, `"differsFrom": PATH` | the file parses and the value at `PATH` satisfies every condition given |
| `regex` | `"regex": FILE, "pattern": P`, optional `"count": N` | the pattern matches, multiline (exactly N times if given) |
| `same` | `"same": [SPEC, SPEC]` | both specs extract a value and the values are equal: text trimmed, lists and objects compared as JSON |
| `differs` | `"differs": [SPEC, SPEC]` | both specs extract a value and the values differ (UUID reuse across files) |
| `js` | `"js": FILE` | `node --check` passes (skipped without node; the file is checked as a module), no fence line, and outside comments and strings: no `console.log`, no `beforeEvents`, no `worldInitialize`, no statement starting `world.` at the top level (brace depth 0) other than a `.subscribe(` (statement-level, so the two-line `world.afterEvents.x` / `.subscribe(` form passes), and no block that belongs at the top level (`world.afterEvents.`, `system.afterEvents.`, `system.runInterval(`, `function `, `let `) pasted inside another block |
| `deploy` | `"deploy": "ok"`, optional `"behavior_packs": [..]`, `"resource_packs": [..]`, `"scripts_ok": true` | `.course/deploy.json` says `ok`, lists those pack directories, and (with `scripts_ok`) its `script_errors` list is empty. `script_errors` holds only what the server printed while **starting**; an error that happens later, when an event fires, shows in the Server panel, not here. SKIP if the file is absent, fail if it is empty or half-written |
| `game` | `"game": ID` | `.course/game-check ID` exits 0; SKIP if the hook is absent. The reason after `[course] FAIL ID:` in the hook's output is what the learner sees |

`PATH` is dotted with `[N]` indexes: `header.uuid`, `modules[0].type`,
`dependencies[1].version`. A `SPEC` for `same` and `differs` is
`{"file": F, "path": P}` for JSON, `{"file": F, "key": K}` for a `.lang`
file (`key=value` lines), or `{"file": F, "pattern": REGEX}` with one capture
group for anything else.

`uuid: true` requires the RFC 4122 shape and rejects the template placeholder.
A UUID that lost its quotes is diagnosed as such, not as a missing comma.

## The checker

`course/bin/lesson`, Python 3.9+, standard library only. It finds the
workspace by walking up from the current directory to a directory holding
`lessons/` and `packs/`, or uses `COURSE_WORKSPACE`.

```
lesson                    where you are
lesson check [ID]         run the checks, stop at the first failing step
lesson hint               the hint for the step you are on
lesson answer [--apply]   what is different from the answer; --apply writes it
lesson next               move to the next lesson once this one passes
lesson goto ID            jump to a lesson
lesson list               every lesson and its status
lesson watch              re-check on every save; keys h hint, a answer, n next, q quit
lesson uuid               print a fresh UUID
lesson json               everything the extension shows, as JSON
```

`ID` is a lesson id, its number or a prefix. Options for authoring:
`lesson check ID --upto N` checks only steps 1..N, `--quiet` prints nothing
and only sets the exit code. `lesson json` takes `--no-attempt` (do not
count a failed step) and `--no-game` (report game checks as waiting for the
button instead of running them).

When a file the current step reads does not parse, `lesson json` reports the
step the learner had reached (`high + 1`) as current and adds a `broken`
block naming the file and the parse message; the extension shows that block
above the step instead of sending the learner back to step 1, and the save
does not count as an attempt.

## progress.json

Written by the checker, read by the dashboard.

```json
{
  "current": "03-rename-a-diamond",
  "lessons": {
    "03-rename-a-diamond": {"steps": 2, "passed_steps": 1, "high": 1, "done": false, "fails": {"2": 2}, "at": "2026-09-07T14:02:11+0000"}
  }
}
```

`fails` counts failed attempts per step (`lesson check`, saves under
`lesson watch` and in the extension; not the watch start-up, deploy
updates, `lesson`, `lesson hint`, or a save that does not parse) and resets
when the step passes; the hint shows automatically at 2. `high` is the most
steps that have passed in one run.

## events.jsonl

One JSON line per learner event, appended by the checker and the extension
to `.course/events.jsonl`. The platform collects the files; the course
author reads them to find the step with the most attempts, the hint opened
most, and where sessions end. Nothing a child typed is ever logged: no file
contents, no message text, no `got` diagnostics; only codes and labels the
course itself wrote.

```json
{"t": "2026-09-07T14:02:11Z", "lesson": "03-rename-a-diamond", "step": 2, "event": "check", "outcome": "fail", "code": "regex.missing", "check": "packs/kid_rp/texts/en_US.lang", "attempt": 2, "source": "save"}
```

- `event`: `check`, `hint`, `answer`, `apply`, `next`, `goto`, `game`,
  `broken` (a file stopped parsing), `deploy` (from `deploy.json`, by the
  extension), `panel` (the extension opened).
- `outcome`: `pass`, `fail`, `skip` for checks; `pass`/`fail` for `game` and
  `deploy`.
- `code`: for a failed check, the kind and the condition that failed:
  `json.parse`, `json.missing`, `json.equals`, `json.not`, `json.uuid`,
  `json.differsFrom`, `regex.missing`, `regex.count`, `same.differ`,
  `differs.same`, `js.syntax`, `js.fence`, `js.console_log`, `js.top_level`,
  `exists.missing`, `exists.misplaced`, `deploy.failed`, `deploy.scripts`,
  `game.fail`.
- `source`: `save`, `button`, `cli`, `watch`.

## deploy.json

Written by the platform's deploy sidecar into `.course/` after every deploy
attempt.

```json
{
  "status": "ok",
  "detail": "",
  "revision": "1f3a9c2",
  "duration_seconds": 12,
  "at": "2026-09-07T14:02:11+0000",
  "behavior_packs": ["kid_bp"],
  "resource_packs": ["kid_rp"],
  "script_errors": []
}
```

`status` is `ok` or `failed`; `detail` is the error text the learner sees.
Pack lists hold the directory names under `packs/` that were installed.
`script_errors` holds the `[Scripting]` error lines the server printed while
starting with these packs (the control plane's restart endpoint returns
them), so a script the server refused is a loud failure, not a silent one.
The sidecar writes the file atomically: the checker treats an empty or
half-written file as a failed step, never as absent.

## In-game checks

The platform provides `.course/game-check`, an executable that takes a lesson
id, sends `scriptevent course:check <id>` to the learner's server console,
watches the container log for up to twenty seconds for a line containing
`[course] PASS <id>` or `[course] FAIL <id>: reason`, prints that line, and
exits 0 on PASS. The checker shows the learner the reason after `FAIL <id>:`.
`scriptevent course:ping` answers `[course] PASS ping`. The grader is
`course/grader_bp/`; its checks are keyed by lesson id in `scripts/main.js`.
The server must run with content logging to the console enabled, or the
grader's output never reaches the log.

## For the parent

`course/PARENT.md` holds one line per lesson: what to ask, what to watch
for, and what the payoff looks like, so a parent can sit beside the learner
without having done the lesson.
