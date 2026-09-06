# Lesson format evaluation: MakeCode tutorials vs. alternatives

Research report, 2026-09-06. Feeds the
[project plan](../2026-09-06-guided-course-plan.md). Question: should the
course adopt MakeCode's tutorial Markdown format, as the feasibility brief
proposed, or something else?

## 1. What MakeCode's tutorial format actually is

Source of truth: `microsoft/pxt` docs ([basics](https://makecode.com/writing-docs/tutorials/basics), [control-options](https://makecode.com/writing-docs/tutorials/control-options), [snippets](https://makecode.com/writing-docs/snippets)) and the parser, [`pxtlib/tutorial.ts`](https://github.com/microsoft/pxt/blob/master/pxtlib/tutorial.ts). There is no `/tutorials/validation` page (404); validation is a section of `basics`.

**Generic parts (reusable as an idea, not as a spec):**
- `# Title` on line 1; **`## Step ...` (level 2) is one step**. `### Step` is the legacy form, or the step level when `### @activities true` groups steps under `## Activity` headings. The brief's "`#### Step N`" is wrong; `####` appears only in `#### ~ tutorialhint`.
- Metadata: `### @KEY VALUE` lines at the top (regex `/### @(\S+) ([ \S]+)/`). Documented keys: `@explicitHints`, `@preferredEditor asset`, `@unifiedToolbox`, `@hideIteration`, `@diffs`, `@hideToolbox`, `@hideDone`, `@flyoutOnly` (deprecated).
- Hints: with `@explicitHints true`, hint text is whatever follows `#### ~ tutorialhint` in the step; **without it, "everything after the first ``` section OR the first image is treated as a hint"** (parser comment). Separately, `~hint ... hint~` is an accordion widget for extra text.
- Step flags on the heading: `@showhint` (was `@fullscreen`), `@showdialog` (was `@unplugged`), plus undocumented `@tutorialCompleted` and `@resetDiff` recognised by the parser.
- `~ reminder` / `~ hint` / `~ alert` with `### ~ ... ### ~` are documentation-site callout macros, not tutorial semantics.

**Tied to the MakeCode editor/runtime:**
- `||category:block name||` inline block chips; `:loops:`-style icon bullets; `@boardname@`.
- Fenced sections ` ```blocks ` (restricts the toolbox to those blocks *and* is the hint image), ` ```template `, ` ```ghost `, ` ```customts `, ` ```package `, ` ```blockconfig.local/global ` — all decompiled by the MakeCode TypeScript→Blockly pipeline.
- **Validation**: ` ```validation.global ` / ` ```validation.local ` blocks name validators in skillmap syntax (`# BlocksExistValidator`, `* markers: validate-exists`, `* Enabled: false`). The only documented validator "looks at blocks tagged with `//@validate-exists` or `//@highlight` comments in the answer key and confirms that ... the user's code contains at least one block of the same type. It does *not* validate the parameters." Implementation ([`tutorialValidators.tsx`](https://github.com/microsoft/pxt/blob/master/webapp/src/components/tutorialValidators.tsx), [`runValidatorPlan.ts`](https://github.com/microsoft/pxt/blob/master/pxteditor/code-validation/runValidatorPlan.ts)) calls `getBlocksEditor()` and walks `Blockly.Block[]` — it is block-type presence matching on the live Blockly workspace, not text comparison, and it cannot run outside the MakeCode webapp. Its checks are exactly what a JSON/JS lesson does not need (does a block *exist*), and it cannot express "this manifest's `dependencies[0].version` is `2.9.0`".

**Verdict:** the reusable residue is "one Markdown file, `## Step` headings, metadata lines at top, hint = text after a marker". Everything that makes it a *format* rather than a convention — toolbox restriction, block chips, validation — is Blockly-bound. Adopting it would mean a home-grown parser plus a foreign syntax (`### @KEY`, `#### ~ tutorialhint`, hint-by-position) with no tooling benefit.

## 2. Alternatives

**Plain Markdown + YAML frontmatter + `## Step N` + fenced/hidden check blocks (home-grown).** Zero dependencies, renders in any Markdown viewer including code-server's built-in preview, and the check runner is a ~150-line Python script emitting TAP — the same footprint as `install-packs.py`. The cost is owning the (tiny) spec. Given the checks are static file assertions and the "answer" is a git diff between tags, nothing else in this list adds capability. This is the recommendation.

**CodeRoad** ([docs](https://coderoad.github.io/docs/build-tutorial/)): `TUTORIAL.md` with `## 1. Lesson` / `### 1.1 Task` / `#### HINTS`; `coderoad.yaml` with `testRunner.command`, `args.tap` ("the command arg used to convert test runner output to TAP"), and a **required** `repo.uri`/`branch` on GitHub whose commits are named `INIT`, `1.1` (tests), `1.1S` (solution); `coderoad build` flattens to `tutorial.json`. Conceptually the closest match (TAP, git-per-step). But it is dead: last GitHub release v0.17.2 (2021-11-29), Open VSX 0.19.4 (2022-01-21, engine `^1.39.2`), last push Feb 2023, and it wants the tutorial fetched from a public GitHub remote. Not verified whether it still loads on VS Code 1.13x; do not bet a course on it.

**CodeTour** (`vsls-contrib.codetour`): JSON `.tours/*.tour` files with steps pinned to file/line, rendered as comment-thread bubbles in the editor; steps can run commands. Last release v0.0.59 (2023-03-24 on GitHub; Open VSX lists 0.0.59, engine `^1.60.0`); repo had pushes as recently as 2026-05 but no release. It is available on Open VSX so it installs in code-server. It has no check/verify concept and steps are anchored to line numbers that drift as the learner edits, so it suits "tour a finished codebase", not "edit this file until the check passes".

**Exercism-style directory** ([docs](https://exercism.org/docs/building/tracks/practice-exercises)): `exercises/<slug>/.docs/instructions.md`, `.docs/hints.md`, `.meta/config.json` (`files.solution/test/example`, `blurb`), tests, example solution. Excellent for one-exercise-per-directory with a full test suite and a reference solution, but it has no notion of *steps within an exercise* and no rendered-beside-editor story (Exercism renders on its site). You'd end up adding step headings anyway — i.e. converge on option 1 with extra directories.

**Rustlings/koans** (`rustlings` v6.5.0, 2025-08-21; [`info.toml`](https://github.com/rust-lang/rustlings/blob/main/rustlings-macros/info.toml)): `[[exercises]] name/dir/test/hint` entries, numbered exercise files, a watch loop that re-runs on save and offers `h` for hint, `n` for next; v6 dropped the `// I AM NOT DONE` marker. The *runner* shape (watch → run check → print hint on failure → TAP-ish status) is exactly right and is worth copying into the integrated terminal. The *content* shape (one file per exercise, hint in a TOML sidecar) is too thin for text-first lessons.

**Others, maintained in 2026:**
- **VS Code Walkthroughs** (`contributes.walkthroughs`, [ref](https://code.visualstudio.com/api/references/contribution-points#contributes.walkthroughs)): steps with `media.markdown` and `completionEvents` (`onCommand:`, `onContext:`, `onSettingChanged:`). Ships with the workbench, opens via `workbench.action.openWalkthrough` (has a `toSide` arg). Requires authoring an extension; content is JSON-in-`package.json` plus markdown files; step completion can be driven by a context key your checker sets. Viable as a *renderer*, not a format.
- **Killercoda** ([example](https://github.com/killercoda/scenario-examples/tree/main/kubernetes-2node-multi-step-verification)): `index.json` with `details.steps[{title,text,verify}]`, `intro`/`finish`, `backend.imageid`; `verify.sh` exit-code checks. Clean and close to the need, but runs only on killercoda.com from a linked repo (not self-hostable). Instruqt is the same story, commercial.
- **TutorialKit** (StackBlitz, v1.6.0 2025-09-01, last push 2025-12): `content.md` + `_files/` + `_solution/` per lesson, WebContainers runtime, its own CodeMirror editor. Cannot drive code-server; no checks.
- Jupyter Book / mdBook: renderers only; no per-step checks without custom preprocessors. Not worth it here.

## 3. Rendering beside the editor in code-server

Current code-server is **v4.135.0 (2026-08-27)**, not 4.10x (4.10.0 was Feb 2023). Verified in the [FAQ](https://coder.com/docs/code-server/FAQ):

- `?folder=/abs/path` and `?workspace=/abs.code-workspace` select the workspace; `payload=[["openFile","vscode-remote://<host>/abs/path/file"]]` opens a file (add `["gotoLineMode","true"]` for `:line:col`). Paths must be absolute.
- `vscode://` links target desktop VS Code and do not open code-server; `--open` only launches a browser at startup ([discussion](https://github.com/coder/code-server/discussions/6485)).
- Extensions install from a local file: `code-server --install-extension /path/x.vsix`, or "Extensions: Install from VSIX" — no Open VSX needed. `$EXTENSIONS_GALLERY` can point at a private gallery.

Cheapest to most expensive:
1. **Built-in Markdown preview.** Set `"workbench.editorAssociations": {"lessons/**/*.md": "vscode.markdown.preview.editor"}` in the workspace settings so the lesson opens *as* a preview, then hand the learner `?folder=...&payload=[["openFile","vscode-remote://host/.../lessons/01.md"]]`. No extension. Not verified end-to-end on 4.135, but both halves are stock VS Code. Historical "`markdown.showPreviewToSide` not found" issues (#3686, #4421) were iPad/old-build problems.
2. **Walkthrough via tiny extension** side-loaded as `.vsix`: gives a checklist UI and step completion, but content must be split into per-step markdown files and there is a known race launching walkthroughs from `onStartupFinished` on server builds.
3. **Webview extension**: full control (live TAP status, "show answer" button), same side-load path, most code.
4. **Separate browser pane/iframe** (course site next to code-server): decoupled, but code-server needs `--auth none` or cookie handling inside an iframe; not verified.

Start with 1, run the checker as a rustlings-style watch loop in the integrated terminal, upgrade to 3 if the terminal proves too hidden for the learner.

## 4. Recommendation

One Markdown file per lesson under `lessons/NN-slug.md`, YAML frontmatter, `## Step N:` headings, hints in `<details>`, checks in an HTML comment immediately after the heading (hidden by the preview, adjacent to the step for the author), solutions as git tags. The runner (`bin/lesson`, Python stdlib) parses headings and comment blocks, runs the checks for the current step, prints TAP, and prints the hint on the first failure; `--answer` runs `git diff <step-tag> <solution-tag>`.

**Minimal spec**
- Frontmatter: `id` (slug), `title`, `concept` (one line), `files` (paths the lesson touches), `tags: { step: "lesson/<id>/step-{n}", solution: "lesson/<id>/step-{n}-solution" }` (default pattern; per-step `solution:` key in the check block overrides).
- Step heading: `## Step N: <imperative title>` — N is 1-based and contiguous; the runner fails on gaps.
- Check block: `<!-- check ... -->` containing a list; types `json` (`file`, `path` dotted, one of `equals`/`matches`/`exists`), `regex` (`file`, `pattern`, optional `count`), `exists` (`file`), `cmd` (`run`, exit 0) as escape hatch. Each entry = one TAP line; `not ok` carries the check's `msg`.
- Hint: `<details><summary>Hint</summary>...</details>` inside the step; the runner prints its body on failure.
- Solution marker: none in-file; tags are the contract. `lesson --answer` shows the diff.

(The plan adopts this with one change: check entries are one JSON object per line rather than YAML, so the runner stays stdlib-only.)

**Why it beats MakeCode's:** the check vocabulary is file assertions, which MakeCode cannot express; it renders correctly in the stock preview (MakeCode's `||chips||`, `### @KEY`, `#### ~ tutorialhint` render as junk outside the MakeCode webapp); the parser is a few regexes you own rather than a sub-set of pxt's; and git tags reuse tooling this repo already runs on.

**Example (`lessons/02-script-entry.md`)**
```markdown
---
id: script-entry
title: Make your behavior pack run a script
concept: A behavior pack only runs code if manifest.json declares a script module and an entry file.
files: [packs/hello/manifest.json, packs/hello/scripts/main.js]
---

## Step 1: Declare a script module
<!-- check
{"json": "packs/hello/manifest.json", "path": "modules[1].type", "equals": "script", "msg": "second module must be type script"}
{"json": "packs/hello/manifest.json", "path": "modules[1].entry", "equals": "scripts/main.js"}
-->
Open `packs/hello/manifest.json`. Add a second entry to `modules` with `"type": "script"` and `"entry": "scripts/main.js"`. Give it its own UUID.

<details><summary>Hint</summary>Copy the first module object, change `type` and add `entry`. `uuidgen` in the terminal makes a fresh UUID.</details>

## Step 2: Depend on the server API
<!-- check
{"json": "packs/hello/manifest.json", "path": "dependencies[0].module_name", "equals": "@minecraft/server"}
{"json": "packs/hello/manifest.json", "path": "dependencies[0].version", "equals": "2.9.0", "msg": "version must match what BDS offers"}
-->
Add a `dependencies` array with `@minecraft/server` at version `2.9.0`.

## Step 3: Say hello on load
<!-- check
{"regex": "packs/hello/scripts/main.js", "pattern": "from\\s+\"@minecraft/server\""}
{"regex": "packs/hello/scripts/main.js", "pattern": "console\\.warn\\(", "count": 1}
-->
Create `scripts/main.js`, import `world` from `@minecraft/server`, and log a message with `console.warn` (BDS drops `console.log`).
```

## Couldn't verify
- That `workbench.editorAssociations` + `payload=openFile` opens the preview pane on code-server 4.135 (both features are stock VS Code; the combination is untested here).
- Which VS Code build 4.135.0 bundles (the fetched release text said "1.135.0", plausible given code-server's version scheme but unconfirmed).
- Whether CodeRoad's extension still activates on a 2026 VS Code engine.
- Killercoda self-hosting: no evidence exists; their docs page returned only a title.
