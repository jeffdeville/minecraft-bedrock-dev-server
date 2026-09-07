# Prior art: Bedrock tooling we could adopt instead of building

Research report, 2026-09-07. Question: which existing extensions, schemas,
CLIs and lesson engines could replace or feed `course/bin/lesson` and
`extension/` inside code-server 4.135 (VS Code 1.135, Open VSX only). Every
claim below was checked against a live source today; where I ran the tool
myself it says so. Reads with [FORMAT.md](../../course/FORMAT.md).

Two facts frame everything:

- **Neither Mojang's nor Blockception's extension is on Open VSX.** The Open
  VSX API returns 404 for `mojang-studios.minecraft-debugger` and
  `blockceptionltd.blockceptionvscodeminecraftbedrockdevelopmentextension`,
  and a registry search for "blockception" is empty. Both publish a `.vsix`
  on GitHub releases, so both are installable, but only by side-loading in
  `platform/code-server/Dockerfile`.
- **The editor-time wins are mostly data, not extensions.** VS Code's built-in
  JSON and TypeScript language features already do schema squiggles, hover
  help and "did you mean `playerSpawn`?"; they just need a schema set and a
  typings file in the workspace skeleton. That is the cheap half of this
  report. The extension-shaped tools add cost and marginal value for three
  JSON files and one script.

## Verdicts

