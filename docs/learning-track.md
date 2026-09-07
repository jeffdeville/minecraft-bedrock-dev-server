# Learning Track

This is the living plan for building the game in the
[project plan](./2026-08-30-project-plan.md) while learning to program. It says
what to build, in what order, what to learn before each step, how a session
runs, and what the parent prepares ahead. Edit it as we go; it has no date
because it is never finished.

The learner knows Minecraft deeply and has never programmed. They work from a
Chromebook (Crostini plus the Android Minecraft app) against the Vultr dev
server. The parent is on a Mac. The working Sea Wolf submarine, the scanner, the
repair tool, the flare, and the trading shopkeeper already exist and are the
starting point; they are not rebuilt.

The order favors four things:

- Produce a playable result early and improve that same game loop afterward.
- Use familiar Minecraft features before writing custom systems.
- Introduce one important programming idea at a time.
- End almost every step with something visible that can be demonstrated in
  Minecraft.

## Rules of the road

1. **One step at a time.** The current step lives in [`LATER.md`](./LATER.md)
   under Now. Every other idea goes under Later, written by the person who had
   it. Nothing under Later is lost, and nothing under Later gets built early.
2. **Every step has a gate.** A step opens only after the learner has done its
   pre-work alone and passed a five-minute teach-back with the parent: explain
   the idea in their own words and answer the step's two teach-back questions,
   no notes. Failing a teach-back is normal and costs nothing except doing the
   reading again.
3. **The parent is two or three days ahead.** The parent does the same pre-work
   first, plus the parent-only items, and has the step working on a scratch
   branch before the learner starts it. The parent never learns the material for
   the first time while the learner waits.
4. **AI is a tutor for the learner and a tool for the parent.** The learner
   uses only `bin/tutor`, which cannot edit files and will not give answers
   before the help ladder is climbed. The parent uses ordinary Claude for
   planning, tooling, and preparing ahead. No AI writes gameplay code.
5. **Every change is explained before it is accepted.** Event, state,
   condition, effect. If the learner cannot name all four, the change is not
   done, however well it works.
6. **Tooling failures belong to the parent.** If `bin/sub dev`, the server, an
   import, or a version is the problem, the learner stops and the parent fixes
   it later. Fighting invisible tooling is not learning.
7. **Scripts are plain JavaScript.** Microsoft's own scripting introduction uses
   a plain `scripts/main.js` with no build tools, and `bin/sub` ships it as-is.
   TypeScript is a decision for Step 14, not before.

## How a session runs

Forty-five to sixty minutes, and the shape never changes:

| Minutes | What happens |
|---|---|
| 5 | Say back what the current step is for. Predict what today's change will do in the game. |
| 25–30 | Make the change. The learner types. The parent or the tutor asks, points, hints, in that order. |
| 10 | Play it. Does the prediction match? If not, that is the most interesting part of the session. |
| 5 | Teach-back in one sentence each: event, state, condition, effect. The parent commits with a message the learner dictates. |

If the change is not working at forty minutes, stop anyway, write down exactly
what was seen, and finish the play-and-teach-back on whatever does work. A
session that ends on time with a clear open question is a good session.

The help ladder, for the parent and the tutor alike: ask them to predict; ask
what evidence they see; point to the file or the documentation; give a small
hint; pair on the smallest blocking example; only then describe the fix and have
them type it. One rung at a time.

## Definition of done for every step

1. It can be demonstrated in Minecraft.
2. The previous playable path still works.
3. The learner can explain what event starts it, what state it reads or
   changes, and what visible effect results.
4. The change is saved in a small, named commit.
5. The next step is still only one step, not several systems started in
   parallel.

---

## Lesson 0: zero to one

Four short lessons, one or two sessions each, before Step 1. Everything after
this assumes them.

### 0a. Files, folders, and the terminal

- **Concepts:** a file has a name and lives in a folder; a path is its address;
  the terminal is a way to say "go here, show me that"; the editor changes
  files; git remembers save points.
- **Pre-work (learner, 20 min):** the parent shows the Crostini terminal and
  the editor once, then the learner does these alone: `ls`, `cd Submarine_BP`,
  `ls`, `cat manifest.json`, `cd ..`, `git status`, `git log --oneline`.
