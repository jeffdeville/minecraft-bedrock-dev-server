---
id: 02-resource-pack
title: The other half: a resource pack
concept: A resource pack changes how things look, and the behavior pack must name it so the two halves travel together.
files: [packs/kid_rp/manifest.json, packs/kid_rp/pack_icon.png, packs/kid_bp/manifest.json]
game: false
---

# The other half: a resource pack

## The idea

An add-on has two halves. The behavior pack you made says what things *do*.
The resource pack says how things *look* and *sound*, and what they are
*called*: pictures, names, sounds. Minecraft treats them as two separate
packs, each with its own ID card and its own serial numbers, the way a
skin and a map are separate downloads.

They only work as a team if the behavior pack lists the resource pack as
something it needs. That list is called `dependencies`, and it uses the
resource pack's UUID, so the two halves can always find each other no matter
what they are named.

## Step 1: Make the resource pack's ID card
<!-- check
{"exists": "packs/kid_rp/manifest.json", "msg": "there is no file at packs/kid_rp/manifest.json yet; the folder is kid_rp (rp for resource pack), next to kid_bp"}
{"json": "packs/kid_rp/manifest.json", "path": "modules[0].type", "equals": "resources", "msg": "the module type must be \"resources\"; that word is what makes this a resource pack"}
{"json": "packs/kid_rp/manifest.json", "path": "header.name", "matches": "\\S", "msg": "give the resource pack a name between the quotes"}
-->
Right-click `packs`, **New Folder**, name it `kid_rp`. Inside it make a new
file `manifest.json` and paste this. Notice the module type says
`resources` this time, and change the name to something of your own:

```json
{
  "format_version": 2,
  "header": {
    "name": "My Resource Pack",
    "description": "How my things look",
    "uuid": "PASTE-A-UUID-HERE",
    "version": [1, 0, 0],
    "min_engine_version": [1, 26, 0]
  },
  "modules": [
    {
      "type": "resources",
      "uuid": "PASTE-A-UUID-HERE",
      "version": [1, 0, 0]
    }
  ]
}
```

<details><summary>Hint</summary>
Same shape as lesson 1, two differences: the folder is `kid_rp`, and the
module `type` is `resources` instead of `data`. If the check says the type is
wrong, look at the word after `"type":`.
</details>

## Step 2: Two new serial numbers
<!-- check
{"json": "packs/kid_rp/manifest.json", "path": "header.uuid", "uuid": true, "msg": "the header uuid in kid_rp needs a real UUID; run `lesson uuid` in the terminal and paste it over the placeholder"}
{"json": "packs/kid_rp/manifest.json", "path": "modules[0].uuid", "uuid": true, "msg": "the module uuid in kid_rp also needs a real UUID; run `lesson uuid` again for a different one"}
{"json": "packs/kid_rp/manifest.json", "path": "modules[0].uuid", "differsFrom": "header.uuid", "msg": "the two UUIDs in kid_rp must be different from each other; run `lesson uuid` once more"}
{"json": "packs/kid_rp/manifest.json", "path": "header.uuid", "not": "3a1f6b2c-9d4e-4a7b-8c1d-5e2f7a9b0c31", "msg": "that UUID belongs to the behavior pack; every pack needs its own"}
-->
Run `lesson uuid` twice in the terminal and paste one result over each
`PASTE-A-UUID-HERE`. They must be different from each other, and different
from the ones in `kid_bp`: every pack and every module in the world has its
own.

<details><summary>Hint</summary>
Two placeholders, two runs of `lesson uuid`, two pastes. If you reuse a UUID
from `kid_bp`, Minecraft will think it is the same pack twice.
</details>

## Step 3: Give it a picture
<!-- check
{"exists": "packs/kid_rp/pack_icon.png", "png": true, "msg": "there is no pack_icon.png inside packs/kid_rp yet; copy the one from assets/ (right-click it, Copy, then right-click kid_rp, Paste)"}
-->
Every pack can have an icon, a picture Minecraft shows next to its name. In
the file tree, find `assets/pack_icon.png`, right-click it and choose
**Copy**. Then right-click the `kid_rp` folder and choose **Paste**. The
file name must stay exactly `pack_icon.png`.

Later you can draw your own: any 64 by 64 PNG works.

<details><summary>Hint</summary>
The copy must land directly inside `kid_rp`, next to `manifest.json`, not
inside `assets` or `kid_bp`. If the name got changed on paste, right-click
it, **Rename**, and make it `pack_icon.png`.
</details>

## Step 4: Tell the behavior pack about it
<!-- check
{"json": "packs/kid_bp/manifest.json", "path": "dependencies[0].uuid", "exists": true, "msg": "kid_bp/manifest.json needs a dependencies list with the resource pack's uuid in it; add it after the modules list"}
{"same": [{"file": "packs/kid_bp/manifest.json", "path": "dependencies[0].uuid"}, {"file": "packs/kid_rp/manifest.json", "path": "header.uuid"}], "msg": "the uuid in kid_bp's dependencies must be the header uuid from kid_rp/manifest.json (the first one in that file), copied exactly"}
{"json": "packs/kid_bp/manifest.json", "path": "dependencies[0].version", "exists": true, "msg": "the dependency also needs a \"version\": [1, 0, 0] line"}
-->
Open `packs/kid_bp/manifest.json`. After the `modules` list, before the
final `}`, add a `dependencies` list naming the resource pack. Copy the
**header** UUID from `kid_rp/manifest.json` (the first one in that file) into
it:

```json
  "dependencies": [
    {
      "uuid": "THE-HEADER-UUID-FROM-kid_rp",
      "version": [1, 0, 0]
    }
  ]
```

Mind the comma: the `]` that closes `modules` needs a comma after it now,
because something follows.

<details><summary>Hint</summary>
The end of the file should look like this, with the closing bracket of
`modules`, a comma, then the new list:

```json
    }
  ],
  "dependencies": [
    {
      "uuid": "...the header uuid from kid_rp...",
      "version": [1, 0, 0]
    }
  ]
}
```

If the check says the uuid does not match, copy it again from the `header`
section of `kid_rp/manifest.json`, not from `modules`.
</details>

## Step 5: See both halves arrive
<!-- check
{"deploy": "ok", "behavior_packs": ["kid_bp"], "resource_packs": ["kid_rp"], "msg": "the last deploy did not install both packs; the deploy message on your course page says why"}
-->
Save. The status bar says **live: kid_bp, kid_rp** when the server has both.
Leave your world and join it again: the server hands your resource pack to
the game as you come in. Nothing looks different yet, because the pack is
still empty. The next lesson fills it.

<details><summary>Hint</summary>
If the deploy failed, the message names the file and the problem; most
often it is the comma before `dependencies`. Fix it and save again.
</details>
