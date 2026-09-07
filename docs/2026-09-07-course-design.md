# Course design: the rewrite

2026-09-07. Written against `course/FORMAT.md` as rewritten today, the
[review of lessons 1 to 5](reviews/2026-09-07-lesson-review-01-05.md), the
[research report](research/2026-09-06-bedrock-lesson-sequence.md) and
`docs/learning-track.md`. This is the design the lessons get written from
in the next pass; it is not lesson text. The skeleton it describes is
committed under `course/templates/workspace/` and was rendered through
`course/bin/new-workspace` and `bin/install-packs.py` to confirm it produces
five distinct UUIDs, a valid BP→RP link, and two activated packs.

Everything the lessons assume about the phone or the server is marked
**verified** (a document I read, cited in section 6) or **assumed** (my
Bedrock knowledge; check it on the parent's phone before the lesson ships).

---

## 1. The learner and the session

- About twelve. Knows Minecraft deeply (creative, commands, redstone, add-ons
  as a player); has never programmed, never used a terminal or a code editor.
- Chromebook, browser VS Code, the lesson in a 300-pixel side panel, files
  autosave a second after typing stops; the phone (Android Minecraft) beside
  the Chromebook, joined to their own server.
- Sessions of 45 to 60 minutes, mostly alone, a parent nearby sometimes. One
  lesson per session; a good session ends with something new in the game.
- The session shape from the learning track, now built into every lesson:
  predict (the Idea's **Predict:** line), make (the steps), play (the payoff
  step), say it back (**Say it back:**), vary (**Try this:**).
- Motivated by seeing the game change; demotivated by a red box that does
  not say why. So: no lesson without a payoff, no check without a sentence
  in their words.

---

## 2. The skeleton

`course/templates/workspace/` after this pass. Everything under `packs/`
loads on BDS 1.26.x with `@minecraft/server` 2.9.0 as is. The placeholders
are FORMAT.md's standard variables; `new-workspace` renders them once per
workspace.

```
.gitignore                         unchanged (.course/)
.vscode/settings.json              unchanged
README.md                          one paragraph: the two halves, start with 00-tour, autosave, the status bar
assets/
  dirt.png                         16x16 RGB: pink checker. Lesson 02 copies it to kid_rp/textures/blocks/dirt.png
  gem.png                          16x16 RGBA: a cut gem. Lesson 12 copies it to kid_rp/textures/items/gem.png
  pack_icon.png                    64x64 RGB: orange with a star. A second icon, different from the packs' own, for the optional icon lesson
packs/kid_bp/
  manifest.json                    format_version 2; header name "My Pack", uuid {{BP_HEADER_UUID}}, version [1,0,0], min_engine_version [1,26,0];
                                   modules: data {{BP_DATA_UUID}} and script (javascript, entry scripts/main.js, {{BP_SCRIPT_UUID}});
                                   dependencies: {uuid {{RP_HEADER_UUID}}, [1,0,0]} and {@minecraft/server "2.9.0"}
  pack_icon.png                    64x64 RGB: blue with a white K
  scripts/main.js                  three comment lines; import { world, system, DisplaySlotId }; one playerSpawn handler that
                                   world.sendMessage("My Pack is on!") (see 2.1 for why)
  items/wand.json                  format_version "1.26.40"; identifier kid:wand; menu_category items; components: minecraft:icon "kid:wand",
                                   minecraft:max_stack_size 1
packs/kid_rp/
  manifest.json                    format_version 2; header name "My Pack (looks)", uuid {{RP_HEADER_UUID}}, [1,0,0], min_engine [1,26,0];
                                   one module resources {{RP_MODULE_UUID}}
  pack_icon.png                    64x64 RGB: green with a white K
  texts/en_US.lang                 one line: item.kid:wand=Wand
  texts/languages.json             ["en_US"]
  textures/item_texture.json       resource_pack_name kid_rp, texture_name atlas.items, texture_data { "kid:wand": {"textures": "textures/items/wand"} }
  textures/items/wand.png          16x16 RGBA: a stick with a star
```

Decisions and why:

**The wand is in the skeleton, fully wired.** Lesson 13 (item use) must not
require lesson 12 (make an item), so an item the code can react to has to
exist on day one. It also gives the tour a second payoff (`/give @s
kid:wand`, a real item with a picture and a name, in the first five
minutes) and lesson 12 a worked example to imitate: "make a second one" is
the honest version of "an item is four files that agree", because the
learner types the identifier in every one of them.

**`system` and `DisplaySlotId` are imported from the start.** Unused imports
are harmless; a lesson that had to edit the import line would add a whole
class of mistakes (a missing comma inside braces, a lost quote) to a lesson
about something else. No lesson touches line 4 of `main.js`.

**The handler is written on two lines**, `world.afterEvents.playerSpawn`
then `  .subscribe((event) => {`, because the one-line form is 52
characters and scrolls sideways in the panel (FORMAT: 44). Every handler the
lessons paste uses the same shape, so "copy the hello block and change the
event name" is literally true. This needs one checker behaviour, listed in
section 8: the top-level `world.` rule must look at statements, not lines.

**The `.lang` key is `item.kid:wand=Wand`**, the form Bedrock Wiki's custom
item guide uses (**verified**, section 6). Microsoft Learn's older tutorial
uses a `minecraft:display_name` component instead. This is the first thing
to confirm on the live server: `/give @s kid:wand` must show "Wand" above
the hotbar. If it shows `item.kid:wand`, add
`"minecraft:display_name": {"value": "Wand"}` to `wand.json` and the lesson
12 lang step becomes a `display_name` step.

**`format_version` "1.26.40" on the item** follows the wiki; BDS accepts a
file whose format version is at or below the running game. If a learner
server was pinned before 1.26.40, lower it to that version. Items with an
empty `components` object fail to register on recent versions (research
pitfall 6), which is why `max_stack_size` is there even though it does
nothing interesting.

**Icons are placeholders.** All six PNGs are generated by the script in
appendix A (stdlib only). An artist can redraw `wand.png`, `gem.png`,
`dirt.png` and the three icons at the same sizes; the names are what the
lessons depend on. `dirt.png` should stay loud (the point of lesson 02 is
that dirt is obviously different everywhere).

### 2.1 Should `main.js` start empty or with a hello?

With a hello. Three reasons, one against.

For: (1) The golden rule for the tour: with a hello, joining the world on
day zero already shows the pack's voice in chat, and the deploy's
`scripts_ok` proves the script loaded. An empty file proves nothing the
learner can see. (2) Worked examples first (Sweller, Rosenshine): the first
code lesson is "change the words" on a complete, working handler; the second
is "copy this shape and change the event name"; only from the third on do
they build on the data inside. That is a faded worked example, and it beats
asking a first-time programmer to type `world.afterEvents.playerSpawn
.subscribe((event) => {` as their first line. (3) Loss is a signal: when
the file breaks later, the hello disappearing tells the learner something
is wrong before any check does.

Against: lessons 03, 05, 06, 07 and 10 all edit the same handler, so their
solution overlays for `main.js` overlap. Section 8 says how the overlays
must be built (cumulatively, in lesson order) so "write the answer" stays
sane.

### 2.2 What `assets/` is for

Only pictures the lessons ask the learner to copy into place: `dirt.png`
(lesson 02), `gem.png` (lesson 12), `pack_icon.png` (optional icon lesson).
Nothing else; a folder of unexplained files is reading load.

---

## 3. The skeleton tour: lesson `00-tour`

**Recommendation: a lesson, not the README.** The README is one paragraph
that points at it (FORMAT's contract for `README.md`). Reasons: the panel is
where the learner lives, and the first thing they do should produce the first
green tick; the tour's payoff is real (chat says "My Pack is on!", a Wand in
hand) and checkable; and the parent script has somewhere to hang. A README
in the file tree is opened by nobody under thirteen.

It is a check-only lesson (no edits, so no solution overlays), five to ten
minutes, three steps:

| Step | What the learner does | Check |
|---|---|---|
| 1. Find the two halves | Opens `packs/kid_bp/scripts/main.js` and `packs/kid_rp/texts/en_US.lang` and reads the one line the Idea points at in each. The text says what each folder is: `kid_bp` (code, items), `kid_rp` (pictures, names), `assets` (pictures to copy), `lessons`. It names the status bar and says "files save themselves". | `deploy: ok`, `behavior_packs [kid_bp]`, `resource_packs [kid_rp]`, `scripts_ok` — msg "your server is still starting with your packs; wait for the status bar to say live" |
| 2. Join your world | Phone: Play → Servers → the server → Join; tap **Download** if asked. Chat says **My Pack is on!** | `game: 00-joined` — msg "I do not see you in the world yet; tap your server in the Servers tab and join" |
| 3. Hold your wand | Tap the chat bubble, type `/give @s kid:wand`, select the Wand in the hotbar: its name shows above the hotbar and it has a picture. | `game: 00-wand` — msg "nobody is holding a Wand yet; open chat, type /give @s kid:wand, then tap the Wand in your hotbar" |

The Idea (≤ 100 words) is the loop: *you stop typing → the file saves itself
→ the server restarts with your packs (your phone says Disconnected) → you
tap your server → the status bar says live.* **Predict:** "Which folder do
you think made the words in chat, and which made the Wand's picture?" (The
answer is one each, and that is the whole point of two halves.) **Say it
back:** "What does the server read, and where do you see the result?"
**Try this:** none; the lesson is already the try.

