# Game-arc courses: should lessons build toward a game?

2026-09-07. An opinion for the course owner, written against
`course/FORMAT.md`, the sixteen live lessons in
`docs/2026-09-07-course-design.md`, the Code Kingdoms notes in the
feasibility brief, `docs/learning-track.md`, and the API research report.
API behaviour I could not confirm from a document is marked **verify**.

## 1. My view

You are right, and the reason is structural. Fifteen of the sixteen cards
end with "one thing behaves differently"; only `15-quest` assembles anything,
and it assembles a demonstration of four ideas, not a game anyone plays
twice. That was a deliberate trade: independence bought a payoff in every
lesson and an answer button that cannot destroy earlier work. It cost the
reason to come back tomorrow.

For a twelve-year-old alone at home, the strongest motivator available is not
"see something change" but "my game is better than yesterday, and I can play
it": competence and autonomy, and a goal that makes the next lesson wanted
rather than assigned. An arc also makes the learner
re-read and extend code they wrote a week ago, which is where transfer
happens, and it enforces the learning track's own rule that the previous
playable path still works.

The costs are real. Coupling: lesson 6 broken means lesson 7 cannot start.
A longer runway in each lesson before the visible change. Expertise
reversal: a learner who did the cards first will find an arc that re-explains
events and `if` slow, so the arc must move faster than the cards, not repeat
them.

Code Kingdoms got exactly that benefit from the arc ("I made a mod, then a
game"), and both complaints in the review are the coupling cost left
unmanaged: an exact-match check on one chapter stopped the whole course, and a
kid who came back to a project that no longer ran had no way forward except a
parent. Those are engineering problems with known fixes, not reasons to avoid
arcs. One more reason specific to this house: a nine-lesson arc is the
learning track's method at one-tenth scale, and whatever goes wrong here is
cheaper to learn on a parkour course than on the rescue game.

## 2. How arcs and cards coexist

Keep the sixteen cards exactly as they are. Add **courses**: six to ten
lessons that build one minigame in a fixed order. Rule 3 in FORMAT.md
becomes: *Courses and cards do not depend on each other. Inside a course,
lesson N assumes N-1 is done, and the platform can bring the workspace to any
lesson's starting point.*

What makes that safe is that a course owns its files. Its script lives in
`packs/kid_bp/scripts/<course>.js`, imported from `main.js` by one line the
course's first lesson adds (`import "./parkour.js";`; Bedrock loads relative
ES modules inside `scripts/`). Cards keep writing `main.js`; the course never
touches it again; neither can fail the other's checks. A syntax error in
either file still stops the whole script module, so the panel's `broken`
block and `deploy scripts_ok` remain the net for both.

Format changes, kept to what the mechanism needs:

