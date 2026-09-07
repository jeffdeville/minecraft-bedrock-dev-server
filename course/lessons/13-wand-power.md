---
id: 13-wand-power
title: Make your wand do something
concept: An item can trigger code: the itemUse event says which item, and an if picks yours.
files: [packs/kid_bp/scripts/main.js]
game: false
---

# Make your wand do something

## The idea

When you tap with an item in hand, the game fires `itemUse`, and its
package says which item: `event.itemStack.typeId`. An `if` picks yours
by its identifier. `event.source` is the player who tapped, with every
ability you know.

**Predict:** what happens when you tap with a stick instead of the wand?

## Step 1: Listen for any item
<!-- check
{"js": "packs/kid_bp/scripts/main.js", "msg": "main.js has a problem; the block goes at the very end and ends with });"}
{"regex": "packs/kid_bp/scripts/main.js", "pattern": "world\\.afterEvents\\.itemUse\\s*\\.subscribe", "msg": "the block starts world.afterEvents.itemUse (capital U) then .subscribe((event) => {"}
{"regex": "packs/kid_bp/scripts/main.js", "pattern": "event\\.itemStack\\.typeId", "msg": "the block uses event.itemStack.typeId, the item's identifier (capital S and I)"}
-->
At the very end of `main.js`, paste:

```js
world.afterEvents.itemUse
  .subscribe((event) => {
    world.sendMessage(
      "Used: " + event.itemStack.typeId);
  });
```

<details><summary>Hint</summary>
Same shape as every event block. `itemStack` and `typeId` each have one
capital letter in the middle.
</details>

## Step 2: Only the wand, and a power
<!-- check
{"js": "packs/kid_bp/scripts/main.js", "msg": "main.js has a problem; the if needs its own { and }, inside the block"}
{"regex": "packs/kid_bp/scripts/main.js", "pattern": "const\\s+item\\s*=\\s*event\\.itemStack\\.typeId\\s*;", "msg": "first line inside the block: const item = event.itemStack.typeId;"}
{"regex": "packs/kid_bp/scripts/main.js", "pattern": "if\\s*\\(\\s*item\\s*={2,3}\\s*\"kid:wand\"\\s*\\)\\s*\\{", "msg": "then if (item === \"kid:wand\") { with three = signs"}
{"same": [{"file": "packs/kid_bp/scripts/main.js", "pattern": "item\\s*={2,3}\\s*\"(kid:[a-z_]+)\""}, {"file": "packs/kid_bp/items/wand.json", "path": "minecraft:item.description.identifier"}], "msg": "the name in the if must be exactly the identifier from items/wand.json"}
{"regex": "packs/kid_bp/scripts/main.js", "pattern": "event\\.source\\s*\\.addEffect\\(\\s*\"[a-z_]+\"\\s*,\\s*\\d+", "msg": "inside the if: event.source.addEffect(\"levitation\", 60);"}
-->
Replace the two sendMessage lines with:

```js
    const item = event.itemStack.typeId;
    if (item === "kid:wand") {
      event.source
        .addEffect("levitation", 60);
    }
```

60 is ticks: three seconds.

<details><summary>Hint</summary>
It is `event.source`, not `event.player`, for this event. The item name
must match `wand.json` exactly: `kid:wand`.
</details>

## Step 3: Float
<!-- check
{"deploy": "ok", "behavior_packs": ["kid_bp"], "scripts_ok": true, "msg": "the server has not taken your script yet; the Deploy panel at the bottom says why"}
-->
Wait for the status bar to say **live**. Your phone shows *Disconnected from server*: tap your server in the list to join again, and tap **Download** if it asks about a resource pack.

Hold the Wand and tap the sky.

**Try this:** `"speed"`, `"jump_boost"`, `"night_vision"`,
`"slow_falling"`. Or 60 → 200.

**Say it back:** what event fires when you tap with an item, and how does
the code know it was the wand?

<details><summary>Hint</summary>
Nothing? Tap with nothing in front of you, holding the Wand from
`/give @s kid:wand`. Check the effect name is spelled exactly; a wrong
name does nothing.
</details>
