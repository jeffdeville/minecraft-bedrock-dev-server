---
id: 01-rename-a-diamond
title: Rename anything in the game
concept: Every name the game shows is one line in a text file, and your looks pack can replace any line.
files: [packs/kid_rp/texts/en_US.lang]
game: false
---

# Rename anything in the game

## The idea

Minecraft does not have the word Diamond built into the diamond. It has a
key, `item.diamond.name`, and a list that says what each key reads as:
`key=words`, one per line, like a dictionary. Your looks pack carries its
own list, and any line you put in it wins over the game's own. Renaming a
diamond is one line of text, no code.

**Predict:** where will the new name show up: on the diamond, in chat, or on
the server?

## Step 1: Write the new name
<!-- check
{"regex": "packs/kid_rp/texts/en_US.lang", "pattern": "^item\\.diamond\\.name=\\S", "msg": "the file needs a line item.diamond.name= followed by your new name, with no spaces on either side of the ="}
{"regex": "packs/kid_rp/texts/en_US.lang", "pattern": "^item\\.kid:wand=", "msg": "the Wand line got deleted; put item.kid:wand=Wand back on its own line"}
-->
Open `packs/kid_rp/texts/en_US.lang`. Under the Wand line, add:

```
item.diamond.name=Shiny Rock
```

Everything after the `=` is yours to choose. No quotes, no spaces around
the `=`.

<details><summary>Hint</summary>
One line: the key, then `=`, then your words, like
`item.diamond.name=Shiny Rock`. Quotes would show up in the game, so leave
them out. Capital letters matter in the key.
</details>

## Step 2: See it
<!-- check
{"deploy": "ok", "resource_packs": ["kid_rp"], "msg": "your looks pack has not reached the server yet; the Deploy panel at the bottom says why"}
-->
Wait for the status bar to say **live**. Your phone shows *Disconnected from server*: tap your server in the list to join again, and tap **Download** if it asks about a resource pack.

Open your inventory, search *diamond*, put one in your hotbar and tap it:
the name shows above the hotbar. Was your prediction right?

**Try this:** rename one more thing. Items are `item.<name>.name`; blocks
are `tile.<name>.name`, so `tile.dirt.name=Mud`.

**Say it back:** where does the game get the word Diamond from, and how did
your pack change it?

<details><summary>Hint</summary>
Still called Diamond? Join again after the status bar says **live**, and tap
**Download** if the phone asks. Then check your line has no spaces around
the `=`.
</details>
