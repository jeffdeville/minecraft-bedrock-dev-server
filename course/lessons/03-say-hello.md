---
id: 03-say-hello
title: Change what the server says
concept: A script is a text file the server runs, and each block of it runs when its event happens.
files: [packs/kid_bp/scripts/main.js]
game: false
---

# Change what the server says

## The idea

`main.js` is code: a text file your server runs. Nothing in it runs by
itself. Each block waits for an event, something happening in the game, and
then runs its lines. The block you have waits for a player to appear, then
says a line in chat. Change the words, and the game changes.

**Predict:** when will your words appear: when the server starts, when you
join, or both?

## Step 1: Change the words
<!-- check
{"js": "packs/kid_bp/scripts/main.js", "msg": "main.js has a problem; every ( needs a ) and every quote needs a partner"}
{"regex": "packs/kid_bp/scripts/main.js", "pattern": "world\\.sendMessage\\(", "msg": "the line must start world.sendMessage( with a small s and a capital M; the game refuses any other spelling"}
{"regex": "packs/kid_bp/scripts/main.js", "pattern": "world\\.sendMessage\\(\\s*\"(?!My Pack is on!\")(?:[^\"\\\\]|\\\\.)+\"", "msg": "the message still says My Pack is on!; change only the words between the quotes"}
{"regex": "packs/kid_bp/scripts/main.js", "pattern": "^import \\{\\s*world,\\s*system,\\s*DisplaySlotId\\s*\\} from \"@minecraft/server\";", "msg": "the first import line is gone; it is how your code gets the toolbox; put it back exactly: import { world, system, DisplaySlotId } from \"@minecraft/server\";"}
-->
Open `packs/kid_bp/scripts/main.js`. Find this line:

```js
    world.sendMessage("My Pack is on!");
```

Change only the words between the quotes. The file saves itself when you
stop typing.

<details><summary>Hint</summary>
Keep both quotes and the `);` at the end. A red box means a quote or
bracket went missing: the line should still look like
`world.sendMessage("your words");`.
</details>

## Step 2: Hear it
<!-- check
{"deploy": "ok", "behavior_packs": ["kid_bp"], "scripts_ok": true, "msg": "the server has not taken your script yet; the Deploy panel at the bottom says why"}
-->
Wait for the status bar to say **live**. Your phone shows *Disconnected from server*: tap your server in the list to join again, and tap **Download** if it asks about a resource pack.

Chat shows your words. Now open chat and type `/kill @s`. When you
respawn, it says them again: the event is *a player appears*, not *a player
joins*.

**Try this:** add a second `world.sendMessage("...");` line under the
first. Two lines, two messages.

**Say it back:** what is the event here, and what does the server do when it
happens?

<details><summary>Hint</summary>
Nothing in chat? Wait for **live**, then join again. If the status bar says
*failed*, click it: the Deploy panel names the line.
</details>
