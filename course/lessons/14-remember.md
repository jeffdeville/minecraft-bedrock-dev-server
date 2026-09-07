---
id: 14-remember
title: Make the count survive a restart
concept: The world can save a value under a name; get reads it back and set writes it, and it survives restarts.
files: [packs/kid_bp/scripts/main.js]
game: false
---

# Make the count survive a restart

## The idea

A `let` box forgets when the server restarts. The world can save a value
under a name: `getDynamicProperty` reads it back, `setDynamicProperty`
writes it. Saved values survive restarts, so a count can go on forever.
`?? 0` means *or 0 if nothing is saved yet*.

**Predict:** you used the wand five times, then the server restarts. Does
the next use say 1 or 6?

## Step 1: Read the saved number
<!-- check
{"js": "packs/kid_bp/scripts/main.js", "msg": "main.js has a problem; the block goes at the very end and ends with });"}
{"regex": "packs/kid_bp/scripts/main.js", "pattern": "getDynamicProperty\\(\\s*\"kid:uses\"\\s*\\)", "msg": "the reading line is me.getDynamicProperty(\"kid:uses\") with capital D and P"}
{"regex": "packs/kid_bp/scripts/main.js", "pattern": "const\\s+uses\\s*=\\s*\\(\\s*saved\\s*\\?\\?\\s*0\\s*\\)\\s*\\+\\s*1", "msg": "the adding line is const uses = (saved ?? 0) + 1;"}
{"regex": "packs/kid_bp/scripts/main.js", "pattern": "setActionBar\\(\\s*\"[^\"]*\"\\s*\\+\\s*uses\\s*\\)", "msg": "the showing line is me.onScreenDisplay.setActionBar(\"Wand uses: \" + uses);"}
-->
At the very end of `main.js`, paste:

```js
world.afterEvents.itemUse
  .subscribe((event) => {
    const item = event.itemStack.typeId;
    const me = event.source;
    if (item === "kid:wand") {
      const saved =
        me.getDynamicProperty("kid:uses");
      const uses = (saved ?? 0) + 1;
      me.onScreenDisplay
        .setActionBar("Wand uses: " + uses);
    }
  });
```

It reads, adds one, and shows it. Nothing saves yet, so it says 1 every
time.

<details><summary>Hint</summary>
`me` is the player, so `me.getDynamicProperty` asks the world for their
saved number. Every line but the last inside the `if` ends with `;`.
</details>

## Step 2: Save the new number
<!-- check
{"js": "packs/kid_bp/scripts/main.js", "msg": "main.js has a problem; check the new line ends with );"}
{"regex": "packs/kid_bp/scripts/main.js", "pattern": "setDynamicProperty\\(\\s*\"kid:uses\"\\s*,\\s*uses\\s*\\)", "msg": "under the const uses line: me.setDynamicProperty(\"kid:uses\", uses);"}
{"same": [{"file": "packs/kid_bp/scripts/main.js", "pattern": "getDynamicProperty\\(\\s*\"([^\"]+)\""}, {"file": "packs/kid_bp/scripts/main.js", "pattern": "setDynamicProperty\\(\\s*\"([^\"]+)\""}], "msg": "get and set must use the same saved name, kid:uses"}
-->
Under the `const uses` line, add:

```js
      me.setDynamicProperty(
        "kid:uses", uses);
```

<details><summary>Hint</summary>
Same name in both, `kid:uses`. Read first, add one, save, then show.
</details>

## Step 3: See it survive
<!-- check
{"deploy": "ok", "behavior_packs": ["kid_bp"], "scripts_ok": true, "msg": "the server has not taken your script yet; the Deploy panel at the bottom says why"}
-->
Wait for the status bar to say **live**. Your phone shows *Disconnected from server*: tap your server in the list to join again, and tap **Download** if it asks about a resource pack.

Hold the Wand and tap the sky a few times: the number climbs. Now change the
words *Wand uses* to anything. The server restarts. Join again and tap once.

**Try this:** show the number with `setTitle` instead of `setActionBar`.

**Say it back:** where does the number live between restarts, and what are
the two verbs?

<details><summary>Hint</summary>
Says *NaN*? Something that was not a number got a 1 added; check the
`?? 0`. Always 1? The set line is missing.
</details>
