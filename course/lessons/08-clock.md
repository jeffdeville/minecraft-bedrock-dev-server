---
id: 08-clock
title: Make something happen every ten seconds
concept: A timer runs a function again and again, counting in ticks, twenty per second.
files: [packs/kid_bp/scripts/main.js]
game: false
---

# Make something happen every ten seconds

## The idea

Not everything waits for a player. `system.runInterval` runs a function
again and again, on a timer. The timer counts ticks: the game ticks twenty
times a second, so 200 ticks is ten seconds.

**Predict:** 200 what: seconds, ticks or messages? How often will Tick
appear?

## Step 1: Start the clock
<!-- check
{"js": "packs/kid_bp/scripts/main.js", "msg": "main.js has a problem; the three clock lines go at the very end of the file, not inside another block"}
{"regex": "packs/kid_bp/scripts/main.js", "pattern": "system\\.runInterval\\(\\s*\\(\\s*\\)\\s*=>\\s*\\{", "msg": "the block starts system.runInterval(() => { with empty parentheses before the arrow"}
{"regex": "packs/kid_bp/scripts/main.js", "pattern": "\\}\\s*,\\s*\\d+\\s*\\)\\s*;", "msg": "the block ends }, 200); the number is how many ticks between runs"}
-->
At the very end of `main.js`, paste:

```js
system.runInterval(() => {
  world.sendMessage("Tick");
}, 200);
```

<details><summary>Hint</summary>
Three lines, at the bottom, not inside another block. The `()` before
`=>` is empty because a timer brings no package.
</details>

## Step 2: Watch it
<!-- check
{"deploy": "ok", "behavior_packs": ["kid_bp"], "scripts_ok": true, "msg": "the server has not taken your script yet; the Deploy panel at the bottom says why"}
-->
Wait for the status bar to say **live**. Your phone shows *Disconnected from server*: tap your server in the list to join again, and tap **Download** if it asks about a resource pack.

Wait ten seconds. Count.

**Try this:** change 200 to 20 (chaos), then to 1200 (a minute).

**Say it back:** what is a tick, and what does the number at the end mean?

<details><summary>Hint</summary>
No Tick after twenty seconds? Wait for **live** and join again. If the
status bar says *failed*, click it.
</details>
