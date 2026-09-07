---
id: 05-say-my-name
title: Use what the event tells you
concept: The event hands your function a package of information, and a dot reaches inside it.
files: [packs/kid_bp/scripts/main.js]
game: false
---

# Use what the event tells you

## The idea

When an event happens, the server hands your function a package called
`event` with everything about what happened. A dot reaches inside it:
`event.player` is the player who appeared, and `event.player.name` is
their gamertag. Join words and the package with `+`.

**Predict:** will chat say the word name, or your actual name?

## Step 1: Put your name in the message
<!-- check
{"js": "packs/kid_bp/scripts/main.js", "msg": "main.js has a problem; the line should end with event.player.name); and the quotes must close before the +"}
{"regex": "packs/kid_bp/scripts/main.js", "pattern": "world\\.sendMessage\\(\\s*\"(?:[^\"\\\\]|\\\\.)*\"\\s*\\+\\s*event\\.player\\.name", "msg": "the hello line should be world.sendMessage(\"Hello, \" + event.player.name); with event.player.name outside the quotes, joined on with +"}
-->
In the hello block, change the sendMessage line to:

```js
    world.sendMessage(
      "Hello, " + event.player.name);
```

Your words go inside the quotes; the name goes outside them.

<details><summary>Hint</summary>
If chat prints the words *event.player.name*, they are inside the quotes.
The quotes close after `Hello, `, then a `+`, then `event.player.name`,
then `);`.
</details>

## Step 2: See it
<!-- check
{"deploy": "ok", "behavior_packs": ["kid_bp"], "scripts_ok": true, "msg": "the server has not taken your script yet; the Deploy panel at the bottom says why"}
-->
Wait for the status bar to say **live**. Your phone shows *Disconnected from server*: tap your server in the list to join again, and tap **Download** if it asks about a resource pack.

Chat says Hello with your gamertag.

**Try this:** put the name first: `event.player.name + " is here!"`.

**Say it back:** what is inside `event`, and how did you get your name out
of it?

<details><summary>Hint</summary>
No message at all? Wait for **live** and join again. If the status bar says
*failed*, click it.
</details>
