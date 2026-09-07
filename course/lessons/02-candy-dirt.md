---
id: 02-candy-dirt
title: Change how a block looks
concept: A looks pack replaces any picture in the game by putting a file at the same path with the same name.
files: [packs/kid_rp/textures/blocks/dirt.png]
game: false
---

# Change how a block looks

## The idea

Every picture in the game is a file with a path, like
`textures/blocks/dirt.png`. If your looks pack has a file at exactly that
path, the game uses yours instead. No code, no JSON: the folder and the name
are the whole trick.

**Predict:** will only new dirt you place change, or every dirt block
already in the world?

## Step 1: Put the picture where the game looks
<!-- check
{"exists": "packs/kid_rp/textures/blocks/dirt.png", "png": true, "msg": "I cannot find dirt.png inside packs/kid_rp/textures/blocks; make a folder called blocks inside textures, then copy assets/dirt.png into it"}
-->
In the file tree, right-click `packs/kid_rp/textures` → **New Folder** →
type `blocks`. Then right-click `assets/dirt.png` → **Copy**, right-click
`blocks` → **Paste**. The file keeps its name, `dirt.png`.

<details><summary>Hint</summary>
The folder is `blocks` with an s, all lowercase, inside `textures`. If
the pasted file is called `dirt copy.png`, right-click it → **Rename** →
`dirt.png`.
</details>

## Step 2: See it
<!-- check
{"deploy": "ok", "resource_packs": ["kid_rp"], "msg": "your looks pack has not reached the server yet; the Deploy panel at the bottom says why"}
-->
Wait for the status bar to say **live**. Your phone shows *Disconnected from server*: tap your server in the list to join again, and tap **Download** if it asks about a resource pack.

Look down. Every dirt block is pink.

**Try this:** copy the same file into `blocks` again and rename the copy
`stone.png`.

**Say it back:** why did the block change without any code?

<details><summary>Hint</summary>
Still brown? Join again after **live**. Then check the file tree reads
`packs` → `kid_rp` → `textures` → `blocks` → `dirt.png`.
</details>
