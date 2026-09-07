---
id: 11-scoreboard
title: Put your count on the side of the screen
concept: The scoreboard is Minecraft's own counter; the world keeps its numbers and your script adds to them.
files: [packs/kid_bp/scripts/main.js]
game: true
---

# Put your count on the side of the screen

## The idea

You know scoreboards from commands: the sidebar with names and numbers. It
is Minecraft's own counter. The world keeps the numbers, and your script can
add to them. An objective is one counter with a short id and a title.

**Predict:** where will the number appear this time: in chat, or somewhere
else?

## Step 1: Count on the scoreboard
<!-- check
{"js": "packs/kid_bp/scripts/main.js", "msg": "main.js has a problem; the block goes at the very end and ends with });"}
{"regex": "packs/kid_bp/scripts/main.js", "pattern": "if\\s*\\(\\s*!\\s*board\\.getObjective\\(\\s*\"kid:blocks\"\\s*\\)\\s*\\)\\s*\\{[\\s\\S]{0,120}?addObjective\\(\\s*\"kid:blocks\"\\s*,\\s*\"", "msg": "addObjective(\"kid:blocks\", \"Blocks\") must be inside if (!board.getObjective(\"kid:blocks\")) { } so it is only made once"}
{"regex": "packs/kid_bp/scripts/main.js", "pattern": "score\\.addScore\\(\\s*event\\.player\\s*,\\s*1\\s*\\)", "msg": "the counting line is score.addScore(event.player, 1);"}
-->
At the very end of `main.js`, paste:

```js
world.afterEvents.playerBreakBlock
  .subscribe((event) => {
    const board = world.scoreboard;
    if (!board.getObjective("kid:blocks")) {
      board.addObjective(
        "kid:blocks", "Blocks");
    }
    const score =
      board.getObjective("kid:blocks");
    score.addScore(event.player, 1);
  });
```

`!` means *not*: if there is no objective yet, make one. Blocks is the
title; change it if you like.

<details><summary>Hint</summary>
`const` is a box that is set once. The `if` keeps the game from making
the same objective twice, which it refuses.
</details>

## Step 2: Show it
<!-- check
{"js": "packs/kid_bp/scripts/main.js", "msg": "main.js has a problem; the new lines go inside the block, under the addScore line"}
{"regex": "packs/kid_bp/scripts/main.js", "pattern": "setObjectiveAtDisplaySlot\\(\\s*DisplaySlotId\\.Sidebar\\s*,\\s*\\{\\s*objective:\\s*score\\s*\\}", "msg": "under the addScore line: board.setObjectiveAtDisplaySlot(DisplaySlotId.Sidebar, { objective: score }); with a capital S in Sidebar"}
-->
Under the `addScore` line, add:

```js
    board.setObjectiveAtDisplaySlot(
      DisplaySlotId.Sidebar,
      { objective: score });
```

<details><summary>Hint</summary>
Three lines, inside the block, before its `});`. `Sidebar` has a capital
S; `DisplaySlotId` was in the import line all along.
</details>

## Step 3: See it
<!-- check
{"deploy": "ok", "behavior_packs": ["kid_bp"], "scripts_ok": true, "msg": "the server has not taken your script yet; the Deploy panel at the bottom says why"}
{"game": "11-scoreboard", "msg": "the sidebar is not up yet; break a block after joining, then check again"}
-->
Wait for the status bar to say **live**. Your phone shows *Disconnected from server*: tap your server in the list to join again, and tap **Download** if it asks about a resource pack.

Break a block. The sidebar appears with your name and a number.

**Try this:** change the title Blocks. Then change it again: the server
restarts, and the count carries on, unlike a `let` box.

**Say it back:** who keeps the scoreboard's number: your script or the world?

<details><summary>Hint</summary>
No sidebar? Break one block first; the objective is made on the first break.
Then check the status bar says **live**.
</details>
