# Side quest: a Code Kingdoms-style guided course for Bedrock

Status: research brief, 2026-09-06. This is a side quest. The main path is the
[learning track](./learning-track.md). Nothing here should be built
before the learner has finished Lesson 0 and Step 1 the ordinary way.

## The idea

Code Kingdoms taught Java modding through tiny projects, each teaching one
concept, each split into short video vignettes alternating with a small task,
with code deployed to a live server the moment it was saved. We already have the
last part: `bin/sub dev` plus the watched-folder loop in
`~/projects/minecraft-server` puts a saved pack into the running Vultr world in
about fifteen seconds. The question is whether the rest can be built cheaply for
Bedrock, where nothing like it exists.

## Verdict

Feasible in a weekend as a text-first prototype. Videos are the expensive part
and the least valuable for one learner; do them last, if at all. No off-the-shelf
Bedrock course engine exists, so the build is a thin git-and-Markdown convention
plus a checker, not a product.

## Recommended prototype stack

1. **Editor: code-server in the browser.** Run it on the Vultr box next to the
   Bedrock server, or in Crostini. On the server is simpler: the repo, the
   checker, the watched deploy folder, and the world are then on one machine,
   and the Chromebook only needs Chrome and the Android Minecraft client. Full
   VS Code inside Crostini works on 8 GB Chromebooks but is slow on 4 GB. If
   code-server runs in Crostini, open it at `penguin.linux.test:PORT`, not
   `localhost`.
2. **Lesson format: MakeCode-style Markdown.** One `LESSON.md` per lesson with
   `## Step N` headings, a hidden hint block per step, and the check declared
   inline. MakeCode's tutorial format is the template to copy:
   https://makecode.com/writing-docs/tutorials/basics
3. **Stepping: git tags.** `lesson-3-step-2` and `lesson-3-step-2-solution`. A
   small `sub lesson 3 2` command checks out the step; `git diff` between the
   two tags is the "show me the answer" button. This is what CodeRoad does
   internally and is about thirty lines of shell.
4. **Checking: a Python script that prints TAP.** `ok 1 - item has identifier
   sub:scanner`, `not ok 2 - icon key missing from item_texture.json`. Static
   JSON checks cover most steps and need no game running. Mojang's Creator
   Tools validator can be shelled out to for schema checks:
   https://learn.microsoft.com/en-us/minecraft/creator/documents/mctoolsoverview
5. **In-game checks for milestones only.** A tiny grader behavior pack listens
   for `scriptevent nautica:check <lesson>`, which the checker pipes into the
   server console. The grader inspects world state and prints a `PASS` line the
   checker greps from the server stdout. Player-triggered checks work the same
   way: the grader watches an interaction or scoreboard and prints `PASS`.
   Reference: https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/scripteventcommandmessageafterevent
6. **One payoff GIF per lesson.** Thirty to sixty seconds of the moment it works
   in game, recorded with VHS for terminal moments or Playwright's video
   recording against code-server for editor moments. Skip narration.

## What was evaluated and set aside

- **CodeRoad** (VS Code extension: tutorial as a git repo, commits per step,
  TAP test runner) is the closest existing engine and is unmaintained since
  2022. Try it for an hour on code-server; drop it if it fights current VS Code.
- **CodeTour** works on code-server and is good for read-only "walk this file"
  tours. It has no checkpoints, so it is a garnish, not the engine.
- **VS Code Walkthroughs API** cannot validate file contents without a custom
  extension.
- **vscode.dev and github.dev** have no terminal and cannot reach the server.
- **GitHub Codespaces** has a free tier of 120 core-hours a month but cannot
  reach the server without a Tailscale join. Extra auth friction for a kid.
- **CodaKid, Tynker, Minecraft Education Code Builder** are Java or Education
  Edition, not Bedrock add-ons. No Bedrock equivalent of Code Kingdoms exists.

## Automated narrated videos, if wanted later

Pipeline: Markdown script with `narrate` and `type` blocks, Kokoro TTS renders
each narration to WAV locally (Apache-2.0, natural voices, CPU is fine),
Playwright types into code-server with the recorder on and sleeps to match the
audio, ffmpeg muxes. About a weekend to build, then roughly fifteen minutes per
vignette, and a full re-render whenever the lesson text changes. Known traps:
editor autocomplete swallowing typed characters (disable quick suggestions in a
dedicated profile) and timing drift. Paid TTS is cheap at this scale; an entire
course is well under one million characters, so the case for local is iteration
speed, not cost. Cloud services that do this from a JSON action script exist
(CodeVideo) at roughly fifty dollars a month.

## Top risks

1. **Content, not tooling.** Code Kingdoms worked because the lessons were
   tight and tested on kids. The scaffold is a weekend; each good lesson is
   hours of authoring and a real test with the learner.
2. **In-game check flakiness.** Server restarts and log parsing make in-game
   checks slower and less deterministic than JSON checks. Keep them for
   milestones.
3. **Engine rot.** The only existing engine is abandonware. Plan on the
   git-plus-TAP path from the start.

## What Code Kingdoms actually did

Course, then chapter. A chapter was one narrated screen-capture video (a
Twitch-style demo in game, then in the editor, with built-in pauses) beside the
editor, followed by one small code task. A chapter completed only when the
editor's check passed, and the check was strict: `oncreate` instead of
`OnCreate` failed. Each chapter unlocked the code blocks for the next one, with
upcoming blocks shown faded. Rescue was two-level: request a hint, or "skip",
which set the code to exactly what the video wrote. Blocks and Java text were
the same code behind a toggle. Run compiled server-side and pushed the mod to
the kid's own private whitelisted server; an infinite loop crashed it and a
Restart button fixed it. Onboarding was "Minute Mods", single-effect wins, then
one minigame per course.

The company still sells the product in 2026 but looks lightly maintained after
two acquisitions, with outage and support complaints through mid-2026.

What parents praised: a first mod in minutes, a visible result in a game the kid
loves, real Java from day one, and kids motivated to debug because they wanted
their mod to work. What they criticized: the brittle exact-match check turned
the parent into the debugger and made kids quit when later projects broke;
limited creative latitude inside pre-built worlds; a twelve-year-old found the
videos pitched young.

Exact video lengths, the full course list, and deploy latency were not
documented anywhere reachable and remain unverified.

## Design lessons to steal

1. Step size is one edit. Instruction and editor on one screen, instruction
   pauses at each step.
2. Check completion automatically, but forgivingly. Tolerate case, whitespace,
   and naming, and explain the difference. Strictness was the top complaint.
3. Restrict what is available per chapter and unlock as you go, so the kid
   never faces the whole API.
4. Two-level rescue: a hint, then "set my code to the solution for this step"
   (our `git diff` between step and solution tags).
5. One click to live on the kid's own server, and crash recovery is a button.
   We have this already.
6. Open with single-effect wins, then one small playable thing per course.
7. Design for solo testing at home; there are no classmates on the server.
8. Give creative latitude inside the step: "make the message say what you want"
   beats "type exactly this".