- **Session:** open the repo in the editor. Find `Submarine_BP/items/scanner.item.json`
  three ways: clicking folders, the file search box, and `ls` in the terminal.
  Read the Layout section of `README.md` together and say what each folder is
  for.
- **Teach-back:** What is the difference between saving a file and committing?
  Where does the scanner's behavior file live, as a path?
- **Parent ahead:** confirm the Chromebook checkout is current and `bin/sub
  check` passes there. Add `bin/` to the learner's PATH as `DEVELOPING.md`
  describes.

### 0b. JSON

- **Concepts:** objects `{}` hold named things; lists `[]` hold things in
  order; text goes in quotes; numbers do not; commas go between items and never
  after the last one; things nest.
- **Pre-work (learner, 45 min):**
  - JSON explained for twelve-year-olds: https://learningcorner.co/explain-anything/6136 (15 min)
  - Bedrock Wiki, Understanding JSON: https://wiki.bedrock.dev/guide/understanding-json (30 min; Minecraft-flavored, covers the mistakes that matter)
- **Session:** paste `Submarine_BP/manifest.json` into https://jsoncrack.com/editor
  and match the picture to the text. Then break `scanner.item.json` on purpose
  three ways (delete a comma, add a trailing comma, remove a quote), run
  `bin/sub check` after each, and read what it says. Fix each one before the
  next.
- **Teach-back:** In `shopkeeper_trades.json`, is `wants` a list or an object,
  and how do you know? Why does a missing comma stop the whole file from loading
  instead of just one line?