| Tool | Gives us | Open VSX | Maintained | Verdict |
|---|---|---|---|---|
| **Blockception JSON schemas** ([repo](https://github.com/Blockception/Minecraft-bedrock-json-schemas)) | Red squiggles + hover docs in `manifest.json`, `items/*.json`, `item_texture.json`, `languages.json`, `dialogue/*.json` via built-in JSON support | n/a (data) | commit 2026-09-04; BSD-3/CC-BY-4.0/MIT | **Adopt** (vendor into the skeleton) |
| **`@minecraft/server` typings 2.9.0** ([npm](https://registry.npmjs.org/@minecraft/server)) + `jsconfig.json` `checkJs` | Autocomplete, inline docs, "Did you mean 'playerSpawn'?", wrong-type arguments, removed 1.x APIs flagged | n/a (data) | Mojang, tracks each release; MIT | **Adopt** |
| **ESLint extension** `dbaeumer.vscode-eslint` 3.0.34 + core `no-restricted-syntax` | Our four JS rules (top-level `world.`, `beforeEvents`, `console.log`) as live squiggles with our own wording | **Yes** (2026-07-17, MIT, 264 KB) | Microsoft | Adopt later (only if TS squiggles prove not enough) |
| **Blockception extension** 9.1.17 ([marketplace](https://marketplace.visualstudio.com/items?itemName=BlockceptionLtd.blockceptionvscodeminecraftbedrockdevelopmentextension), [monorepo](https://github.com/Blockception/minecraft-bedrock-language-server)) | Language server: `.lang` diagnostics, dynamic completions, mcfunction, molang; bundles the schemas above | No; `vscode-extension.vsix` 2.2 MB on GitHub release v0.0.53 (2026-09-07) | Weekly releases; BSD-3 | Adopt later; trial only after memory is measured |
| **Minecraft Bedrock Debugger** 1.55.0 ([repo](https://github.com/Mojang/minecraft-debugger)) | Breakpoints against BDS, live diagnostics graphs, profiler | No; `minecraft-debugger-1.55.0.vsix` 1.4 MB on GitHub (2026-08-29) | Mojang, monthly; MIT | Adopt later (a "watch it stop" lesson, not the first 15) |
| **`@minecraft/creator-tools` CLI** 0.17.8 ([npm](https://www.npmjs.com/package/@minecraft/creator-tools)) | Pack-wide validation, JSON/CSV/HTML reports | n/a | Mojang, 2026-08-28; MIT; 292 MB installed, Node 22+ | **Skip** as a gate: it missed every silent failure I planted (ran it, see §3) |
| **`@minecraft/bedrock-schemas`** 1.26.20-beta.21 ([npm](https://registry.npmjs.org/@minecraft/bedrock-schemas), [repo](https://github.com/Mojang/bedrock-schemas)) | Official schemas + TS types | n/a | Mojang, commit 2026-08-21; MIT; beta | **Skip for now**: three schemas are wrong for our files (§2) |
| **Rockide** 0.7.0 ([extension](https://open-vsx.org/api/rockide/rockide-vscode), [Go LS](https://github.com/rockide/language-server)) | Completions, go-to-definition, rename; 1.8 MB Go binary | **Yes** (2026-07-01, MIT) | One author, pushed 2026-09-04, "WIP", diagnostics "planned" | Watch; not yet |
| **Bedrock Definitions** 2.0.8 ([marketplace](https://marketplace.visualstudio.com/items?itemName=destruc7i0n.vscode-bedrock-definitions)) | Go-to-definition across entity/animation/geometry ids | No | 2026-08-31 | Skip: aimed at entity work we do not teach |
| **Craftpad** 0.6.0 (Craftverse) | "DX and AI toolkit" | Yes (2025-07-21) | Stale a year | Skip |
| **Minecraft Creator Tools VS Code extension** | — | — | Does not exist; Creator Tools is a website + CLI (+ an MCP server) | — |
| **bridge.** v2.7.54 ([repo](https://github.com/bridge-core/editor), [docs](https://bridge-core.github.io/editor-docs/getting-started/)) | Tree editor that "can't make syntax errors" | n/a (PWA/Tauri, GPL-3) | 2025-12-20 stable; v3 pre-releases stalled mid-2024 | Skip: edits the learner's local disk, not our server workspace |
| **CodeTour** ([Open VSX](https://open-vsx.org/api/vsls-contrib/codetour)) | Step-by-step tours | Yes, but 0.0.59 from 2022; last GitHub release 2023 | Dormant | Skip |
| **VS Code Walkthroughs API** ([docs](https://code.visualstudio.com/api/references/contribution-points#contributes.walkthroughs)) | Built-in checklist UI with `completionEvents` | built in | Microsoft | Skip for lessons (no file-content events); optional for the skeleton tour |
| **VSCode4Teaching** ([repo](https://github.com/codeurjc-students/2019-VSCode4Teaching)) | Teacher/student exercise sync | No | Last push 2025-01-18; needs a Spring Boot server; teacher review, no auto-check | Skip |

Also on Open VSX and Bedrock-specific but marginal for us: `Tomocraft.mcbe-command-checker` 1.0.9 (command syntax, could help the lesson-15 `/scriptevent` button) and `smell-of-curry.mcbe-translate-viewer` 0.1.0 (inline `.lang` strings). Neither was evaluated further.

## 1. What to add to the workspace skeleton (the two "adopt" items)

### 1a. Blockception schemas through VS Code's built-in JSON support

Verified today with ajv against the raw schemas (`unicodeRegExp:false`, which mirrors the JSON language service's non-unicode fallback; the manifest schema has a `\_` escape that a strict `u`-flag engine rejects):

| Planted mistake | Blockception manifest/items/languages schema | Our checker |
|---|---|---|
| `header.uuid` still `{{BP_HEADER_UUID}}` | squiggle: must match UUID pattern | `json.uuid` |
| `uuid` and `module_name` on one dependency | squiggle: no additional properties | `json.absent` |
| module `type: "scripts"` | squiggle: must be one of resources/data/... | `json.equals` |
| `languages.json` is an object, or `"en-us"` | squiggle | `json` |
| `max_stack_size: "1"` | squiggle: must be number | — |
| dependency version `1.5.0` | **passes** | `json.matches` |
| script module without `entry`, `entry` wrong case | **passes** | `json.exists`, `exists` |
| `min_engine_version` missing | **passes** | `json.exists` |
| header uuid equals module uuid | **passes** | `differs` |
| `identifier: "minecraft:wand"` or `"wand"` | **passes** | `json.matches` |
| `components: {}` or `minecraft:icn` typo | **passes** | `json` |

So the schemas remove the "you typed the wrong shape" class while typing, with real messages and hover text from `description` fields (VS Code shows `description`/`markdownDescription` on hover and in completion, per the [JSON docs](https://code.visualstudio.com/docs/languages/json)). They do not catch any of the cross-file or version pitfalls in the lesson-sequence report §4; those stay ours.

Integration:

- Vendor five files from the repo `main` branch into `course/templates/workspace/.course/schemas/` (`general/manifest.json`, `behavior/items/items.json`, `resource/textures/item_texture.json`, `language/languages.json`, `behavior/dialogue/dialogue.json`), 30-48 KB each, with the repo LICENSE beside them (CC-BY-4.0 needs attribution). Pin a commit; the repo publishes a `vscode-settings.json` with 106 entries and `raw.githubusercontent.com` URLs, which we should not use because the box must not fetch at runtime.
- `.vscode/settings.json` additions:

```json
"json.schemaDownload.enable": false,
"json.schemas": [
  {"fileMatch": ["packs/*/manifest.json"], "url": "./.course/schemas/manifest.json"},
  {"fileMatch": ["packs/*/items/*.json"], "url": "./.course/schemas/items.json"},
  {"fileMatch": ["packs/*/textures/item_texture.json"], "url": "./.course/schemas/item_texture.json"},
  {"fileMatch": ["packs/*/texts/languages.json"], "url": "./.course/schemas/languages.json"},
  {"fileMatch": ["packs/*/dialogue/*.json"], "url": "./.course/schemas/dialogue.json"}
]
```

  `.course` is already in `files.exclude`, so the learner never sees the schemas. Plain `.json` files stay in `json` mode, where VS Code already marks `//` comments and trailing commas as errors, matching the checker's strict parse.
- Note that the skeleton sets `"editor.quickSuggestions": {"other": "off"}`: schema completions and typings completions then only appear on Ctrl+Space. Decide whether that stays.

Why not Mojang's `@minecraft/bedrock-schemas`: I installed it. `latest` is `1.26.20-beta.21` (the `1.26.40-beta.26` the registry page shows is the `beta` tag). Its `schemas/bp/manifest/index.schema.json` is only the *header* object (`$id: pack/behavior_pack_header_json`, no `required`), so it validated all nine bad manifests. Its `rp/texts/languages.schema.json` is `type: object` with properties `"0"`, `"1"`, so the correct `["en_US"]` fails. Its `rp/textures/item_texture.schema.json` requires `textures` to be an array, so our own skeleton's `"textures": "textures/items/wand"` would get a red squiggle. Re-check when a non-beta 1.26.40 is published; Creator Tools depends on this package, which explains one of its false positives below.

### 1b. `@minecraft/server` typings with `checkJs`, no `node_modules`

Verified today with TypeScript 7.0.2 (`baseUrl` no longer exists; use relative `paths`). Layout:

```
.course/types/@minecraft/server/index.d.ts   (752 KB, from npm @minecraft/server@2.9.0, MIT)
.course/types/console.d.ts                   declare const console: { warn(...d: unknown[]): void; error(...d: unknown[]): void; log(...d: unknown[]): void }
jsconfig.json
```

```json
{
  "compilerOptions": {
    "module": "es2022", "target": "es2022", "moduleResolution": "bundler",
    "checkJs": true, "noEmit": true, "lib": ["es2022"], "types": [],
    "paths": {"@minecraft/server": ["./.course/types/@minecraft/server/index.d.ts"]}
  },
  "include": ["packs/**/*.js", ".course/types/**/*.d.ts"]
}
```

What the learner sees, verbatim from `tsc` on a file with the mistakes we care about:

- `world.afterEvents.playerspawn` → `Property 'playerspawn' does not exist on type 'WorldAfterEvents'. Did you mean 'playerSpawn'?` (TS2551). Same for `player.sendmessage`.
- `world.afterEvents.worldInitialize` → `Property 'worldInitialize' does not exist` (the 1.x API is simply absent from 2.9.0; there are zero `@deprecated` tags in the file, so removed APIs show as unknown, not struck through).
- `world.sendMessage(ev.player)` → `Argument of type 'Player' is not assignable to parameter of type 'string | (string | RawMessage)[] | RawMessage'`. Correct, not kid-readable.
- `system.runInterval(cb, "100")` → `Argument of type 'string' is not assignable to parameter of type 'number'`.
- `world.sendMessage()` → `Expected 1 arguments, but got 0`.
- Knock-on: after a misspelt event, the callback parameter gets `Parameter 'ev' implicitly has an 'any' type` (TS7006) — a second squiggle the learner did not cause. Without `console.d.ts`, every `console.warn` gets `Cannot find name 'console'... Try changing the 'lib' compiler option to include 'dom'`, which would mislead.
- **Not seen**: `world.sendMessage("…")` at module top level. TypeScript has no notion of early execution. `console.log` is also fine to TypeScript. Both remain the checker's `js` rules (or ESLint's, below).

Add one line to the extension's step panel saying "a red underline in the code is the editor's guess; the panel below is the lesson's answer", because TS messages will sometimes outrun ours.

### 1c. ESLint (adopt later)

`dbaeumer.vscode-eslint` is on Open VSX and is a workspace extension, so it runs in code-server's extension host. Mojang's `eslint-plugin-minecraft-linting` 2.0.12 (2026-01-16, MIT) exports **one rule**, `avoid-unnecessary-command` ("use the API instead of `runCommand`"); it pulls in `typescript` and `@typescript-eslint/*` (30 MB) for that. There is no `@minecraft/eslint-plugin` or `@minecraft/eslint-config` on npm. `@minecraft/core-build-tasks` 5.7.0 is a just-scripts/esbuild/api-extractor bundle for TypeScript projects: irrelevant to plain-JS lessons.

The rules we want need no plugin. Verified with ESLint 10.10.0 and core `no-restricted-syntax`:

```js
// eslint.config.mjs in the workspace
export default [{ files: ["packs/**/*.js"],
  languageOptions: { ecmaVersion: 2022, sourceType: "module" },
  rules: { "no-restricted-syntax": ["error",
    { selector: "Program > ExpressionStatement > CallExpression[callee.object.name='world']:not([callee.property.name='subscribe'])",
      message: "world.… can only be used inside a subscribe or run block, not at the top of the file" },
    { selector: "MemberExpression[property.name='beforeEvents']", message: "beforeEvents is read-only; use afterEvents" },
    { selector: "MemberExpression[object.name='console'][property.name='log']", message: "the game throws console.log away; use console.warn" }
  ]}}];
```

Output on the sample: four errors, each with our sentence. Cost: `eslint` + deps in the workspace (or one shared install with `eslint.nodePath`), one Node process per learner, and a third source of underlines. Given TS already covers most, add this only if the js-rule fails in `events.jsonl` show learners hitting `js.top_level`/`js.console_log` repeatedly before the panel explains it.

## 2. The extensions: what they would add over the data

**Blockception 9.1.17** (`extensionKind: workspace`, engine `^1.120.0`, main `./lsp/client.js`, depends on `bc-minecraft-lsp`). Its `contributes.jsonValidation` points at bundled `./minecraft-bedrock-schemas/...`, so it works offline and gives the same squiggles as §1a plus `.lang` diagnostics, dynamic JSON completions (existing identifiers), mcfunction and molang support, cheat sheets and a language-model tool. All of that is toggleable (`BC-MC.Diagnostics.Enable/Lang/Json/Mcfunctions/Objectives/Tags`, `BC-MC.Completion.JSON`, `BC-MC.Completion.Lang.Dynamic`). What it adds for lessons 1-15 is essentially `.lang` linting and identifier completion in `item_texture.json`; what it costs is a Node language server per learner whose memory I could not measure, `.mcattributes`/`.mcdefinitions` project files it will offer to generate, and activation on every JSON file. Trial recipe if wanted: pin the GitHub release asset, verify a checksum, `code-server --install-extension vscode-extension.vsix` in the Dockerfile next to `redstone-course.vsix`, ship `BC-MC.Diagnostics.Mcfunctions/Objectives/Tags: false` in settings, and measure RSS with two workspaces open before deciding.

**Minecraft Bedrock Debugger 1.55.0** (`minecraft-js` debug type, activates `onDebug`, engine `^1.93.0`). BDS support is documented: set `allow-inbound-script-debugging=true` (and optionally `force-inbound-debug-port`) in `server.properties`, run `script debugger listen 19144` on the console, and use `"mode": "connect"` in `launch.json` ([Learn](https://learn.microsoft.com/en-us/minecraft/creator/documents/scripting/developer-tools)). Our platform already has a console channel to the container, so the port is reachable from the code-server container. Whether the debug adapter and the live-diagnostics webview behave inside code-server I could not verify without a running box; nothing in `package.json` marks it `ui`-only. Value: a lesson after 15 ("stop the world on a breakpoint and look at `ev.player.name`"), and the diagnostics graphs for the parent. Not for the first course.

**Rockide** is the only current Bedrock language tool published on Open VSX. The extension resolves its binary via `rockide.path`, then `PATH`, then prompts to download from `github.com/rockide/language-server/releases` (SHA-256 checked) — so for our image, drop `rockide_0.4.0_linux_amd64.tar.gz` (1.8 MB) into the image and set `rockide.path`. Features today are completions, definitions, rename and embedded mcfunction/molang; "project diagnostics" is on the roadmap, so it does not yet give squiggles. One maintainer, four stars. Revisit in six months.

## 3. Creator Tools CLI: measured, and not the gate we hoped

Installed `@minecraft/creator-tools@0.17.8` (12 s, 292 MB in `node_modules`, Node 22+) and ran it on a two-pack project with five planted silent failures: script `entry` pointing at `scripts/mian.js`, dependency `"1.5.0"`, `world.sendMessage` at module top level, `minecraft:icon` `wnad` versus atlas key `wand`, lang key `item.kid:wnd`. Results, `main` and `all` suites identical, 1.4 s wall clock, exit code 4:

- Caught: missing `pack_icon.png` (error, the only failure), an unreadable PNG (warning).
- Missed: all five plants. Script Modules "completed successfully" with an *Info* line "dependency on 1.5.0 at @minecraft/server"; Texture Validation and Script passed; the lang key was never compared to the item.
- False positive: `item_texture.json` `"textures": "textures/items/wand"` → Warning "string value found, but a array is required" (from the Mojang schema bug above; the game accepts strings and our skeleton uses one).

The grammar is `mct validate [main|addon|currentplatform|all] -i DIR -o OUT`; there is no `-ot` flag in 0.17.8 despite what third-party docs say. `-o` writes `proj.mcr.json` (compact: `{"iTp": 4, "gId": "JSON", "gIx": 192, "p": "/kid_rp/textures/item_texture.json", "d": "…"}`; `iTp` 3/4 are fail/error), `proj.csv` (with readable messages) and `proj.report.html`. The [rules index](https://learn.microsoft.com/en-us/minecraft/creator/reference/content/mctoolsvalreference/validationrulesindex) lists 35 manifest, 18 min-engine-version and 6 script-module rules, but they are aimed at marketplace packaging (icons, sizes, path lengths, forbidden files, naming), not at the mistakes a first-time author makes. Verdict: not worth 292 MB in the image or a second set of messages. If the owner wants it for the *author*, run it on a laptop against `course/templates/workspace` when the template changes.

## 4. JSON editing help for kids, and the lesson-engine question

VS Code's built-in JSON mode already gives bracket matching, comment/trailing-comma errors, schema squiggles and hover descriptions; with §1a there is nothing to add. bridge.'s tree editor is exactly the "cannot make a syntax error" idea, but bridge. v2 is a Chromium PWA that opens a folder on the learner's own device through the File System Access API, so its output never reaches `packs/` on our box; the desktop build is Tauri, GPL-3, and there is no VS Code embedding. `editor.bridge-core.app` sends no `X-Frame-Options`/CSP header, so it could be linked from a lesson as a sandbox, nothing more. Anything tree-shaped for our three files would be built into our own extension's webview (a form for the `en_US.lang` line, say), which is deliberately out of scope here.

Lesson engines: nothing new in 2026 renders steps beside the editor *and* checks file content. Walkthroughs' `completionEvents` are `onCommand`, `onLink`, `onView`, `onSettingChanged`, `onContext`, `extensionInstalled`, so the only way to mark a step done on a file check is our extension firing `onCommand`/`onContext` itself, which is more plumbing than our panel, with less control of wording. CodeTour on Open VSX is a 2022 build. VSCode4Teaching needs a Spring Boot server and does teacher review, not checks. Our extension stays.

## 5. What the checker still owns

Everything lesson-shaped: which file and which step; `same`/`differs` across item JSON, atlas, lang and the string literal in `main.js`; `uuid` placeholder and reuse; `entry` existence with exact case; dependency version `^2`; `min_engine_version`; the early-execution and `console.log` rules (unless ESLint is added); the fence-line message; the `broken` block that keeps a learner on their step when a file stops parsing; every `msg`; `deploy` and `game`. The editor-side tools only shorten the loop for the shape mistakes and misspelt API names, and they do it while typing rather than on save.

## 6. Risks

- **Memory on a 4 GB box, two learners.** Per workspace: tsserver for one JS file with a 752 KB `.d.ts` (unmeasured; set `"typescript.tsserver.maxTsServerMemory": 512` as a ceiling), the JSON language server (small), plus ESLint (~one Node process) and the Blockception server if adopted. code-server itself is one Node process per connection. Measure before adding the second and third extension; the data-only items add nothing resident beyond tsserver.
- **Network during image build only.** GitHub release assets for any `.vsix` and Open VSX for ESLint: pin versions and check SHA-256 in the Dockerfile. At runtime nothing fetches: `json.schemaDownload.enable: false`, typings and schemas vendored, Rockide (if ever) pre-placed via `rockide.path`.
- **Licences.** Blockception extension and schemas BSD-3 (schemas repo also CC-BY-4.0 and MIT; keep the LICENSE file next to the vendored copies); Mojang typings, debugger, CLI and schemas MIT; bridge. GPL-3 (not shipped).
- **Confusing a twelve-year-old.** Blockception's item schema allows unknown component names, so there is no wall of squiggles, but no catch either; TS's knock-on `implicitly has an 'any' type` and type-union messages are correct and unreadable; the Mojang schema package would underline correct files. The panel's message must be the last word; keep the Problems panel closed by default and let the underline plus hover be the editor's whole contribution.
- **Version drift.** Typings must be replaced when the server's BDS version moves (`update-bds.sh` changes the `@minecraft/server` stable); schemas are `main`-branch snapshots, so pin the commit in a comment and refresh with the typings.

## Not verified

Blockception language-server memory; the debugger and its webview inside code-server; VS Code's exact regex fallback for the `\_` escape in Blockception's manifest schema (ajv needed `unicodeRegExp:false`); Rockide's validation quality; the TypeScript version bundled in VS Code 1.135 (the `jsconfig.json` above avoids `baseUrl`, so it should work on 5.x through 7.x); Windy's debugger fork (marketplace page 404 today); whether `Tomocraft.mcbe-command-checker` handles `/scriptevent`.
