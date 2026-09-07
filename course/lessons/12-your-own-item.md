---
id: 12-your-own-item
title: Make an item that never existed
concept: An item is a JSON file with an identifier, and that identifier must be spelled the same in four places across both halves.
files: [packs/kid_bp/items/gem.json, packs/kid_rp/textures/item_texture.json, packs/kid_rp/textures/items/gem.png, packs/kid_rp/texts/en_US.lang]
game: true
---

# Make an item that never existed

## The idea

An item is a JSON file in the code half with an identifier, like
`kid:wand`. That identifier is the thread that ties four places together:
the item file, the picture list, and the names list. Spell it differently
anywhere and the game says nothing: a purple-and-black picture, or no name.

**Predict:** the item lives in `kid_bp`. Which half gives it its picture,
and which its name?

## Step 1: The item file
<!-- check
{"exists": "packs/kid_bp/items/gem.json", "msg": "make a new file gem.json inside packs/kid_bp/items, next to wand.json"}
{"json": "packs/kid_bp/items/gem.json", "path": "minecraft:item.description.identifier", "equals": "kid:gem", "msg": "the identifier must be exactly kid:gem, lowercase"}
{"json": "packs/kid_bp/items/gem.json", "path": "minecraft:item.components.minecraft:icon", "equals": "kid:gem", "msg": "the minecraft:icon must be kid:gem too, the same word as the identifier"}
-->
Right-click `packs/kid_bp/items` → **New File** → `gem.json`. Paste:

```json
{
  "format_version": "1.26.40",
  "minecraft:item": {
    "description": {
      "identifier": "kid:gem",
      "menu_category": {
        "category": "items"
      }
    },
    "components": {
      "minecraft:icon": "kid:gem",
      "minecraft:max_stack_size": 16
    }
  }
}
```

Compare it with `wand.json`: only the name changed.

<details><summary>Hint</summary>
Copy from the first `{` to the last `}`. A red box means a comma or quote
is missing; the panel says which line.
</details>

## Step 2: Say which picture
<!-- check
{"json": "packs/kid_rp/textures/item_texture.json", "path": "texture_data.kid:gem.textures", "equals": "textures/items/gem", "msg": "item_texture.json needs a kid:gem entry after the wand one, pointing at textures/items/gem"}
{"same": [{"file": "packs/kid_bp/items/gem.json", "path": "minecraft:item.components.minecraft:icon"}, {"file": "packs/kid_rp/textures/item_texture.json", "pattern": "\"(kid:[a-z_]+)\"\\s*:\\s*\\{\\s*\"textures\"\\s*:\\s*\"textures/items/gem\""}], "msg": "the name in item_texture.json must be the same word as the icon in gem.json: kid:gem"}
-->
In `packs/kid_rp/textures/item_texture.json`, after the `}` that closes
the wand entry, paste (the comma is part of it):

```json
    ,
    "kid:gem": {
      "textures": "textures/items/gem"
    }
```

<details><summary>Hint</summary>
The comma goes after the wand entry's `}` and before `"kid:gem"`. If the
panel says a comma is missing, that is the one.
</details>

## Step 3: The picture itself
<!-- check
{"exists": "packs/kid_rp/textures/items/gem.png", "png": true, "msg": "copy assets/gem.png into packs/kid_rp/textures/items, next to wand.png, keeping the name gem.png"}
-->
Right-click `assets/gem.png` → **Copy**. Right-click
`packs/kid_rp/textures/items` → **Paste**.

<details><summary>Hint</summary>
It goes next to `wand.png`. If it pasted as `gem copy.png`, right-click
→ **Rename** → `gem.png`.
</details>

## Step 4: The name
<!-- check
{"regex": "packs/kid_rp/texts/en_US.lang", "pattern": "^item\\.kid:gem=\\S", "msg": "in en_US.lang add a line item.kid:gem=Gem (no .name on this one; look at the Wand line)"}
-->
In `packs/kid_rp/texts/en_US.lang`, add a line like the Wand's:

```
item.kid:gem=Gem
```

Any name after the `=`.

<details><summary>Hint</summary>
The key is `item.kid:gem`, with the colon, and no spaces around the
`=`.
</details>

## Step 5: Hold it
<!-- check
{"deploy": "ok", "behavior_packs": ["kid_bp"], "resource_packs": ["kid_rp"], "msg": "your packs have not reached the server yet; the Deploy panel at the bottom says why"}
{"game": "12-item", "msg": "the game does not know kid:gem yet; check the identifier in gem.json and that the status bar says live"}
-->
Wait for the status bar to say **live**. Your phone shows *Disconnected from server*: tap your server in the list to join again, and tap **Download** if it asks about a resource pack.

In chat: `/give @s kid:gem`. Tap it in the hotbar: its picture and its
name.

**Try this:** change its name in the lang file. Or make a third item,
`kid:coin`, reusing `gem.png`.

**Say it back:** name the four places `kid:gem` appears, and what you
would see if one said `kid:Gem`.

<details><summary>Hint</summary>
Purple-and-black picture: the icon and item_texture.json disagree. Raw name
like *item.kid:gem*: the lang line. Unknown item: gem.json.
</details>
