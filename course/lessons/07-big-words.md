---
id: 07-big-words
title: Make the player's screen do things
concept: The player is a thing with abilities, and a dot and a verb asks it to do one.
files: [packs/kid_bp/scripts/main.js]
game: false
---

# Make the player's screen do things

## The idea

`event.player` is not just a name. It is a thing with abilities, and a dot
picks one: `.sendMessage` talks, `.playSound` makes a noise,
`.onScreenDisplay.setTitle` puts big words across the screen. Chat was
only the first ability you used.

**Predict:** where on the screen will WELCOME appear?

## Step 1: Big words
<!-- check
{"js": "packs/kid_bp/scripts/main.js", "msg": "main.js has a problem; the new lines go inside the hello block, before its });"}
{"regex": "packs/kid_bp/scripts/main.js", "pattern": "event\\.player\\s*\\.onScreenDisplay\\s*\\.setTitle\\(\\s*\"(?:[^\"\\\\]|\\\\.)+\"", "msg": "inside the hello block add event.player.onScreenDisplay.setTitle(\"WELCOME\"); with capital S, D and T"}
-->
Inside the hello block, under the sendMessage line, add:

```js
    event.player.onScreenDisplay
      .setTitle("WELCOME");
```

<details><summary>Hint</summary>
Two lines are fine; the dot starts the second. Put them inside the block,
before the `});` that ends it. Your words go in the quotes.
</details>

## Step 2: A sound
<!-- check
{"js": "packs/kid_bp/scripts/main.js", "msg": "main.js has a problem; check the quotes and the ); on the new line"}
{"regex": "packs/kid_bp/scripts/main.js", "pattern": "event\\.player\\s*\\.playSound\\(\\s*\"[a-z_.]+\"\\s*\\)", "msg": "add event.player.playSound(\"random.levelup\"); inside the hello block"}
-->
Under that, add:

```js
    event.player
      .playSound("random.levelup");
```

<details><summary>Hint</summary>
`playSound` has a capital S. The sound name is all lowercase with a dot in
the middle: `random.levelup`.
</details>

## Step 3: See and hear it
<!-- check
{"deploy": "ok", "behavior_packs": ["kid_bp"], "scripts_ok": true, "msg": "the server has not taken your script yet; the Deploy panel at the bottom says why"}
-->
Turn your phone's volume up. Wait for the status bar to say **live**. Your phone shows *Disconnected from server*: tap your server in the list to join again, and tap **Download** if it asks about a resource pack.

**Try this:** other sounds: `random.explode`, `mob.ghast.scream`,
`note.pling`.

**Say it back:** what is the dot doing in `event.player.playSound`?

<details><summary>Hint</summary>
Big words but no sound? Check the phone is not muted, and the sound name is
spelled exactly. The game plays nothing for a name it does not know.
</details>