- **Parent ahead:** do the three breakages yourself and note exactly what
  `bin/sub check` prints for each, so you know the error text before the learner
  sees it. Optional: try the bridge. web editor (https://editor.bridge-core.app),
  whose tree view cannot make syntax errors, as a fallback for a frustrated day.

### 0c. What an add-on is

- **Concepts:** two packs, behavior and resource; a manifest with UUIDs names
  each pack; an identifier like `sub:scanner` is the only thing that connects
  the two halves; Minecraft says nothing when the halves do not match.
- **Pre-work (learner, 45 min):**
  - Microsoft Learn, Getting Started with Add-Ons (skim; skip the Windows folder part): https://learn.microsoft.com/en-us/minecraft/creator/documents/gettingstarted (20 min)
  - Bedrock Wiki, Introduction and Add-Ons Explained: https://wiki.bedrock.dev/guide/introduction (25 min)
- **Session:** with the "Adding a custom item" section of `DEVELOPING.md` open,
  draw on paper every file the word `scanner` appears in and what each file is
  for. Then use the editor's search to check the drawing. Eight files is the
  answer.
- **Teach-back:** If the scanner shows up as a purple-and-black cube, which
  half is broken and what would you search for first? What does the manifest's
  `dependencies` block say, in plain words?
- **Parent ahead:** re-read the "two indirections" paragraph in `DEVELOPING.md`
  so you can explain `minecraft:icon` naming a key rather than a file.

### 0d. The loop

- **Concepts:** save, build, deploy, join, see. The build checks before it
  ships. A change that does not appear is usually a version or a pack-list
  problem, not a code problem.
- **Pre-work (learner, 15 min):** read `DEVELOPING.md` from the top through
  "The commands".
- **Session:** with `bin/sub dev` running, change the scanner's display name in
  `Submarine_RP/texts/en_US.lang`, watch the build output, join the server, and
  find the new name in the inventory. Then change it back.
- **Teach-back:** Walk through the diagram at the top of `DEVELOPING.md` out
  loud. Which of those boxes did your change pass through?
- **Parent ahead:** confirm the Chromebook-to-Vultr loop works end to end that
  morning, and choose which text the learner may change so it is guaranteed to
  be visible.

**Gate to Step 1:** all four teach-backs passed. The learner adds their own
first line to `LATER.md` under Later, in the editor, and the parent commits it.

---

## First playable rescue: Steps 1–8

The goal is a tiny version of the entire game: find gold, buy a scanner,
research a tool, decode a message, and rescue one survivor. It can be crude, but
it must be playable from beginning to end.

### Step 1. Declare Version 0

- **Build:** summon the Sea Wolf, drive it underwater, exit, re-enter. Summon
  the shopkeeper and buy a scanner. Record every command and every file that
  makes these work. Do not improve anything. The scanner, repair tool, flare,
  and shopkeeper are part of Version 0 and are frozen until their steps.
- **Concepts:** a working baseline is protected; a git tag is a named save point
  you can always return to; a fresh world is the only honest test.
- **Pre-work (learner, 20 min):** none to read. Play, in a fresh world on the
  dev server, and write down every command used.
- **Session:** put those commands in a new file `docs/VERSION-0.md`, one line
  per thing that works and one per thing that does not. The learner types it.
  The parent tags the commit `v0`.
- **Teach-back:** Why do we not fix the things that do not work right now? What
  does the tag let us do later?
- **Parent ahead:** create the fresh test world on the server and snapshot it
  with `bin/sub backup`.
- **Done when:** the learner can create a fresh test world and demonstrate the
  same working submarine and shop.

### Step 2. Build a tiny development bay

- **Build:** in a disposable Water World, build only a dock and spawn point, a
  small laboratory, a shop counter, one shallow loot deposit, and one surface
  life pod. Ordinary blocks and structure blocks. Signs explaining the intended
  route.
- **Concepts:** a test environment is smaller than the final world; signs are
  documentation; a structure block saves a build the way git saves a file.
- **Pre-work (learner, 30 min):** the Minecraft wiki page on structure blocks,
  saving and loading. Sketch the five locations on paper first.
- **Session:** build it in game. No code. Save each location as a structure.
  This is a design session the learner already knows how to lead.
- **Teach-back:** Where is the route, and what would confuse a stranger? What
  is the smallest version of this that still lets us test Step 3?
- **Parent ahead:** confirm structure blocks work on the server and where the
  structure files land, so they can be backed up.
- **Done when:** another person can walk through the area and identify all
  five locations.

### Step 3. First loot-to-shop transaction, no code

- **Build:** gold in the shallow loot chest. The shopkeeper's trade exchanges
  that gold for the scanner.
- **Concepts:** composition means connecting existing mechanics instead of
  implementing everything yourself; a trade table is data, not code; the
  shopkeeper is born with its trade list.
- **Pre-work (learner, 30 min):** the "Selling it at the shop" section of
  `DEVELOPING.md`. Microsoft Learn, NPC dialogue, for the alternative approach:
  https://learn.microsoft.com/en-us/minecraft/creator/documents/npcdialogue
- **Session:** adjust `Submarine_BP/trading/shopkeeper_trades.json` so the
  scanner costs what the chest can pay, despawn and re-summon the shopkeeper,
  buy it. If the trade does not change, the teach-back question is why.
- **Teach-back:** Why did the old shopkeeper keep the old prices? What does
  `price_multiplier: 0` do?
- **Parent ahead:** none beyond doing it once yourself.
- **Done when:** the player can retrieve gold and visibly purchase the scanner.

### Step 4. Own the custom scanner

The scanner exists, so this step is about understanding it rather than making
it.

- **Build:** change one visible thing in each half of the scanner: the stack
  size in the behavior pack, the icon or display name in the resource pack.
  Break the identifier in one half on purpose, see the purple cube, fix it.
- **Concepts:** namespaces; the behavior half and the appearance half; the
  eight-file map from Lesson 0c becomes real.
- **Pre-work (learner, 1.5 h over two sittings):**
  - Microsoft Learn, Create an Angry Cow (behavior packs, done in the browser at mctools.dev, has a video): https://learn.microsoft.com/en-us/minecraft/creator/documents/behaviorpack (45 min)
  - Microsoft Learn, Custom Grass Blocks (resource packs): https://learn.microsoft.com/en-us/minecraft/creator/documents/resourcepack (45 min)
- **Teach-back:** Which file decides what the scanner does, and which decides
  how it looks? If we wanted a second item called `sub:sonar`, list the files.
- **Parent ahead:** read Microsoft Learn, How to Add Custom Items:
  https://learn.microsoft.com/en-us/minecraft/creator/documents/addcustomitems
  so you can answer "why is this in the item file and that in the attachable".
- **Done when:** both changes are visible in game and the deliberate break has
  been found and fixed without help.

### Step 5. The first script: scan one fragment

Coding begins here. Three sessions, in plain JavaScript.

- **Build:** one clearly marked repair-tool fragment in the test bay. Subscribe
  to the scanner's use event. When the scanner is used near the fragment, play
  an existing sound or particle and display "Repair tool fragment scanned." The
  handler stays tiny: recognize the scanner, recognize the fragment, call a
  `scanFragment` function.
- **Concepts:** a script runs when the world loads; an event is something that
  happened; `subscribe` means "tell me when"; a function is a named recipe; an
  `if` is a decision; a message to the player is how you see what the code saw.
- **Pre-work (learner, 3 h over three sittings, in this order):**
  1. Microsoft Learn, Introduction to Scripting. It teaches variables, if, functions, and arrays using Minecraft, with no tooling: https://learn.microsoft.com/en-us/minecraft/creator/documents/scripting/introduction (2 h in two sittings, typing every example into mctools.dev)
  2. Bedrock Wiki, Intro to Scripting, for the modern pattern: https://wiki.bedrock.dev/scripting/scripting-intro (30 min)
  3. Microsoft Learn, Working With Events: https://learn.microsoft.com/en-us/minecraft/creator/documents/scripting/events (30 min)
- **Session one:** a script whose whole job is to send "Hello from the Sea
  Wolf" when the world loads. Save, wait for the build, see it in chat. That is
  the entire session, and it is the most important one in the track.
- **Session two:** subscribe to item use. When any item is used, send its
  `typeId` to the player. Play: use five different items and read the names.
- **Session three:** the `if`. Only when the item is `sub:scanner`, and only
  when a fragment is nearby, call `scanFragment()`.
- **Teach-back:** Event, state, condition, effect for the scanner. What would
  happen if the `if` were removed? Where would you put a message to prove the
  event fired at all?
- **Parent ahead (start a week early):**
  - Add a `script` module to `Submarine_BP/manifest.json` with
    `"entry": "scripts/main.js"` and a dependency on `@minecraft/server` at
    the stable version the server runs. The sock-bomb project in
    `~/projects/minecraft` has a working manifest to copy; that server is on
    2.9.0.
  - Raise `min_engine_version` to match. It is currently `1.20.0`.
  - Confirm `console.warn("hi")` from the script is visible on the server
    console page. This was not verifiable from documentation; test it.
  - Set `RELOAD_MODE=reload` in `.env` for scripting sessions. Scripts re-run
    in two seconds without disconnecting anyone. JSON changes still need a
    restart, so switch back for pack work.
  - Read the reference pages for `world.afterEvents.itemUse`,
    `system.runInterval`, `world.sendMessage`, and `player.sendMessage`,
    linked from https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/world
  - Decide how "fragment nearby" is detected. The simplest honest version is a
    tagged entity or a specific block within a few blocks of the player.
- **Done when:** using the scanner succeeds and using another item does
  nothing.

### Step 6. Track three unique scans

- **Build:** three repair-tool fragments in the bay. A visible scoreboard value
  `Repair scans: 0/3`. Each fragment has an identity, and the same fragment
  cannot count twice for one player. Progress is reported after each scan.
- **Concepts:** a variable holds a number; a scoreboard is a variable you can
  see; identity means "which one", not "what kind"; state that is not saved
  disappears.
- **Pre-work (learner, 1 h):**
  - Microsoft Learn, Scoreboards: https://learn.microsoft.com/en-us/minecraft/creator/documents/scoreboardintroduction (30 min)
  - The Scoreboard and ScoreboardObjective reference pages, skimming the samples: https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/scoreboard (30 min)
- **Teach-back:** What is the difference between "three scans" and "three
  different fragments"? Where does the list of scanned names live when the
  player logs out, and is that a problem yet?
- **Parent ahead:** understand dynamic properties on the World page, even
  though the learner uses scoreboards first; you need to know where this is
  going.
- **Done when:** three different fragments produce 3/3, while rescanning one
  does not increase the count.

### Step 7. Turn completed research into a useful tool

- **Build:** at 3/3 the laboratory issues a repair-tool blueprint token. The
  shop accepts the token plus gold for the repair tool. Using the tool on a
  broken console at the surface life pod visibly changes it to repaired.
- **Concepts:** prerequisites; a state that changes from broken to repaired;
  chaining two small systems.
- **Pre-work (learner, 30 min):** re-read the trading section; read the
  existing `repair_tool.item.json` and say what each line does.
- **Teach-back:** What stops the player buying the repair tool before research?
  Which file is that rule in, code or data?
- **Parent ahead:** choose how the token exists (an item, a tag, a score) and
  have a working version on a scratch branch.
- **Done when:** the console cannot be repaired before research and can be
  repaired afterward.

### Step 8. Decode a transmission and rescue the first survivor

- **Build:** a distress transmission in the shallow loot deposit. The
  laboratory accepts it and reveals simple coordinates or a beacon for the
  surface pod; the final map system waits. An NPC survivor in the pod; after the
  console is repaired, interacting with them records `Crew rescued: 1/5` and
  plays a small celebration. A reset command so the loop can be replayed.
- **Concepts:** an event-driven quest is a sequence of explicit states; a
  reset makes testing fast.
- **Pre-work (learner, 45 min):** Microsoft Learn, NPC dialogue (Step 3), plus
  a re-read of this step.
- **Sessions:** two minimum. First the transmission and the pointer to the pod.
  Then the survivor, the score, the celebration, and the reset.
- **Teach-back:** List the states in order from "no gold" to "rescued". Which
  event moves the player from each state to the next?
- **Parent ahead:** the reset command and a summon-everything script are parent
  tooling; have them ready.
- **Done when:** someone can play from zero gold to the first rescue without
  operator commands.

**Playable milestone A.** Tag `milestone-a`. The project is now a small game
rather than a collection of assets. Celebrate in a way the learner chooses.

---

## First depth progression: Steps 9–13

These extend the working rescue loop with vehicle rules and per-entity state,
without enemies yet. Learning material is sketched; fill it in as Milestone A
approaches.

### Step 9. Give the Sea Wolf a depth limit

- **Build:** a warning when the occupied Sea Wolf approaches 25 blocks below
  the surface. Below its limit, pressure damage at a slow, testable interval.
  A scheduled check that does not run expensive work for every entity every
  tick. A developer-only way to display current depth and pressure state.
- **Concepts:** coordinates, repeated updates, elapsed time, separating
  warnings from damage.
- **Pre-work:** `system.runInterval` and `system.currentTick` on the System
  reference page; the Entity `location` property.
- **Parent ahead:** decide the interval and how to find occupied submarines
  cheaply.
- **Done when:** the submarine is safe above the limit, warns near it, and
  takes damage below it.

### Step 10. Create and install Depth Module I

- **Build:** depth-module fragments in the scan/lab/shop loop. Using the
  purchased module on the Sea Wolf installs it. The installed module is stored
  on that individual submarine, not globally. Safe depth rises and something
  visible changes.
- **Concepts:** a small object with named fields, entity-specific persistent
  state, parameterizing behavior instead of copying it.
- **Pre-work:** the dynamic properties sections of the World and Entity
  reference pages.
- **Parent ahead:** test that an entity dynamic property survives a server
  restart.
- **Done when:** two submarines can have different safe depths and keep them
  after leaving and reopening the world.

### Step 11. Add pressure danger for a swimming player

- **Build:** warning and damage when a player swims below the first personal
  depth limit outside a submarine. A player riding inside is not also damaged.
- **Concepts:** combining conditions; identifying the player's current context.
- **Pre-work:** Player and Entity reference pages: riding and in-water
  properties.
- **Parent ahead:** find the reliable way to know a player is inside the Sea
  Wolf.
- **Done when:** the same depth is dangerous while swimming but safe inside a
  properly upgraded Sea Wolf.

### Step 12. Create Reinforced Suit I

- **Build:** suit fragments in the loop. Reuse equipment slots rather than a
  separate suit interface. The safe swimming depth rises only while the full
  required equipment is worn.
- **Concepts:** inspecting inventory and equipment; composing a feature from an
  existing Minecraft system.
- **Pre-work:** the armor section of Microsoft Learn, How to Add Custom Items.
- **Parent ahead:** confirm custom armor renders on the Android client.
- **Done when:** equipping and removing the suit immediately changes the safe
  depth.

### Step 13. Build and rescue a second, sunken life pod

- **Build:** one loot deposit and life pod below the starting limits but within
  the upgraded limits. Its transmission is revealed only after the first rescue.
  The player must leave the submarine at depth and use the repair tool. Record
  `Crew rescued: 2/5`.
- **Concepts:** designing content around established rules; testing for
  progression deadlocks.
- **Parent ahead:** write the depth table the project plan asks for.
- **Done when:** the rescue is impossible with starting equipment and
  comfortably possible with both upgrades.

**Playable milestone B.** Tag `milestone-b`. The game has a complete
upgrade-and-depth progression arc.

---

## Turn the prototype into reusable systems: Steps 14–15

### Step 14. Refactor only after the repeated pattern is visible

- **Build:** compare repair tool, depth module, and reinforced suit research.
  Define a small technology record with ID, display name, required scans,
  price, and resulting item. Make the scanner and laboratory use those records
  instead of copied logic. Keep storage behind a few named functions such as
  `getScanCount`, `recordScan`, and `unlockTechnology`.
- **Concepts:** records, arrays or maps, data-driven design, composition.
- **Decide here, not before:** whether to adopt TypeScript. This is the moment
  types would help a beginner see structure. It costs Node in Crostini and a
  compile step in `bin/sub`. If JavaScript is still comfortable, stay with it.
- **Done when:** adding a harmless test technology mostly means adding data
  rather than copying an event handler.

### Step 15. Replace prototype state carefully

- **Build:** keep scoreboards for values worth displaying. Move hidden
  per-player and per-entity state to namespaced dynamic properties where that
  makes the code clearer. Add a state version and a developer reset before
  changing stored formats.
- **Concepts:** the difference between a game's data model and the mechanism
  used to save it.
- **Done when:** scans, rescues, unlocks, and installed modules survive a world
  restart and can be reset intentionally.

**Engineering milestone.** The project has a small foundation that supports
more content without duplicating every feature.

---

## First leviathan encounter: Steps 16–20

The learner will want to start here. Do not. Pre-work for Step 16 is Microsoft
Learn, Creating New Entity Types
(https://learn.microsoft.com/en-us/minecraft/creator/documents/introductiontoaddentity)
and the three-part Goblin Chef Blockbench videos
(https://learn.microsoft.com/en-us/minecraft/creator/documents/makerseriesmakingthegoblinchef).
Fill in the rest when Milestone B is near.

### Step 16. The simplest possible leviathan in a separate test arena

- **Build:** start from built-in entity components for swimming, health, target
  selection, pursuit, and attack. A placeholder model if final art would slow
  the behavior work. No grabbing yet.
- **Concepts:** entity component composition and behavior priorities.
- **Done when:** the creature swims, notices an intended target, chases it, and
  causes damage.

### Step 17. Teach the leviathan to threaten the submarine

- **Build:** it recognizes the Sea Wolf as a target. Obvious feedback when the
  submarine is hit: sound, particles, knockback, health change, or a message.
  Tune only enough to be understandable.
- **Concepts:** entity families and tags, target filtering, observing
  interactions between components.
- **Done when:** the player can reliably reproduce and explain a leviathan
  attack on the Sea Wolf.

### Step 18. Add Electroshock I as the first defense

- **Build:** through the existing research and purchase system. Triggered by a
  suitable vehicle action. Repels or interrupts a nearby leviathan with strong
  feedback and a visible cooldown or charge limit. "Repel when close" first;
  the full grab-and-release later.
- **Concepts:** cooldown state, distance checks, coordinating an input event
  with several effects.
- **Done when:** the shock saves a prepared player but cannot be spammed.

### Step 19. Add a flare decoy

- **Build:** the flare item creates a temporary bright marker entity. Built-in
  targeting rules make the leviathan choose the flare over the player or
  submarine. The marker is removed after a fixed time. Helicopter extraction is
  deferred.
- **Concepts:** spawning entities, timers, cleanup, changing behavior through
  composition.
- **Done when:** a player can throw a flare, watch the leviathan change
  targets, and escape.

### Step 20. Place the third rescue behind the leviathan encounter

- **Build:** a hand-built rescue area solvable by avoidance, a flare, or
  electroshock. Killing the leviathan is not required. Record `Crew rescued:
  3/5`.
- **Concepts:** mechanics become a game when level design gives players
  meaningful choices.
- **Done when:** at least two different strategies complete the rescue.

**Playable milestone C.** Exploration, progression, danger, and defensive
choices.

---

## Facility rescue: Steps 21–23

### Step 21. Make one reusable sealed door

- **Build:** the simplest airtight test room. A laser-cutter item whose
  behavior attaches to the door through an item or block event or custom
  component. Sealed to open, with sound and particles.
- **Concepts:** reusable components; separating a tool's behavior from a
  particular level.
- **Done when:** the same cutter behavior opens two separately placed doors.

### Step 22. Build a very small escape-room facility

- **Build:** ordinary blocks, doors, redstone, buttons, containers, and
  structure blocks for most of it. Two or three obstacles including the sealed
  door. Enemies stay outside.
- **Concepts:** custom code only at the gaps between existing mechanics.
- **Done when:** a player with the required equipment can enter, solve, and
  exit.

### Step 23. Put the fourth life pod inside the facility

- **Build:** its transmission is gated until the player can reasonably have
  unlocked the laser cutter. Reach it by submarine, finish on foot. Record
  `Crew rescued: 4/5`.
- **Concepts:** prerequisites should guide the player without revealing
  implementation details.
- **Done when:** the mission is playable and cannot be assigned too early.

**Playable milestone D.** Four rescues exercise four increasingly deep versions
of the same loop.

---

## Cyclops and final rescue: Steps 24–27

### Step 24. Make a minimal rideable Cyclops

- **Build:** reuse the Sea Wolf's proven movement and vehicle components.
  Change only model or skin, scale, health, speed, and seating. Two seats
  working before weapons, inventory, or modules.
- **Concepts:** extending a known design by changing one dimension at a time.
- **Done when:** two occupants can enter, travel, exit, and re-enter reliably.

### Step 25. Add one Cyclops capability at a time

- **Build:** first a Minecraft container as inventory. Then the built-in laser
  with limited charge or overheat, reusing the cooldown utilities from
  electroshock. Then existing depth, speed, durability, and damage module
  definitions where they apply.
- **Concepts:** reuse across entities; the value of stable interfaces.
- **Done when:** each capability works independently before the next is added.

### Step 26. Add the four-slot loadout rule

- **Build:** an ordinary container or four clearly represented slots, not a
  custom screen. Vehicle capabilities are calculated from installed items.
  Invalid or duplicate combinations are rejected with a helpful message.
- **Concepts:** collections, validation, derived values, tradeoffs in design.
- **Done when:** changing the four items changes the Cyclops without editing
  code or summoning another variant.

### Step 27. Build one compact late-game biome and the final rescue

- **Build:** a small Inactive Lava Zone from existing magma, lava, structures,
  sounds, particles, and lighting. A Sea Dragon composed from the leviathan
  behaviors already built. The final pod placed where reaching it requires the
  Cyclops and late equipment. Record `Crew rescued: 5/5` and show a victory.
- **Concepts:** finishing a small complete game is worth more than beginning a
  huge unfinished world.
- **Done when:** a new test player can progress from the first loot chest to
  victory.

**Playable milestone E.** The minimum complete game exists.

---

## Expand only after the game can be finished: Steps 28–30

28. **Grow the content, not the number of systems.** More hand-built loot
    deposits, transmissions, facility rooms, and routes using structure blocks
    and loot tables. The third deep-ocean region. Vary leviathans using proven
    behaviors until the roster of four is complete.
29. **Add deferred spectacle one feature at a time.** Full grab-and-release.
    Submarine headlights. Laser visuals and overheat polish. Emergency flare
    extraction with the helicopter and Planes Pro magnet. Map presentation
    better than coordinates or beacons. Torpedoes only if combat still needs
    them after playtesting.
30. **Balance and polish through playtesting.** Tune prices, fragment counts,
    restocking, depth bands, damage, cooldowns, and travel time. Fix progression
    traps before adding content. Add sounds, particles, names, dialogue, and art
    as short reward tasks between harder debugging sessions. Ask testers where
    they became confused instead of explaining the game while they play.

---

## The parent's work

### This week

In order. Each is small; together they make Step 5 boring instead of a wall.

1. Read Microsoft's Creator Learning Journey once, to know the map:
   https://learn.microsoft.com/en-us/minecraft/creator/documents/learningjourneyguide
2. Do Lessons 0b and 0c yourself, including breaking the JSON three ways.
3. Do the Introduction to Scripting in mctools.dev end to end. Two hours. This
   is the single most valuable thing to do ahead of the learner.
4. Add the script module to the manifest and prove `console.warn` reaches the
   console page. Commit it on a branch, not main, until Step 5 opens.
5. Pin the toolchain in `DEVELOPING.md`: server version, `@minecraft/server`
   version, `min_engine_version`, and `RELOAD_MODE` per kind of work.
6. Run `bin/tutor` yourself for ten minutes pretending to be stuck on JSON, and
   adjust `tutor/tutor.md` if it is too soft or too stiff.

### Before Milestone A

7. Back up the development world automatically and keep a known-clean
   test-world snapshot.
8. Create three scripts or documented actions: reset player progress, summon
   test entities and items, teleport to the development bay.
9. Enable diagnostics: the content log, preserved source maps, and an obvious
   developer mode with concise chat or action-bar messages.
10. Tag each playable milestone so there is always a safe version to return to.

### Principles that stay true throughout

- **Keep declarative content declarative.** Entity components, component
  groups, events, loot tables, trade tables, NPC dialogue, tags, scoreboards,
  equipment, structures, sounds, and particles come first when they already
  express the behavior.
- **Reserve scripts for coordination and rules Minecraft cannot express
  cleanly:** scan progress, unlock prerequisites, pressure checks, module
  calculations, cooldowns, quest sequencing, persistence.
- **Keep event handlers thin.** A handler identifies what happened and calls a
  named game function.
- **Wait for repetition before generalizing.** Two or three concrete
  technologies first, then the shared record at Step 14.
- **Separate saved state from game rules.** Game code asks
  `hasUnlocked(player, technology)` rather than reading a scoreboard or dynamic
  property everywhere.
- **Namespace everything with `sub:`**: entities, items, blocks, events, tags,
  scoreboards, dynamic properties.
- **Build a tiny debug API before state gets complex.** Inspect a player's
  scans, unlocks, and rescues and a vehicle's modules; reset either one
  deliberately.
- **Keep the world small until Milestone E.** Hand-place the first examples.
  Procedural distribution, elaborate maps, custom interfaces, and the full
  world are later optimizations.
- **Ask AI for small diffs, and require an explanation.** One acceptance test,
  no unrelated refactors, changed files reviewed together. The learner names
  event, state, condition, and effect before any AI-suggested change is
  accepted. Never "build the scanner system" or "make the game".

---

## Resources, with staleness warnings

Bedrock scripting changed completely in 2023. Anything that says GameTest or
`mojang-minecraft`, or is dated before 2023, is wrong now. The 2018 "Bedrock
Scripting API Tutorial" YouTube playlist that search engines still surface is
obsolete.

- Microsoft Learn Creator docs, the source of truth: https://learn.microsoft.com/en-us/minecraft/creator/
- mctools.dev, Mojang's browser editor and validator, runs on the Chromebook with no install: https://learn.microsoft.com/en-us/minecraft/creator/documents/mctoolsoverview
- Bedrock Wiki, the best community reference, kept current: https://wiki.bedrock.dev/
- Bedrock Creator Camp 2025 recordings, day one is tutorials: https://learn.microsoft.com/en-us/minecraft/creator/documents/creatorcamp
- Microsoft's Beginner's Series to JavaScript, 51 short videos, if the scripting intro moves too fast: https://learn.microsoft.com/en-us/shows/beginners-series-to-javascript
- JSON Crack, to see nesting as a picture: https://jsoncrack.com/editor
- bridge. web editor, whose tree view cannot make a syntax error: https://editor.bridge-core.app
- Bedrock Add-Ons Discord for questions, thirteen and up, supervised: https://wiki.bedrock.dev/discord
- Script API reference pages used early: World, System, Scoreboard, and
  Entity under https://learn.microsoft.com/en-us/minecraft/creator/scriptapi/minecraft/server/