The media is the loop as a strip (SVG, five boxes, the same file every payoff
step reuses) and an annotated file tree with four callouts.

---

## 4. The lesson sequence

Fifteen lessons after the tour, in any order. Conventions: every payoff step
carries the shared rejoin paragraph verbatim; every `main.js` step also runs
the `js` check and a `deploy … scripts_ok` check appears in the payoff step;
"assumes" lists everything a lesson takes from the skeleton, and nothing
else. Regexes are exact (FORMAT's default). `[\s\S]{0,N}?` is how a pattern
reaches across lines to say "inside this block"; it is bounded so it cannot
match the next block.

Order: two no-code lessons with big visible payoffs first (01, 02), then code
from smallest possible edit (03) to writing a handler (04) to the data inside
it (05), control (06), doing more with the player (07), time (08), memory (09),
naming (10), the game's own counter (11), then the item thread (12, 13, 14)
and the capstone (15).

### 01-rename-a-diamond: Rename anything in the game

- **Concept:** every name the game shows is one line in a text file, and your
  pack can replace any line.
- **Payoff:** a diamond selected in the hotbar shows *Shiny Rock* (or
  whatever they wrote) above the hotbar.
- **Files:** `packs/kid_rp/texts/en_US.lang`.
- **Assumes:** the skeleton's `en_US.lang` with the Wand line, `languages.json`.
- **Steps:**
  1. *Write the new name.* Add a line under the Wand line:
     `item.diamond.name=Shiny Rock`. Checks: regex
     `^item\.diamond\.name=\S` (msg: "the file needs a line
     item.diamond.name= followed by your name, no spaces on either side of
     the ="); regex `^item\.kid:wand=` (msg: "the Wand line got deleted; put
     `item.kid:wand=Wand` back").
  2. *See it.* `deploy ok resource_packs [kid_rp]`. Rejoin paragraph. "Open
     your inventory, search *diamond*, put one in your hotbar and tap it: the
     name shows above the hotbar."
- **Predict:** "Where will the new name show up: on the diamond, in chat, or
  on the server?"
- **Try this:** rename one more thing. Items are `item.<name>.name`, blocks
  are `tile.<name>.name`: `tile.dirt.name=Mud`.
- **Say it back:** "Where does the game get the word Diamond from, and how
  did your pack change it?"
- **Game check:** none.
- **Media:** phone screenshot of the hotbar with a selected diamond named
  Shiny Rock, captioned "yours says your name".
- **Predicted mistakes:** spaces around `=` (regex fails, message says so);
  quotes around the name (passes; the game shows the quotes; the hint
  explains, this one teaches); `Item.Diamond.name` (exact regex fails, message
  names the case); key edited to `item.diamond=` (regex fails); the Wand line
  deleted (second regex); the phone shows "Diamond" because it cached the old
  resource pack (platform, section 8.2) or because they joined before **live**
  (hint).

### 02-candy-dirt: Change how a block looks

- **Concept:** a resource pack replaces any of the game's pictures by putting
  a file at the same path with the same name. No code, no JSON.
- **Payoff:** every dirt block in the world is pink.
- **Files:** `packs/kid_rp/textures/blocks/dirt.png`.
- **Assumes:** `assets/dirt.png`, the RP's `textures/` folder.
- **Steps:**
  1. *Put the picture where the game looks.* Make a folder `blocks` inside
     `packs/kid_rp/textures`, then copy `assets/dirt.png` into it (right-click
     → Copy, right-click the folder → Paste). Check: `exists
     packs/kid_rp/textures/blocks/dirt.png` with `png: true` (msg: "I cannot
     find dirt.png inside packs/kid_rp/textures/blocks; the folder is blocks,
     with an s, and the file keeps its name").
  2. *See it.* `deploy ok resource_packs [kid_rp]`. Rejoin. Look down.
- **Predict:** "Will only new dirt you place change, or every dirt block
  already in the world?"
- **Try this:** copy the same file again as `stone.png` in the same folder.
- **Say it back:** "Why did the block change without you writing any code?"
- **Game check:** none.
- **Media:** before/after screenshot pair; a tiny file-tree SVG showing
  `textures/blocks/dirt.png` next to the words "same path as the game's own
  file".
- **Predicted mistakes:** folder named `block` or `Blocks` (the `exists`
  near-name diagnostic must walk folders, section 8); file pasted as
  `dirt copy.png` (near-name); pasted into `textures/items` (misplaced
  diagnostic); a text file named `dirt.png` (png signature); the phone cache
  (8.2). VS Code's file copy is the tool skill here; the hint shows the two
  right-click menus.

### 03-say-hello: Change what the server says

- **Concept:** the script is a text file the server runs, and a block of it
  runs each time its event happens. Changing the words changes the game.
- **Payoff:** chat shows their words when they join, and again when they
  die and respawn.
- **Files:** `packs/kid_bp/scripts/main.js`.
- **Assumes:** the skeleton hello handler with `world.sendMessage("My Pack
  is on!")`.
- **Steps:**
  1. *Change the words.* Only the words between the quotes. Checks: regex
     `world\.sendMessage\(\s*"(?!My Pack is on!")(?:[^"\\]|\\.)+"` (msg:
     "the message still says My Pack is on!; change only the words between
     the quotes"); regex `^import \{\s*world,\s*system,\s*DisplaySlotId\s*\} from "@minecraft/server";`
     (msg: "the first import line is gone; it is how your code gets the
     toolbox; put it back exactly"); `js`.
  2. *Hear it.* `deploy ok behavior_packs [kid_bp] scripts_ok`. Rejoin. Then:
     "Open chat and type `/kill @s`. When you respawn it says it again."
- **Predict:** "When will your words appear: when the server starts, when you
  join, or both?"
- **Try this:** add a second `world.sendMessage("...");` line under the
  first. Two lines, two messages.
- **Say it back:** "What is the event here, and what does the server do when
  it happens?"
- **Game check:** none.
- **Media:** a fifteen-second phone GIF: join, chat line; `/kill @s`; respawn,
  chat line again. It is the whole idea of *event* in one loop.
- **Predicted mistakes:** a quote deleted (`js` syntax; the checker's
  "a closing quote is missing" mapping); a `"` inside the message (`js`
  syntax; message: "a message cannot contain \"; use ' instead"); curly
  quotes from a phone keyboard (`js` "a character the computer does not
  understand"); the words typed outside the quotes (`js`); the fence pasted
  (`js` fence rule); `sendmessage` or `SendMessage` (exact regex; this is a
  runtime error, invisible to `scripts_ok`, section 8.4); `console.log`
  added out of curiosity (`js`). Autosave while typing makes the file
  briefly invalid; FORMAT's `broken` block handles it.

### 04-second-event: Make something happen when you break a block

- **Concept:** there are many events, each with a name; every handler has the
  same three parts (which event, a function, the lines it runs).
- **Payoff:** break a block, chat says *Crunch!*
- **Files:** `main.js`.
- **Assumes:** the hello handler as the shape to copy; `world` imported.
- **Steps:**
  1. *Add a block for a new event.* Paste at the end of the file:
     ```js
     world.afterEvents.playerBreakBlock
       .subscribe((event) => {
         world.sendMessage("Crunch!");
       });
     ```
     Checks: regex `world\.afterEvents\.playerBreakBlock\s*\.subscribe\s*\(\s*\(?\s*\w*\s*\)?\s*=>\s*\{`
     (msg: "the new block should start world.afterEvents.playerBreakBlock
     (capital B twice) then .subscribe((event) => {"); regex
     `playerBreakBlock[\s\S]{0,200}?world\.sendMessage\(\s*"` (msg: "inside
     the new block, world.sendMessage(\"...\") with your words"); `js`.
  2. *See it.* `deploy … scripts_ok`. Rejoin. Break anything.
- **Predict:** "If you break three blocks, how many times will chat say
  Crunch?"
- **Try this:** change `playerBreakBlock` to `playerPlaceBlock` and place
  blocks instead.
- **Say it back:** "Every event block has three parts. Name them."
- **Game check:** none.
- **Media:** SVG anatomy of a handler: the four pasted lines with three
  callouts (which event / the function that runs / what it does).
- **Predicted mistakes:** pasted *inside* the hello block (valid JS; it
  subscribes again on every spawn and the message multiplies; needs the
  nested-handler diagnostic, section 8.5); `playerBreakblock` (exact regex);
  missing `});` (`js`: "a ) or } is missing at the end; the block should end
  });"); `beforeEvents` (`js` rule); fence pasted (`js`).

### 05-say-my-name: Use what the event tells you

- **Concept:** the event hands your function a package of information; a dot
  reaches inside it. `event.player.name` is their gamertag.
- **Payoff:** chat says *Hello, <gamertag>* when they join.
- **Files:** `main.js`.
- **Assumes:** the hello handler with the parameter named `event`.
- **Steps:**
  1. *Put your name in the message.* Change the hello line to
     `world.sendMessage("Hello, " + event.player.name);`. Checks: regex
     `world\.sendMessage\([^)]*\+\s*event\.player\.name` (msg: "the message
     needs + event.player.name after the closing quote, outside the quotes");
     regex `"[^"\n]*event\.player\.name[^"\n]*"` must NOT match — FORMAT has
     no negative check; use a lookahead in the first pattern instead:
     `world\.sendMessage\(\s*"(?:[^"\\]|\\.)*"\s*\+\s*event\.player\.name`
     (a name inside the quotes fails this and gets the same message); `js`.
  2. *See it.* Rejoin.
- **Predict:** "Will chat say the word name, or your actual name?"
- **Try this:** `event.player.name + " is here!"` (the name first).
- **Say it back:** "What is inside event, and how did you get your name out
  of it?"
- **Game check:** none.
- **Media:** SVG: three nested boxes, event → player → name, with the dots
  drawn as arrows.
- **Predicted mistakes:** name inside the quotes (prints the words; the
  lookahead pattern catches it); `+` missing (`js` syntax); `event.name`,
  `player.name`, `Event.player` (regex, exact); `.Name` (regex).

### 06-first-time-only: Say different things on join and on respawn

- **Concept:** `if` asks a yes/no question and runs one of two blocks.
  `event.initialSpawn` is yes the first time they appear, no after dying.
- **Payoff:** *Hello!* on join; *Back again!* after `/kill @s`.
- **Files:** `main.js`.
- **Assumes:** the hello handler with `event` and one `world.sendMessage`.
- **Steps:**
  1. *Ask the question.* Put `if (event.initialSpawn) {` on the line above the
     sendMessage line and `}` on the line below. Checks: regex
     `if\s*\(\s*event\.initialSpawn\s*\)\s*\{` (msg: "the line is if
     (event.initialSpawn) { with the parentheses and the brace"); `js`.
  2. *Add the other answer.* After that `}`, add `else { world.sendMessage("Back again!"); }`
     (three lines in the lesson). Check: regex `\}\s*else\s*\{[\s\S]{0,120}?world\.sendMessage\(`
     (msg: "after the closing } add else { ... } with a second sendMessage
     inside"); `js`.
  3. *See it.* Rejoin; `/kill @s`; read chat.
- **Predict:** "After you die and come back, which message will you see?"
- **Try this:** swap the two messages.
- **Say it back:** "What question does the if ask, and what are its two
  answers?"
- **Game check:** none.
- **Media:** SVG flowchart: player spawns → first time? → yes: Hello / no:
  Back again.
- **Predicted mistakes:** braces unbalanced (`js`, the "a } is missing"
  mapping); `initialspawn` (regex); `if event.initialSpawn` without
  parentheses (`js`); `else` before the `}` (`js`); `if` placed outside the
  handler at top level (`js` top-level rule sees `event` unused — no; it is
  a `ReferenceError` at load time, caught by `scripts_ok`).

### 07-big-words: Make the player's screen do things

- **Concept:** `event.player` is a thing with abilities; a dot and a verb
  asks it to do one. Chat is one; big title text and sounds are two more.
- **Payoff:** *WELCOME* fills the screen and a level-up sound plays on join.
- **Files:** `main.js`.
- **Assumes:** the hello handler with `event`.
- **Steps:**
  1. *Big words.* Inside the hello block add
     `event.player.onScreenDisplay.setTitle("WELCOME");`. Check: regex
     `event\.player\.onScreenDisplay\.setTitle\(\s*"(?:[^"\\]|\\.)+"` (msg:
     "the line is event.player.onScreenDisplay.setTitle(\"...\") with your
     words in the quotes; capital S, D and T"); `js`.
  2. *A sound.* Add `event.player.playSound("random.levelup");`. Check: regex
     `event\.player\.playSound\(\s*"[a-z_.]+"\s*\)` (msg: "the line is
     event.player.playSound(\"random.levelup\")"); `js`.
  3. *See and hear it.* Rejoin; phone volume up.
- **Predict:** "Where on the screen will WELCOME appear?"
- **Try this:** other sounds: `random.explode`, `mob.ghast.scream`,
  `note.pling`, `random.orb`. A subtitle: `setTitle("WELCOME", { subtitle: "to my world" })`.
- **Say it back:** "What is the dot doing in event.player.playSound?"
- **Game check:** none.
- **Media:** phone screenshot with a title on screen.
- **Predicted mistakes:** `settitle`, `onscreendisplay` (regex); a wrong
  sound id (silent, nothing to catch; the Try-this list is the safety net);
  `world.playSound(...)` (needs a location, throws at runtime; regex requires
  `event.player.`); lines placed outside the block (`js` top-level rule).

### 08-clock: Make something happen every ten seconds

- **Concept:** `system.runInterval` runs a function again and again; the
  number is ticks, twenty per second.
- **Payoff:** chat says *Tick* every ten seconds, forever.
- **Files:** `main.js`.
- **Assumes:** `system` imported.
- **Steps:**
  1. *Start the clock.* Paste at the end:
     ```js
     system.runInterval(() => {
       world.sendMessage("Tick");
     }, 200);
     ```
     Checks: regex `system\.runInterval\(\s*\(\s*\)\s*=>\s*\{` (msg: "the block
     starts system.runInterval(() => {"); regex `\}\s*,\s*\d+\s*\)\s*;` (msg:
     "the block ends }, 200); with the number of ticks before the )"); `js`.
  2. *Watch it.* Rejoin; wait ten seconds; count.
- **Predict:** "200 what: seconds, ticks or messages? How often will Tick
  appear?"
- **Try this:** 20 (every second: chaos), then 1200 (a minute). Change the
  message to the time: `"Tick " + world.getTimeOfDay()`.
- **Say it back:** "What is a tick, and what does the number at the end
  mean?"
- **Game check:** none.
- **Media:** SVG timeline: 20 ticks = 1 second, 200 = 10 seconds.
- **Predicted mistakes:** `runinterval` (regex); pasted inside a handler (a
  new clock per spawn, 8.5); `world.runInterval` (regex); the number left
  out (`js`).

### 09-counter: Remember a number between events

- **Concept:** a variable is a named box; `let` makes it, `= ... + 1` changes
  what is inside, and it keeps its value between events.
- **Payoff:** each block broken says *Blocks: 1*, *Blocks: 2*, …
- **Files:** `main.js`.
- **Assumes:** `world` imported; nothing else (the lesson supplies its own
  handler; the text says "if you already have a playerBreakBlock block from
  the Crunch lesson, put the two middle lines inside it instead").
- **Steps:**
  1. *Make the box.* Under the import line: `let blocks = 0;`. Check: regex
     `^let\s+blocks\s*=\s*0\s*;` (msg: "near the top of the file, on its own
     line with no spaces before it: let blocks = 0;"); `js`.
  2. *Count in it.* Paste at the end:
     ```js
     world.afterEvents.playerBreakBlock
       .subscribe((event) => {
         blocks = blocks + 1;
         world.sendMessage("Blocks: " + blocks);
       });
     ```
     Checks: regex `blocks\s*(\+=\s*1|=\s*blocks\s*\+\s*1)\s*;` (msg: "the
     counting line is blocks = blocks + 1;"); regex
     `world\.sendMessage\(\s*"[^"]*"\s*\+\s*blocks\s*\)` (msg: "the message
     line joins your words and the box: \"Blocks: \" + blocks"); regex
     `playerBreakBlock` (msg: "the lines must be inside a playerBreakBlock
     block"); `js`.
  3. *See it count.* Rejoin; break blocks.
- **Predict:** "What will the third message say? And after the server
  restarts?"
- **Try this:** change the word Blocks to anything (that redeploys, so the
  server restarts); rejoin; break one block. It says 1 again. "A later
  lesson fixes that."
- **Say it back:** "What does let blocks = 0 make, and what does blocks =
  blocks + 1 do to it?"
- **Game check:** none.
- **Media:** SVG: a box labelled `blocks` with 0 → 1 → 2 under three
  break-block arrows.
- **Predicted mistakes:** `let blocks = 0` put inside the handler (always 1;
  regex `^\s+let\s+blocks` with msg "let blocks = 0 is inside the block, so
  it starts over every time; move it to the top under import"); `const`
  (runtime TypeError; regex requires `let`); `blocks + 1;` with no `=`
  (regex); `Blocks` (regex).

### 10-recipe: Write a recipe once, use it twice

- **Concept:** a function is a named recipe; you write the lines once and
  call the name wherever you want them to run. Change the recipe, every
  caller changes.
- **Payoff:** the same *PARTY* title and sound on join and when placing a
  block; edit one word, both change.
- **Files:** `main.js`.
- **Assumes:** the hello handler with `event`.
- **Steps:**
  1. *Write the recipe.* Paste at the end:
     ```js
     function party(player) {
       player.playSound("random.levelup");
       player.onScreenDisplay.setTitle("PARTY");
     }
     ```
     Checks: regex `^function\s+party\s*\(\s*player\s*\)\s*\{` (msg: "on its
     own line: function party(player) {"); regex
     `party\(player\)\s*\{[\s\S]{0,200}?player\.onScreenDisplay\.setTitle\(`
     (msg: "inside the recipe, player.onScreenDisplay.setTitle(...)"); `js`.
  2. *Use it on join.* Inside the hello block: `party(event.player);`. Check:
     regex `playerSpawn[\s\S]{0,600}?party\(\s*event\.player\s*\)` (msg:
     "inside the hello block, one line: party(event.player);"); `js`.
  3. *Use it again.* Paste at the end:
     ```js
     world.afterEvents.playerPlaceBlock
       .subscribe((event) => {
         party(event.player);
       });
     ```
     Check: regex `playerPlaceBlock[\s\S]{0,120}?party\(\s*event\.player\s*\)`
     (msg: "the new block should call party(event.player); inside"); `js`.
  4. *See it.* Rejoin (party), place a block (party). Then change PARTY to
     another word: both change.
- **Predict:** "You write the party lines once. How many places will they
  run from?"
- **Try this:** add a third line to the recipe (`player.sendMessage("woo")`);
  it appears in both places.
- **Say it back:** "What is a function, and why write one instead of pasting
  the lines twice?"
- **Game check:** none.
- **Media:** SVG: two event boxes with arrows into one box named `party`.
- **Predicted mistakes:** `party()` with nothing inside (runtime error; regex
  requires `event.player`); recipe defined inside a handler (works; the
  `^function` anchor fails and the message says "at the top level, not inside
  a block"); `Party` (regex); the parameter renamed in the definition but not
  in the body (runtime ReferenceError; the second regex requires
  `player.onScreenDisplay`).

### 11-scoreboard: Put your count on the side of the screen

- **Concept:** the scoreboard is Minecraft's own counter: the world keeps the
  number and can show it on screen. Your script only adds to it.
- **Payoff:** a sidebar titled *Blocks* counting blocks broken, per player.
- **Files:** `main.js`.
- **Assumes:** `world` and `DisplaySlotId` imported. Mentions lesson 09's
  handler ("put these lines inside it if you have one").
- **Steps:**
  1. *Count on the scoreboard.* Paste at the end:
     ```js
     world.afterEvents.playerBreakBlock
       .subscribe((event) => {
         let score = world.scoreboard
           .getObjective("kid:blocks");
         if (!score) {
           score = world.scoreboard
             .addObjective("kid:blocks", "Blocks");
         }
         score.addScore(event.player, 1);
       });
     ```
     The text explains one new thing: `!score` means "there is no score
     yet", so the objective is made once. Checks: regex
     `getObjective\(\s*"kid:blocks"\s*\)`; regex
     `if\s*\(\s*!\s*score\s*\)\s*\{[\s\S]{0,120}?addObjective\(\s*"kid:blocks"\s*,\s*"`
     (msg: "the addObjective line must be inside if (!score) { }, or the
     game complains the second time"); regex
     `score\.addScore\(\s*event\.player\s*,\s*1\s*\)`; `js`.
  2. *Show it.* After the addScore line:
     ```js
         world.scoreboard.setObjectiveAtDisplaySlot(
           DisplaySlotId.Sidebar, { objective: score });
     ```
     Check: regex `setObjectiveAtDisplaySlot\(\s*DisplaySlotId\.Sidebar\s*,\s*\{\s*objective:\s*score\s*\}`;
     `js`.
  3. *See it.* Rejoin; break a block; the sidebar appears. `game:
     11-scoreboard`.
- **Predict:** "Where will the number appear this time?"
- **Try this:** change "Blocks" to any title. Then change it again (the server
  restarts): the count continues, unlike lesson 09's box.
- **Say it back:** "Who keeps the scoreboard's number: your script or the
  world?"
- **Game check:** `11-scoreboard`: objective `kid:blocks` exists and is in the
  Sidebar slot (the existing grader check).
- **Media:** phone screenshot of the sidebar.
- **Predicted mistakes:** `kid: blocks` (regex); `DisplaySlotId.sidebar`
  (regex); `addScore(event, 1)` (runtime; regex requires `event.player`);
  the `if` removed so `addObjective` runs every time (runtime throw on the
  second break; regex requires it inside the `if`).

### 12-your-own-item: Make an item that never existed

- **Concept:** an item is a JSON file with an identifier, and the same
  identifier must appear in four places across the two halves. Spell it
  differently anywhere and the game says nothing.
- **Payoff:** `/give @s kid:gem` puts a Gem with its own picture and name in
  the hotbar.
- **Files:** `packs/kid_bp/items/gem.json`, `packs/kid_rp/textures/item_texture.json`,
  `packs/kid_rp/textures/items/gem.png`, `packs/kid_rp/texts/en_US.lang`.
- **Assumes:** `items/wand.json` as the example to look at, `item_texture.json`
  with the wand entry, `assets/gem.png`.
- **Steps:**
  1. *The item file.* New file `packs/kid_bp/items/gem.json`, paste (a copy of
     wand.json with `kid:gem` in both places). Checks: `exists`; `json`
     `minecraft:item.description.identifier` equals `kid:gem` (msg: "the
     identifier must be exactly kid:gem"); `json`
     `minecraft:item.components.minecraft:icon` equals `kid:gem`.
  2. *Tell the looks half which picture.* In `item_texture.json`, after the
     wand entry, paste a snippet that starts with the comma:
     `,\n    "kid:gem": { "textures": "textures/items/gem" }`. Checks: `json`
     `texture_data.kid:gem.textures` equals `textures/items/gem`; `same`
     between gem.json's icon (`path`) and item_texture's key (`pattern`
     `"(kid:[a-z_]+)"\s*:\s*\{\s*"textures"\s*:\s*"textures/items/gem"`)
     (msg: "the name in item_texture.json must be the same word as the icon
     in gem.json").
  3. *The picture itself.* Copy `assets/gem.png` to
     `packs/kid_rp/textures/items/gem.png`. Check: `exists … png: true`.
  4. *The name.* Add `item.kid:gem=Gem` to `en_US.lang`. Check: regex
     `^item\.kid:gem=\S`.
  5. *Hold it.* `deploy ok behavior_packs [kid_bp] resource_packs [kid_rp]`;
     rejoin; `/give @s kid:gem`. `game: 12-item`.
- **Predict:** "The item lives in kid_bp. Which half gives it its picture,
  and which its name?"
- **Try this:** rename it in the lang file; make a third item `kid:coin`
  reusing gem.png.
- **Say it back:** "Name the four places kid:gem appears, and what you would
  see if one were spelled kid:Gem." (Purple-and-black checker, or no item.)
- **Game check:** `12-item`: `ItemTypes.get("kid:gem")` is defined.
- **Media:** SVG "four places must agree": the four files with the identifier
  highlighted and arrows between them.
- **Predicted mistakes:** identifier `kid:Gem` or `kid gem` (json equals,
  exact); icon and texture key differ (the `same` check, with the message
  above); comma trap in item_texture.json (the snippet starts with the comma;
  the JSON error explains the rest); `gem copy.png` or the png in `textures/`
  (near-name/misplaced); lang key `item.kid:gem.name` (regex); the texture
  path with `.png` (works; leave it); `/give` says "Unknown item" (the game
  check message says which file to look at); `/give` refused for permission
  (platform, 8.1).

### 13-wand-power: Make your wand do something

- **Concept:** an item can trigger code: the `itemUse` event tells you which
  item, and an `if` picks yours.
- **Payoff:** tap with the Wand in hand and float for three seconds.
- **Files:** `main.js`.
- **Assumes:** the skeleton wand (`kid:wand`), `world` imported.
- **Steps:**
  1. *Listen for any item.* Paste at the end:
     ```js
     world.afterEvents.itemUse
       .subscribe((event) => {
         world.sendMessage(
           "Used: " + event.itemStack.typeId);
       });
     ```
     Checks: regex `world\.afterEvents\.itemUse\s*\.subscribe`; regex
     `event\.itemStack\.typeId`; `js`. (Not the payoff, but the learner can
     already see every item's real name in chat: a small win mid-lesson.)
  2. *Only the wand, and a power.* Replace the sendMessage line with:
     ```js
         if (event.itemStack.typeId === "kid:wand") {
           event.source.addEffect("levitation", 60);
         }
     ```
     Checks: regex `if\s*\(\s*event\.itemStack\.typeId\s*={2,3}\s*"kid:wand"\s*\)`;
     regex `event\.source\.addEffect\(\s*"[a-z_]+"\s*,\s*\d+`; `same` between
     main.js pattern `typeId\s*={2,3}\s*"(kid:[a-z_]+)"` and wand.json
     `minecraft:item.description.identifier` (msg: "the name in the if must
     be the item's identifier from items/wand.json, exactly"); `js`.
  3. *Float.* Rejoin; hold the Wand; tap the screen (not on a block).
- **Predict:** "What happens when you tap with a stick instead of the wand?"
- **Try this:** `"speed"`, `"jump_boost"`, `"night_vision"`, `"slow_falling"`;
  `60` → `200`; a second `if` for `kid:gem` if they made one.
- **Say it back:** "What event fires when you tap with an item, and how does
  the code know it was the wand?"
- **Game check:** none (an effect is momentary).
- **Media:** phone GIF: tap, float, land.
- **Predicted mistakes:** `event.player` (itemUse has `source`; runtime
  TypeError; regex requires `event.source`); `"kid:Wand"` (the `same`
  check); `=` instead of `==` (`js` accepts it; it assigns and always runs;
  regex requires `==` or `===`); effect name typo (runtime throw, nothing
  static can catch; the Try-this list is the rail); `60` read as seconds
  (the hint: ticks); tapping a block instead of the air (**assumed**: on
  touch, a tap on a block also fires `itemUse` for a non-placeable item, but
  say "tap the sky" anyway).

### 14-remember: Make the count survive a restart

- **Concept:** the world can save a value for you under a name; `get` reads
  it back, `set` writes it. Unlike a `let` box, it survives restarts.
- **Payoff:** *Wand uses: 7* on the action bar, and after the server restarts
  the next use says 8.
- **Files:** `main.js`.
- **Assumes:** the skeleton wand; `world` imported. Mentions lesson 13's
  handler ("put these lines inside your wand if block if you have one").
- **Steps:**
  1. *Read the saved number.* Paste at the end:
     ```js
     world.afterEvents.itemUse
       .subscribe((event) => {
         if (event.itemStack.typeId === "kid:wand") {
           let uses = event.source
             .getDynamicProperty("kid:uses") ?? 0;
           event.source.onScreenDisplay
             .setActionBar("Wand uses: " + uses);
         }
       });
     ```
     `?? 0` is explained as "or 0 if nothing is saved yet". Checks: regex
     `getDynamicProperty\(\s*"kid:uses"\s*\)\s*\?\?\s*0`; regex
     `setActionBar\(\s*"[^"]*"\s*\+\s*uses\s*\)`; `js`. It shows 0 every time,
     on purpose.
  2. *Save the new number.* Under the `let uses` line add
     `uses = uses + 1;` and
     `event.source.setDynamicProperty("kid:uses", uses);`. Checks: regex
     `uses\s*(\+=\s*1|=\s*uses\s*\+\s*1)\s*;`; regex
     `setDynamicProperty\(\s*"kid:uses"\s*,\s*uses\s*\)`; `same` between the
     get pattern `getDynamicProperty\(\s*"([^"]+)"` and the set pattern
     `setDynamicProperty\(\s*"([^"]+)"` in the same file (msg: "get and set
     must use the same name"); `js`.
  3. *See it survive.* Rejoin; use the wand a few times; then change the words
     "Wand uses" to anything (the server restarts); rejoin; use it once: it
     continues.
- **Predict:** "You used it 5 times, the server restarts. Does the next use
  say 1 or 6?"
- **Try this:** show the number with `setTitle` instead; save a second
  property `kid:last` with the block you were standing on.
- **Say it back:** "Where does the number live between restarts, and what are
  the two verbs?"
- **Game check:** none, and it cannot be one: dynamic properties are stored
  per behavior pack, keyed by the pack's header UUID, so the grader pack
  cannot read `kid:uses` (**verified**, section 6). The restart in step 3 is
  the proof.
- **Media:** SVG: the script on the left, the world's save on the right,
  `get` and `set` arrows.
- **Predicted mistakes:** `?? 0` left out (shows *NaN*; the hint explains it:
  "nothing plus one is not a number"); get and set names differ (the `same`
  check); `event.player` (regex); set before get (works, shows one less; leave
  it); `getDynamicProperty("kid:uses") + 1 ?? 0` (precedence; `js` passes,
  shows NaN; the hint).

### 15-quest: A tiny quest

- **Concept:** a quest is state (a tag on the player), an event that starts
  it, a condition that checks it, and an effect when it is done. Every piece
  has been met once.
- **Payoff:** talk to an NPC, press *I will do it*, break ten blocks, the
  screen says *QUEST DONE*.
- **Files:** `packs/kid_bp/dialogue/scene.json`, `main.js`.
- **Assumes:** `world` and `system` imported. The NPC part of the payoff is
  **assumed** (see 6.7); the fallback is typing `/scriptevent kid:quest start`
  in chat, which needs the same operator permission the rest of the course
  needs.
- **Steps:**
  1. *What the NPC says.* New file `packs/kid_bp/dialogue/scene.json`, paste:
     one scene `kid_quest`, npc_name "Quest Giver", text "Break 10 blocks,
     then come back.", one button "I will do it" running
     `/scriptevent kid:quest start`. Checks: `json`
     `minecraft:npc_dialogue.scenes[0].scene_tag` equals `kid_quest`; `json`
     `minecraft:npc_dialogue.scenes[0].buttons[0].commands[0]` matches
     `^/scriptevent kid:quest\b`.
  2. *Start the quest.* Paste at the end of main.js:
     ```js
     system.afterEvents.scriptEventReceive
       .subscribe((event) => {
         if (event.id === "kid:quest") {
           const player =
             event.initiator ?? event.sourceEntity;
           player.addTag("kid:quest");
           player.sendMessage("Quest started!");
         }
       });
     ```
     Checks: regex `system\.afterEvents\.scriptEventReceive\s*\.subscribe`;
     regex `if\s*\(\s*event\.id\s*={2,3}\s*"kid:quest"\s*\)`; `same` between
     scene.json pattern `/scriptevent (kid:[a-z_]+)` and main.js pattern
     `event\.id\s*={2,3}\s*"(kid:[a-z_]+)"`; regex `addTag\(\s*"kid:quest"\s*\)`;
     `js`.
  3. *Count and win.* Paste at the end:
     ```js
     let questBlocks = 0;
     world.afterEvents.playerBreakBlock
       .subscribe((event) => {
         const player = event.player;
         if (player.hasTag("kid:quest")) {
           questBlocks = questBlocks + 1;
           player.onScreenDisplay.setActionBar(
             "Blocks: " + questBlocks + "/10");
           if (questBlocks >= 10) {
             player.removeTag("kid:quest");
             player.addTag("kid:quest_done");
             player.onScreenDisplay
               .setTitle("QUEST DONE");
             player.playSound("random.levelup");
           }
         }
       });
     ```
     Checks: regex `hasTag\(\s*"kid:quest"\s*\)`; `same` between the addTag
     name in step 2 and this hasTag name (two patterns, same file); regex
     `questBlocks\s*>=\s*10`; regex `addTag\(\s*"kid:quest_done"\s*\)`; regex
     `setTitle\(`; `js`.
  4. *Place the quest giver and play.* `deploy … scripts_ok`. Rejoin. In chat:
     `/summon npc`, then `/dialogue change @e[type=npc,c=1] kid_quest`. Tap
     the NPC, press the button, break ten blocks. `game: 15-quest`.
- **Predict:** "What has to be true for a broken block to count?"
- **Try this:** 10 → 3; a reward:
  `player.runCommand("give @s diamond 5");`; change what the NPC says.
- **Say it back:** the learning track's own gate: "Event, state, condition,
  effect: name each one for this quest."
- **Game check:** `15-quest`: some online player has the tag
  `kid:quest_done`; if a player has `kid:quest` instead, the reason is
  "started but not finished: break more blocks".
- **Media:** SVG state diagram (no tag → button → `kid:quest` → ten blocks →
  `kid:quest_done` + title) and a phone screenshot of the NPC dialogue with
  the button.
- **Predicted mistakes:** scene.json commas and quotes (json parse messages);
  scene tag in the `/dialogue change` command mistyped (the NPC shows the
  default empty dialogue; hint: "the last word must be kid_quest exactly");
  `event.id === "kid:quest start"` (regex; the message says the id and the
  message are separate); tag names differing (the `same` check); `> 10`
  (regex requires `>=`; msg "the eleventh block should not be needed");
  `let questBlocks` inside the handler (never reaches 10; regex `^let`
  anchor); no NPC because `/summon` was refused (8.1).

### Optional, unverified: 16-name-your-pack

Change `header.name` in both manifests and swap `pack_icon.png` for
`assets/pack_icon.png`. The payoff would be the pack list on the phone:
Pause → Settings → Resource Packs / Behavior Packs showing the new name and
icon for a server world. I could not verify that those tabs are populated
for a third-party server on Android (6.2), and I found no other client
screen that shows a server pack's name. Until the parent sees it on the
phone, this lesson does not ship. It stays here so the icon in `assets/` has
a reason to exist.

---

## 5. Checks the current FORMAT.md cannot express, with the assertion needed

1. **"This handler is at the top level."** Lessons 04, 08, 09, 10, 11, 13, 14,
   15 paste a block "at the end of the file"; the likely wrong place is inside
   the hello block, which is valid JavaScript and multiplies the effect on
   every spawn. Assertion: any statement beginning `world.afterEvents.`,
   `system.afterEvents.`, `system.runInterval(`, `function ` or `let ` that
   is at brace depth > 0 fails the `js` check with "this block is inside
   another block; move it below the last });". This is the same brace
   walker the `js` check already has for the top-level `world.` rule, run
   the other way round.
2. **Statement-level, not line-level, top-level rule.** The split
   `world.afterEvents.x` / `.subscribe(` form must pass the `js` check.
   Assertion: join lines up to the `;` (or `{` that opens the callback)
   before applying the "world. at depth 0 other than .subscribe(" rule.
3. **A negative regex.** "The name is not inside the quotes" (05) and "the
   message changed" (03) are done with lookaheads inside a positive pattern
   above, which Python `re` supports. If the checker ever switches engines,
   `"absent_pattern": P` on the `regex` check is the clean form.
4. **Folder existence.** 02 needs `textures/blocks/` to exist with the right
   case; `exists` takes a file. The file check inside it is enough *if* the
   misplaced-file diagnostic walks parent folders case-insensitively
   ("found textures/Blocks/dirt.png; the folder must be blocks").
5. **Runtime script errors.** `scripts_ok` sees only the start-up log. A
   `TypeError` at spawn (`sendmessage`) is invisible. Exact regexes cover the
   identifiers the lessons name; nothing covers a mistyped sound or effect id.
   Platform wish: the extension's Deploy channel tails `[Scripting]` lines
   from the container log while the learner plays, so the learner can *see*
   "Error: effect does not exist" without the parent.

---

## 6. Phone mechanics

What every lesson must account for on the Android client, and what I
checked.

1. **Rejoining after a deploy** — every deploy restarts the server
   (`platform/control/control.py`: `say §eYour pack changed. Restarting, back
   in a few seconds.` then `docker restart`). If the learner is in the world
   they see that chat line and are then dropped to the menu. The exact
   dialog text on Android is **assumed** ("Disconnected from server"; the
   forum threads I found use those words for the generic drop). The shared
   paragraph, verbatim from FORMAT.md, in every payoff step: "Wait for the
   status bar to say **live**. Your phone shows *Disconnected from server*:
   tap your server in the list to join again, and tap **Download** if it asks
   about a resource pack." The path to the server (Play → **Servers** tab →
   scroll to the bottom → the added server → Join Server) is **assumed**
   standard Android behaviour; the tour spells it out once.
2. **The resource pack download prompt** — the learner servers run
   `TEXTUREPACK_REQUIRED=true`. With it, the client shows a dialog that the
   world requires resource packs and offers to download; declining means not
   joining (**verified**: gameserverkings and itzg documentation, sources
   below). So a learner can never join without the pack, and lesson 01
   cannot fail silently by "Join without packs". The word on the button is
   **assumed** to be *Download*.
3. **The client caches server packs by UUID and version** (**verified**,
   jamesachambers, portalmine). An RP whose files changed but whose
   `header.version` did not may be served from the phone's cache, and the
   learner sees the old name or texture with no error. This breaks lessons
   01, 02 and 12 unless the platform bumps the version on every deploy;
   section 8.2. Nothing in the lesson text can work around it.
4. **No hover on a phone.** The wiki's HUD page (**verified**): when the
   selected hotbar item changes its name is shown above the hotbar, and on
   touch "name of items appear over hotbar when selected". Every "look at
   the name" instruction is "put it in your hotbar and tap it". Whether the
   creative inventory screen shows a name on tap is not documented; the
   lessons never rely on it.
5. **Creative mode on the phone** means: the server's `GAMEMODE: creative`
   applies on join; the inventory opens from the `…` button next to the
   hotbar and has a search box; flying is a double-tap on jump; blocks break
   with a single tap (instant in creative) and place with a tap on a surface;
   using an item (13, 14) is a tap with nothing targeted; chat opens from the
   speech-bubble icon at the top (**verified** for the chat icon via the /op
   guides; the rest **assumed**). `/kill @s` is how a creative player "dies"
   for lessons 03 and 06.
6. **Commands need operator.** Members on a dedicated server cannot run
   `/give`, `/summon`, `/scoreboard`, `/scriptevent`, `/kill`, `/dialogue`
   even with cheats on (**verified**: the wiki's Permission level page). The
   platform sets no permission level, so the learner joins as a member and
   the tour's `/give @s kid:wand` is refused. Section 8.1.
7. **NPCs on a dedicated server** — `/summon npc` and the `/dialogue`
   command are documented for Bedrock (**verified**: Learn's NPC dialogue
   page), and `dialogue change` needs no in-game NPC editor. Whether the
   Android client can also open the NPC editor on a BDS world as an operator
   is **assumed**; the lesson does not need it. The fallback for the button
   is typing `/scriptevent kid:quest start`.
8. **Sound** — the phone must not be muted for lesson 07 and the quest's
   fanfare; the parent line says so.
9. **Two players** — if the parent joins too, `world.sendMessage` goes to
   both and per-player things (`event.player`) go to the one who caused the
   event. Lessons say "you" and are right either way.

Sources read for this section: Bedrock Wiki custom item guide
(https://wiki.bedrock.dev/guide/custom-item); Learn: Add Custom Items,
NPC Dialogue Command, and the `Player`, `Entity`, `Dimension`,
`ScreenDisplay`, `WorldAfterEvents` class pages
(https://learn.microsoft.com/en-us/minecraft/creator/…); Minecraft Wiki:
Heads-up display, Permission level; itzg/docker-minecraft-bedrock-server
README and gameserverkings on `texturepack-required`; jamesachambers and
portalmine on client pack caching; JaylyMC and Bedrock Wiki on dynamic
properties being keyed to the BP header UUID.

---

## 7. The grader pack

`course/grader_bp/scripts/main.js` answers `scriptevent course:check <id>`.
Keep the shape; change the table to this. `14-persist` goes: a dynamic
property set by the learner's pack is invisible to the grader's pack.

| id | Asserts | FAIL reason the learner sees |
|---|---|---|
| `ping` | always | — |
| `00-joined` | `world.getAllPlayers().length > 0` | "I do not see you in the world yet; tap your server in the Servers tab and join" |
| `00-wand` | some online player's inventory container (`getComponent("inventory").container`, all slots) holds an item with `typeId === "kid:wand"` | "nobody has a Wand yet; open chat, type /give @s kid:wand, then tap it in the hotbar" (if nobody is online, the joined message instead) |
| `11-scoreboard` | `world.scoreboard.getObjective("kid:blocks")` exists and `getObjectiveAtDisplaySlot(DisplaySlotId.Sidebar).objective.id === "kid:blocks"` | existing messages: no objective / exists but not on the sidebar |
| `12-item` | `ItemTypes.get("kid:gem")` is defined (was `kid:wand`; the wand is now in the skeleton) | "the game does not know an item called kid:gem; check items/gem.json and the deploy" |
| `15-quest` | some online player `hasTag("kid:quest_done")` | nobody online → join first; a player has `kid:quest` → "started but not finished: break more blocks"; else "nobody has started the quest: tap the NPC and press the button" |

Everything the grader reads is shared world state (players, inventories,
scoreboards, tags). Never a dynamic property.

---

## 8. What the platform must do for this design to hold

Ranked by how many lessons stop without it.

1. **Operator permission for the learner.** Add
   `DEFAULT_PLAYER_PERMISSION_LEVEL: operator` to the `bds` service in
   `platform/learner.compose.yml` (the itzg image maps it to
   `default-player-permission-level`). It is their own server. Without it:
   the tour's step 3, `/kill @s` in 03 and 06, `/give` in 12, `/summon` and
   `/dialogue` and `/scriptevent` in 15 are all refused with a permission
   message the lessons cannot explain.
2. **Bump the resource pack version on every deploy.** `bin/install-packs.py`
   should rewrite `kid_rp`'s `header.version` (and therefore the entry it
   writes in `world_resource_packs.json`) to a value that changes when the
   pack's content hash changes: `[1, 0, N]` with N from the deploy counter
   or the low bits of the tree hash the deploy already computes as its
   "revision". The learner never edits versions. Without this, lessons 01,
   02 and 12 show stale packs on the phone with no error anywhere.
3. **Dynamic properties are per pack.** Remove `14-persist` from the grader;
   the quest uses tags. Also: `new-workspace` must never regenerate
   `BP_HEADER_UUID` for an existing workspace, or lesson 14's saved count
   vanishes (research pitfall 5).
4. **`scripts_ok` covers start-up only.** Say so in FORMAT's `deploy` row so
   lesson authors do not lean on it for runtime errors, and consider tailing
   `[Scripting]` log lines into the Deploy channel live (5.5).
5. **The two `js` behaviours in section 5** (statement-level top-level rule;
   nested-handler diagnostic).
6. **Solution overlays for `main.js` are cumulative in lesson order.** Six
   lessons edit the hello handler and eight append blocks. Because
   `build-tags` replays overlays in lesson order and each overlay is a whole
   file, lesson N's `main.js` overlay must contain lessons 03..N-1's changes
   too, or the tag for N silently drops them and `lesson answer --apply` on
   lesson N deletes work from earlier lessons. The learner's own message
   texts still get replaced by the solution's on `--apply`; the lesson text
   should say "the answer uses its own words; yours were fine" and the panel
   should prefer *showing* the diff to applying it for `main.js`.
7. **`exists` diagnostics walk folders** (5.4) so 02's `Blocks/` and 12's
   `Items/` are named.

---

## 9. Measurement

The events FORMAT.md already defines are enough; what matters is which ones
the author reads first.

**Most important for this sequence:**

- `check` with `outcome: fail`, grouped by `(lesson, step, code)`: the
  regex-heavy lessons (04, 09, 10, 11, 15) will show where an exact pattern
  is rejecting a correct variant; `regex.missing` with many retries on one
  step means the pattern, not the learner, is wrong.
- `broken` per lesson: how often autosave catches a half-typed line and
  whether the panel's `broken` block stops the regression the review found.
- `deploy` with `outcome: fail` and its code: what the static checks let
  through.
- `game` fails with their reason: the two most likely are "not joined" and
  "no permission" (8.1), and both are platform, not lesson.
- `hint` (auto vs button), `answer`, `apply`: `apply` on a `main.js` lesson
  is the "gave up" signal and the trigger to check 8.6.
- The gap between the last passing file check of a payoff step and the next
  event of any kind: long gaps are the rejoin problem, not the lesson.

**Three questions after the first week:**

1. Which step had the most failed attempts before it passed, and what was
   the failing code? (If the code is `regex.missing` on a step whose answer
   the parent says was right, loosen that pattern first.)
2. Where did sessions end: the last `check` before a gap over thirty
   minutes, per lesson and step, and was it failing? A step that ends
   sessions while failing is the first rewrite.
3. For each payoff step, how long from the file checks passing to the deploy
   `ok`, and did a `game` pass or a `next` follow within ten minutes? If not,
   the learner did not see the payoff: ask the parent whether it was the
   phone (rejoin, cache, permission) or the lesson.

And one question with no telemetry, for the parent: which **Try this** did
they actually do? A learner who varies is learning; a learner who only
passes checks is following a checklist.

---

## Appendix A: the PNG generator

Standard library only. Run from the repository root; it overwrites the six
PNGs in the skeleton. Any of them can be replaced by hand-drawn files of
the same size and name.

```python
"""Generate the skeleton's placeholder PNGs with the stdlib only (zlib + struct)."""
import struct, zlib, os

def png(path, w, h, rows, alpha):
    ctype = 6 if alpha else 2
    def chunk(tag, data):
        c = struct.pack(">I", len(data)) + tag + data
        return c + struct.pack(">I", zlib.crc32(tag + data) & 0xffffffff)
    raw = b"".join(b"\x00" + bytes(r) for r in rows)
    out = b"\x89PNG\r\n\x1a\n"
    out += chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, ctype, 0, 0, 0))
    out += chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b"")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    open(path, "wb").write(out)

def from_map(path, art, palette, alpha=True, scale=1):
    lines = art.strip("\n").splitlines()
    h, w = len(lines), len(lines[0])
    n = 4 if alpha else 3
    rows = []
    for line in lines:
        row = []
        for ch in line:
            px = palette[ch]
            row.extend(px if not alpha else (px if len(px) == 4 else px + (255,)))
        scaled = [v for i in range(0, len(row), n) for v in row[i:i + n] * scale]
        rows.extend([scaled] * scale)
    png(path, w * scale, h * scale, rows, alpha)

T = (0, 0, 0, 0)
WS = "course/templates/workspace/"
wand = """
..............YY
.............YWY
............YYYY
...........BB.Y.
..........BbB...
.........BbB....
........BbB.....
.......BbB......
......BbB.......
.....BbB........
....BbB.........
...BbB..........
..BbB...........
.BbB............
BbB.............
BB..............
"""
from_map(WS + "packs/kid_rp/textures/items/wand.png", wand,
         {".": T, "B": (74, 44, 20, 255), "b": (140, 90, 40, 255),
          "Y": (250, 210, 40, 255), "W": (255, 255, 255, 255)})
gem = """
................
................
....DDDDDDDD....
...DLLLLLLLLD...
..DLWWLLLLLLLD..
..DLWLLLLLLLLD..
..DLLLLLLLLLLD..
...DLLLLLLLLD...
....DLLLLLLD....
.....DLLLLD.....
......DLLD......
.......DD.......
................
................
................
................
"""
from_map(WS + "assets/gem.png", gem,
         {".": T, "D": (20, 90, 120, 255), "L": (80, 220, 240, 255), "W": (255, 255, 255, 255)})
dirt = []
for y in range(16):
    row = []
    for x in range(16):
        row.extend((240, 120, 190) if (x // 4 + y // 4) % 2 == 0 else (200, 70, 150))
        if (x * 7 + y * 3) % 11 == 0:
            row[-3:] = (255, 230, 250)
    dirt.append(row)
png(WS + "assets/dirt.png", 16, 16, dirt, alpha=False)
K = """
GGGGGGGG
GWGGGWGG
GWGGWGGG
GWGWGGGG
GWWGGGGG
GWGWGGGG
GWGGWGGG
GWGGGWGG
"""
from_map(WS + "packs/kid_rp/pack_icon.png", K, {"G": (60, 160, 80), "W": (255, 255, 255)}, alpha=False, scale=8)
from_map(WS + "packs/kid_bp/pack_icon.png", K, {"G": (60, 100, 180), "W": (255, 255, 255)}, alpha=False, scale=8)
star = """
OOOOOOOO
OOOWWOOO
OOOWWOOO
OWWWWWWO
OOWWWWOO
OOWWWWOO
OWWOOWWO
OOOOOOOO
"""
from_map(WS + "assets/pack_icon.png", star, {"O": (230, 140, 40), "W": (255, 255, 255)}, alpha=False, scale=8)
```
