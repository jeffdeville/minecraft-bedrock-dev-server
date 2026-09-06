# Course format

The contract between the content (`course/`) and the platform (`platform/`).
Everything a lesson author or a platform script needs to know is on this page.
The [project plan](../docs/2026-09-06-guided-course-plan.md) says why.

## A learner's workspace

Created by `course/bin/new-workspace DIR` (the platform's provisioner calls
the same script). It is a git repository:

```
lessons/NN-slug.md         a copy of course/lessons/, what the learner reads
packs/                     what the learner edits; every pack dir has a manifest.json
  kid_bp/                  the behavior pack (created by the learner in lesson 1)
  kid_rp/                  the resource pack (lesson 2)
.course/                   ignored by git
  progress.json            written by `lesson`, read by the dashboard
  deploy.json              written by the platform's deploy sidecar after each deploy
  game-check               executable provided by the platform; `game-check ID` runs an in-game check
.vscode/settings.json      lessons open as a Markdown preview, autosave on
README.md                  one paragraph: run `lesson` in the terminal
```

The platform deploys `packs/` plus `course/grader_bp/` into the learner's
Bedrock server. The grader pack is never in the workspace; the learner cannot
edit it and does not see it.

Solutions live in git tags in the workspace, built by `course/bin/build-tags`:

- `lesson/<id>/step-N` is the state before step N.
- `lesson/<id>/step-N-solution` is the state after step N.

`lesson answer` diffs the working tree against the solution tag for the step
the learner is on, limited to the lesson's `files`. `lesson answer --apply`
writes those files. Solutions carry fixed UUIDs, so two learners who both
apply the answer end up with the same UUIDs, which is fine because each has
their own server.

## A lesson file

`course/lessons/NN-slug.md`. `NN-slug` is the lesson id, used in tags, in
`progress.json`, and as the key the grader pack answers to.

```markdown
---
id: 01-manifest
title: A pack is a folder with a manifest
concept: Minecraft finds an add-on by its folder and reads manifest.json to learn what it is.
files: [packs/kid_bp/manifest.json]
game: false
---

# A pack is a folder with a manifest

## The idea

At most 150 words. One concept, one Minecraft analogy, no instructions. The
learner reads this aloud at the start of the session.

## Step 1: Make the file
<!-- check
{"exists": "packs/kid_bp/manifest.json", "msg": "there is no file at packs/kid_bp/manifest.json yet"}
{"json": "packs/kid_bp/manifest.json", "path": "header", "exists": true, "msg": "the file must be valid JSON with a header section"}
-->
What to do, in one edit to one file. Leave latitude where it is safe.

<details><summary>Hint</summary>
The hint. Shown by `lesson hint`, and automatically after the second failed
check of this step.
</details>

## Step 2: ...
```

Rules:

- Frontmatter keys: `id` (must equal the filename without `.md`), `title`,
  `concept` (one sentence), `files` (paths relative to the workspace that the
  lesson touches; `lesson answer` is limited to these), `game` (`true` when
  a step uses a `game` check).
- Steps are `## Step N: <imperative title>`, N contiguous from 1. The checker
  refuses a lesson with a gap.
- The check block is an HTML comment starting with `<!-- check`, immediately
  after the step heading, one JSON object per line. The preview hides it.
- Every check has a `msg` written for the learner: what is wrong and what to
  do, not what the check is called. Optional `name` is the short TAP label;
  the default is the file and path.
- One `<details><summary>Hint</summary>…</details>` per step.
- Nothing in a step may use a word or a file the learner has not met in an
  earlier step or lesson.

## Checks

The checker runs steps in order and stops at the first step with a failure.
Output is TAP: `ok N - label` or `not ok N - label` followed by `# msg` and
`# got: …` lines. Checks that need the platform are `ok N - label # SKIP
reason` when the platform is absent, so content can be written and verified
on a laptop.

String comparisons trim whitespace and ignore case unless `"exact": true`.
Regexes are case-insensitive and multiline unless `"exact": true`. JSON files
are read strictly: a BOM, `//` or `/* */` comments, or a trailing comma fail
with a message that says so.

