---
id: 09-counter
title: Remember a number between events
concept: A variable is a named box that keeps its value between events.
files: [packs/kid_bp/scripts/main.js]
game: false
---

# Remember a number between events

## The idea

A variable is a named box. `let blocks = 0;` makes a box called blocks
with 0 inside. `blocks = blocks + 1;` takes what is in the box, adds one,
and puts it back. The box keeps its number between events, so your code can
count.

**Predict:** what will the third message say? And what happens to the count
when the server restarts?

## Step 1: Make the box
<!-- check
{"regex": "packs/kid_bp/scripts/main.js", "pattern": "^let\\s+blocks\\s*=\\s*0\\s*;", "msg": "near the top of main.js, on its own line right under the import line, with nothing before it: let blocks = 0;"}
{"js": "packs/kid_bp/scripts/main.js", "msg": "main.js has a problem; let blocks = 0; goes at the top of the file, not inside a block"}
-->
Right under the `import` line at the top of `main.js`, add:

```js
let blocks = 0;
```

<details><summary>Hint</summary>
It goes at the top, outside every block. Inside a block it would start from
0 every time.
</details>

## Step 2: Count in it
<!-- check
{"js": "packs/kid_bp/scripts/main.js", "msg": "main.js has a problem; the new block ends with }); and goes after the last one"}
{"regex": "packs/kid_bp/scripts/main.js", "pattern": "blocks\\s*(\\+=\\s*1|=\\s*blocks\\s*\\+\\s*1)\\s*;", "msg": "the counting line is blocks = blocks + 1;"}
{"regex": "packs/kid_bp/scripts/main.js", "pattern": "world\\.sendMessage\\(\\s*\"[^\"]*\"\\s*\\+\\s*blocks\\s*\\)", "msg": "the message line joins your words and the box: world.sendMessage(\"Blocks: \" + blocks);"}
{"regex": "packs/kid_bp/scripts/main.js", "pattern": "playerBreakBlock", "msg": "the two lines belong inside a playerBreakBlock block"}
-->
At the very end of `main.js`, paste:

```js
world.afterEvents.playerBreakBlock
  .subscribe((event) => {
    blocks = blocks + 1;
    world.sendMessage("Blocks: " + blocks);
  });
```

If you already have a playerBreakBlock block, the two middle lines can go
inside it instead.

<details><summary>Hint</summary>
`blocks = blocks + 1;` first, then the message. Both inside the block,
above its `});`.
</details>

## Step 3: See it count
<!-- check
{"deploy": "ok", "behavior_packs": ["kid_bp"], "scripts_ok": true, "msg": "the server has not taken your script yet; the Deploy panel at the bottom says why"}
-->
Wait for the status bar to say **live**. Your phone shows *Disconnected from server*: tap your server in the list to join again, and tap **Download** if it asks about a resource pack.

Break blocks: 1, 2, 3.

**Try this:** change the word Blocks to another word. That restarts the
server. Join again and break one block: it says 1. A later lesson fixes
that.

**Say it back:** what does `let blocks = 0` make, and what does
`blocks = blocks + 1` do to it?

<details><summary>Hint</summary>
Always 1? Then `let blocks = 0` is inside the block; move it to the top of
the file.
</details>