- Frontmatter: `course: parkour` and `after: parkour-03-stopwatch` (omitted
  on a course's first lesson and on cards). `build-tags` refuses a cycle or
  an `after` it cannot find.
- One file per course, `course/courses/<id>.md`: `id`, `title`, `files` (the
  paths the course owns), a paragraph of pitch, one GIF of the finished game.
  The picker shows the pitch while the course is unstarted.
- Tags keep their shape. `build-tags` replays a course's lessons in `after`
  order after the cards, so lesson N's `step-1` tag already contains lessons
  1..N-1: cumulative by construction, no overlay copying. After each step it
  runs that lesson's checks **and the final step of every earlier lesson in
  the course**: a solution that breaks the previous playable path fails the
  build.
- `lesson start ID` (panel: **Start from here**): checks out the course's
  `files` from `lesson/ID/step-1`, nothing else. It never writes `main.js`
  beyond the import line and never touches card work. Logged as
  `event: start`. The panel offers it when a course lesson opens and its
  predecessor's checks fail: "Lesson 4's part is not working. Fix it, or
  start this lesson from its starting point (your cards are safe)."
- The picker groups **Cards** (the sixteen, any order) and one group per
  course in order, "3 of 9 done". `lesson next` inside a course follows
  `after`; at the end it returns to the picker.
- Course checks still assert only what the lesson adds; an earlier lesson's
  line appears only inside a `same` check, never as "is lesson 4 still
  there".
- `PARENT.md` gains a section per course, one line per lesson.

Skeleton, rejoin paragraph, check types, events schema: unchanged.

## 3. Which game first

| | Parkour | Dodgeball | Capture the flag | Protect the beacon | Treasure hunt |
|---|---|---|---|---|---|
| Playable alone | Yes; a solo genre | Only as "dodge the turret" | No | Yes | Yes |
| Fits the 2.9 API | `pressurePlatePush`, `location`, `teleport`, `setGameMode`, ticks, dynamic properties, scoreboard; no entities | Projectile spawning and velocity; physics tuning eats sessions | Two teams, a flag entity | `spawnEntity`, `entityDie`, distance checks; needs survival mode | Tags, NPC, `itemUse`: the quest card enlarged |
| Every lesson playable | Yes: each adds one feature to a course that already runs | Lessons 1 and 2 are arena plumbing | Two-lesson setup | Two lessons before a wave exists | Yes |
| Idea order | Event, condition, state, timer, location, function, data, shared data | Physics before state | — | Loops and arrays early, out of order for this learner | Repeats the cards |
| World building | The learner builds the course by hand: the point, and the latitude Code Kingdoms lacked | An arena | Two bases | Arena and spawners | A map |
| Degrades when a lesson fails | A broken clock leaves a working start and finish | Dead arena | Dead | Waves stop | Fine |
| Payoff for a Minecraft kid | High: parkour maps are what twelve-year-olds already play and build; beat-your-time is a real replay loop | Medium alone | Needs friends who are not here | High | Medium |

**Parkour first.** Its input device is blocks the learner places (a pressure
plate on a gold block is the start, on a diamond block the finish), so "the
world is data your code reads" is taught by the learner's own building. It
runs in creative on a solo server from lesson 1 and gives a real reason to
replay alone. **Protect the beacon second**: the home for spawning
entities, arrays and the survival/creative switch, and it works alone.
Dodgeball folds into it (a snowball turret is one lesson). Capture the flag
is not for this learner; it needs people who are not on the server.

## 4. The parkour arc, lesson by lesson

Nine lessons in `packs/kid_bp/scripts/parkour.js`, with its own import line,
so the skeleton's line 4 is never edited. Every lesson: a `js` check, `deploy
… scripts_ok` in the payoff step, the rejoin paragraph, and a **Play it
first** line at the top: run your course once before changing anything.
Before lesson 1, a **build session** with no code: in creative, a gold start
platform with a pressure plate, six to ten jumps, a diamond block with a
plate at the end, iron blocks with plates at two spots between. Twenty
minutes, led by the learner; the parent can join.

**P1. A plate that talks.** Idea: a block you placed can be an event. Build:
new file `parkour.js` with its import and a
`world.afterEvents.pressurePlatePush` handler that says GO! in chat and plays
`random.orb`; one line in `main.js`: `import "./parkour.js";`. Payoff: step
on any plate, chat and a sound. Checks: `exists` parkour.js; regex for the
import line; regex `pressurePlatePush\s*\.subscribe`; `js`.
**Verify** on the live server: whether the event also fires when the plate
releases; if so, `if (event.redstonePower === 0) return;` goes into P2's
snippet, explained as "stepping off is also a push".

**P2. Start and finish.** Idea: `if` on what the world says. Build: `const
under = event.block.below().typeId;` then two `if`s: gold says GO!, diamond
says FINISH! with `random.levelup`. Payoff: the course has a start and an
end; other plates are silent. Checks: regex `below\(\)`, one regex per `if`
with the exact identifier, `js`. Predicted: `minecraft:gold` (the regex
names it); the plate beside the block instead of on it (a two-block picture
in the hint).

**P3. The stopwatch.** Idea: a box remembers when you started; the game
counts in ticks. Build: `let startTick = 0;` at the top; gold sets `startTick
= system.currentTick;`; diamond computes `const seconds = (system.currentTick
- startTick) / 20;` and shows it with `setTitle`. Payoff: finish, see your
time. Checks: `^let\s+startTick`, `system\.currentTick`, `/\s*20`, `js`.
Predicted: `let` inside the handler (anchored regex; message says "outside
every block").

**P4. The live clock.** Idea: an interval that acts only when a box says yes.
Build: `let running = false; let runner = null;` gold sets both, diamond
clears `running`; `system.runInterval` every 5 ticks with `if (running)
runner.onScreenDisplay.setActionBar(...)`. Payoff: the clock runs on screen
while you jump. Checks: `runInterval`, `if\s*\(\s*running\s*\)`,
`setActionBar`, `js`. One runner at a time, and the lesson says so. *(Second
player: shows the last starter's clock; the first "Later" item.)*

**P5. Fall and come back.** Idea: a position is data; compare it, act on it.
Build: `let spot = null;` gold saves `runner.location`; in the interval,
`if (runner.location.y < spot.y - 3) { runner.teleport(spot);
runner.playSound("mob.endermen.portal"); }`. Payoff: fall, whoosh, back on
the start. Checks: `location\.y\s*<`, `teleport\(\s*spot`, `js`. Predicted:
a downhill course (hint: build upward, or change the 3).

**P6. Checkpoints.** Idea: overwrite a box mid-game. Build: a third `if` for
iron: `spot = event.source.location;`, "Checkpoint!", a sound. Payoff: fall
after a checkpoint, return there. Checks: regex for the iron `if`,
`spot\s*=\s*event\.source\.location`, `js`.

**P7. Start and finish are recipes.** Idea: a function names a bundle of
lines so two places can run it. Build: `function startRun(player)`
(startTick, running, runner, spot, `player.setGameMode(GameMode.Adventure)`,
sound) and `function finishRun(player)` (time, title, `GameMode.Creative`
back); the gold and diamond `if`s become one call each; a
`system.afterEvents.scriptEventReceive` handler runs `startRun` on
`/scriptevent parkour:restart`. `GameMode` joins this file's import. Payoff:
no flying or block breaking during a run, creative again at the finish, and a
restart from chat when stuck. Checks: `^function\s+startRun`,
`setGameMode\(\s*GameMode\.Adventure`, `startRun\(` twice, `js`. Grader
`parkour-07`: some online player is in Adventure mode ("stand on your start
plate, then check"). The arc's one big paste; the lesson shows the diff, and
Start from here is the rail.

**P8. Best time.** Idea: the world keeps a number for you; compare new with
saved. Build: in `finishRun`, `const best =
player.getDynamicProperty("parkour:best");` then `if (best === undefined ||
seconds < best)` saves it and titles NEW RECORD, else titles `"Best: " +
best`. Payoff: the complete game: run, fall, checkpoint, finish, and a record
that survives a restart and dares you to beat it. Checks:
`getDynamicProperty\(\s*"parkour:best"`, `same` on the get and set names,
`seconds\s*<\s*best`, `js`. Grader: none; dynamic properties are per pack,
and the restart is the proof, as in card 14.

**P9. Leaderboard.** Idea: shared data everyone sees. Build: objective
`parkour:best` on the sidebar, `setScore(player, Math.round(seconds))` on a
new record. Payoff: your best on the side of the screen. **Second player
useful, not required:** when the parent joins and runs, two names appear, and
the kid discovers the game was single-runner (P4). Grader `parkour-09`:
objective exists, in the sidebar slot, with a score.

A kid who knows Minecraft replays P8's game because it is the game they
already play on servers, on their own map, against their own record, with
every number theirs to change.

## 5. Session and length

Code Kingdoms' chapters were longer because a video carried the instruction
and the task was one edit. Here the making is the kid's, so the unit stays
one lesson per 45 to 60 minute session with the same shape: **Play it
first** (5 minutes: run the course, predict today's change), make (25 to
30), play (10), say it back (5). An arc lesson never
spans two sessions: the format already forbids a lesson without a payoff, and
a lesson that needs two sittings is two lessons (P5 and P6 are that split).
The build session is the exception and is not a lesson. If forty minutes
pass without the check passing, stop, run the course as it stands (it still
works from the previous lesson; that is the point of the arc), and say back
what works.

Two things change inside an arc. **Try this** becomes *safe variation*:
numbers, words, sounds, which block marks a checkpoint; never the structure
the next lesson edits ("change the 3; do not rename spot"). **Say it back**
gains one cumulative question every lesson, "from the plate to the finish,
what does your game do now?", a one-minute retell that is retrieval practice
for every earlier lesson; the learning track's event, state, condition,
effect gate stays as the second question.

## 6. Risks and what to measure

*Brittle checks.* The card rules hold: exact on identifiers, `loose` on
words, latitude wherever safe, a message in the kid's words. A course
lesson's checks assert only its own idea, so a correct variant of lesson 3
can never fail lesson 5. The parent's reference course is tested against
every lesson's solution before shipping, the way the first review broke
every step on purpose.

*Later projects breaking, kids quitting.* Four rails: the course owns its
file, so cards cannot break it and Start from here cannot harm the cards;
solution tags are cumulative and `build-tags` proves every earlier payoff
still works after every step; the panel checks the predecessor and offers the
fresh start in a sentence, not a red box; and Play it first finds a broken
course in minute one, not minute forty.

*Expertise reversal.* Course Idea sections say "you met this in card 04" and
move on.

Three events to watch in `events.jsonl`:

1. `start` per lesson. Several on one lesson means its predecessor leaves
   fragile state; rewrite the predecessor, not the lesson.
2. `broken`, or `deploy` with code `deploy.scripts`, as the *first* event of
   a session on a course lesson: the "I came back and it does not run"
   signal. Each is a candidate for a check that says why.
3. The course funnel: `next` per lesson index, and the lesson holding the
   last event before a gap over a day. A drop after P7 says the refactor
   paste should split; after P3, that the arithmetic lost them.

## 7. Recommendation

- Build it: one course, parkour, nine lessons plus a no-code build session,
  beside the sixteen cards unchanged.
- Second course: protect the beacon, with dodgeball inside it; no capture the
  flag for a solo learner.
- FORMAT.md first: rewrite rule 3; add `course:`/`after:` frontmatter and
  `course/courses/<id>.md`; make `build-tags` re-run earlier lessons' final
  checks after every step; add `lesson start`.
- Before any lesson text: confirm on the live server that
  `pressurePlatePush` does not fire again on release and that
  `import "./parkour.js"` loads.
- Read `start`, first-event `broken`, and the funnel for two weeks before
  designing the second course.
