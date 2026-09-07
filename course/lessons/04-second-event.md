---
id: 04-second-event
title: React to a block breaking
concept: There are many events, each with a name, and every handler block has the same three parts.
files: [packs/kid_bp/scripts/main.js]
game: false
---

# React to a block breaking

## The idea

There are hundreds of events: a block breaks, a block is placed, a lever
flips, it starts raining. Every block of code has the same three parts:
which event, a function that runs, and the lines inside it. You already have
one. Copy its shape, change the event name, and you can react to anything.

**Predict:** if you break three blocks, how many times will chat say Crunch?

## Step 1: Add a block for a new event
<!-- check
{"js": "packs/kid_bp/scripts/main.js", "msg": "main.js has a problem; the new block ends with }); and goes after the last }); of the file"}
{"regex": "packs/kid_bp/scripts/main.js", "pattern": "world\\.afterEvents\\.playerBreakBlock\\s*\\.subscribe\\s*\\(\\s*\\(?\\s*\\w*\\s*\\)?\\s*=>\\s*\\{", "msg": "the new block starts world.afterEvents.playerBreakBlock (capital B twice) then .subscribe((event) => {"}
{"regex": "packs/kid_bp/scripts/main.js", "pattern": "playerBreakBlock[\\s\\S]{0,200}?world\\.sendMessage\\(\\s*\"", "msg": "inside the new block put world.sendMessage(\"...\") with your words"}
-->
At the very end of `main.js`, after the last `});`, paste:

```js
world.afterEvents.playerBreakBlock
  .subscribe((event) => {
    world.sendMessage("Crunch!");
  });
```

Change Crunch to any word you like.

<details><summary>Hint</summary>
The new block goes after the hello block, not inside it. Four lines, ending
with `});`. If the panel says it is inside another block, move it to the
bottom.
</details>

## Step 2: See it
<!-- check
{"deploy": "ok", "behavior_packs": ["kid_bp"], "scripts_ok": true, "msg": "the server has not taken your script yet; the Deploy panel at the bottom says why"}
-->
Wait for the status bar to say **live**. Your phone shows *Disconnected from server*: tap your server in the list to join again, and tap **Download** if it asks about a resource pack.

Break anything.

**Try this:** change `playerBreakBlock` to `playerPlaceBlock` and place
blocks instead.

**Say it back:** every event block has three parts. Name them.

<details><summary>Hint</summary>
No Crunch? Wait for **live** and join again. Still nothing: check the event
name is `playerBreakBlock` with two capital Bs; the game ignores a name it
does not know.
</details>
