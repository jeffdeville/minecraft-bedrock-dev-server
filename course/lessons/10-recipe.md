---
id: 10-recipe
title: Write a recipe once, use it twice
concept: A function is a named recipe; every place that uses the name runs the same lines.
files: [packs/kid_bp/scripts/main.js]
game: false
---

# Write a recipe once, use it twice

## The idea

A function is a recipe with a name. You write the lines once, and anywhere
you write the name, those lines run. Change the recipe and every place that
uses it changes too. `party(player)` is a recipe that needs one thing
handed to it: which player.

**Predict:** you write the party lines once. How many places will they run
from?

## Step 1: Write the recipe
<!-- check
{"js": "packs/kid_bp/scripts/main.js", "msg": "main.js has a problem; the recipe has four lines and ends with } on its own"}
{"regex": "packs/kid_bp/scripts/main.js", "pattern": "^function\\s+party\\s*\\(\\s*player\\s*\\)\\s*\\{", "msg": "on its own line at the bottom of the file, outside every block: function party(player) {"}
{"regex": "packs/kid_bp/scripts/main.js", "pattern": "party\\(player\\)\\s*\\{[\\s\\S]{0,200}?player\\.onScreenDisplay\\.setTitle\\(", "msg": "inside the recipe put player.onScreenDisplay.setTitle(\"PARTY\");"}
-->
At the very end of `main.js`, paste:

```js
function party(player) {
  player.playSound("random.levelup");
  player.onScreenDisplay.setTitle("PARTY");
}
```

<details><summary>Hint</summary>
It is not an event block, so no `.subscribe` and no `);` at the end: just
`}`. Nothing happens yet; nobody has used the recipe.
</details>

## Step 2: Use it on join
<!-- check
{"js": "packs/kid_bp/scripts/main.js", "msg": "main.js has a problem; the new line is party(event.player); with a semicolon"}
{"regex": "packs/kid_bp/scripts/main.js", "pattern": "playerSpawn[\\s\\S]{0,600}?party\\(\\s*event\\.player\\s*\\)", "msg": "inside the hello block add one line: party(event.player);"}
-->
Inside the hello block, under the last line there, add:

```js
    party(event.player);
```

<details><summary>Hint</summary>
One line, inside the hello block, before its `});`. It hands
`event.player` to the recipe.
</details>

## Step 3: Use it again
<!-- check
{"js": "packs/kid_bp/scripts/main.js", "msg": "main.js has a problem; the new block goes at the very end and ends with });"}
{"regex": "packs/kid_bp/scripts/main.js", "pattern": "playerPlaceBlock[\\s\\S]{0,120}?party\\(\\s*event\\.player\\s*\\)", "msg": "the new block should call party(event.player); inside a playerPlaceBlock block"}
-->
At the very end of `main.js`, paste:

```js
world.afterEvents.playerPlaceBlock
  .subscribe((event) => {
    party(event.player);
  });
```

<details><summary>Hint</summary>
Same shape as every event block: the event name, `.subscribe`, one line
inside, `});`.
</details>

## Step 4: See it
<!-- check
{"deploy": "ok", "behavior_packs": ["kid_bp"], "scripts_ok": true, "msg": "the server has not taken your script yet; the Deploy panel at the bottom says why"}
-->
Wait for the status bar to say **live**. Your phone shows *Disconnected from server*: tap your server in the list to join again, and tap **Download** if it asks about a resource pack.

Party on join. Place a block: party again. Now change PARTY to another word:
both places change.

**Try this:** add a third line to the recipe: `player.sendMessage("woo");`

**Say it back:** what is a function, and why write one instead of pasting
the lines twice?

<details><summary>Hint</summary>
Party on join but not on placing? Check the second block says
`playerPlaceBlock` and calls `party(event.player);`.
</details>