| Check | Keys | Passes when |
|---|---|---|
| `exists` | `"exists": FILE`, optional `"png": true` | the file exists (and starts with the PNG signature) |
| `json` | `"json": FILE, "path": PATH` plus one or more of `"exists": true`, `"equals": V`, `"not": V`, `"matches": REGEX`, `"oneOf": [..]`, `"uuid": true`, `"differsFrom": PATH` | the file parses and the value at `PATH` satisfies every condition given |
| `regex` | `"regex": FILE, "pattern": P`, optional `"count": N` | the pattern matches (exactly N times if given) |
| `same` | `"same": [SPEC, SPEC]` | both specs extract a value and the values are equal, exact |
| `js` | `"js": FILE` | `node --check` passes (skipped without node), no `console.log`, no `beforeEvents`, no `worldInitialize`, no `world.` call at the top level other than `.subscribe(` |
| `deploy` | `"deploy": "ok"`, optional `"behavior_packs": [..]`, `"resource_packs": [..]` | `.course/deploy.json` says `ok` and lists those pack directories; SKIP if the file is absent |
| `game` | `"game": ID` | `.course/game-check ID` exits 0; SKIP if the hook is absent |

`PATH` is dotted with `[N]` indexes: `header.uuid`, `modules[0].type`,
`dependencies[1].version`. A `SPEC` for `same` is `{"file": F, "path": P}`
for JSON, `{"file": F, "key": K}` for a `.lang` file (`key=value` lines), or
`{"file": F, "pattern": REGEX}` with one capture group for anything else.

`uuid: true` requires the RFC 4122 shape and rejects the template placeholder.

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
```

Options for authoring: `lesson check ID --upto N` checks only steps 1..N,
`--quiet` prints nothing and only sets the exit code.

## progress.json

Written by the checker, read by the dashboard.

```json
{
  "current": "01-manifest",
  "lessons": {
    "01-manifest": {"steps": 5, "passed_steps": 2, "done": false, "fails": {"3": 2}, "at": "2026-09-06T14:02:11+0000"}
  }
}
```

`fails` counts consecutive failed checks per step and resets when the step
passes; the hint prints automatically at 2.

## deploy.json

Written by the platform's deploy sidecar into `.course/` after every deploy
attempt. Same shape as this repo's `state/deploy.json` plus the pack lists.

```json
{
  "status": "ok",
  "detail": "",
  "revision": "1f3a9c2",
  "duration_seconds": 12,
  "at": "2026-09-06T14:02:11+0000",
  "behavior_packs": ["kid_bp"],
  "resource_packs": ["kid_rp"]
}
```

`status` is `ok` or `failed`; `detail` is the error text the learner sees.
Pack lists hold the directory names under `packs/` that were installed.

## In-game checks

The platform provides `.course/game-check`, an executable that takes a lesson
id, sends `scriptevent course:check <id>` to the learner's server console,
watches the container log for up to twenty seconds for a line containing
`[course] PASS <id>` or `[course] FAIL <id>: reason`, prints that line, and
exits 0 on PASS. `scriptevent course:ping` answers `[course] PASS ping` so the
platform can tell the grader is loaded. The grader is
`course/grader_bp/`; its checks are keyed by lesson id in `scripts/main.js`.
The server must run with content logging to the console enabled, or the
grader's output never reaches the log.

## Solutions

`course/solutions/<id>/step-N/` is an overlay: files at their workspace
paths, copied over the workspace to produce the state after step N. A step
with no overlay directory changes nothing (a check-only step, such as "see it
in the game"). `build-tags` replays the template, then every lesson's
overlays in order, verifying after each step that `lesson check ID --upto N`
passes, and fetches the resulting tags into the target workspace. A solution
that fails its own checks stops the build.

## Lesson ids

Fixed so the grader, the lessons, and the plan agree:
`01-manifest`, `02-resource-pack`, `03-lang`, `04-script`, `05-event`,
`06-event-data`, `07-if`, `08-timer`, `09-variable`, `10-function`,
`11-scoreboard`, `12-item`, `13-item-use`, `14-persist`, `15-quest`.
