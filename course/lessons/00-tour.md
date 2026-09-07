---
id: 00-tour
title: Look around your add-on
concept: Your add-on is two folders the server reads, and anything you change in them shows up in your world.
files: []
game: true
---

# Look around your add-on

## The idea

Your add-on is already in the game. It has two halves: `kid_bp` is the
code half (what happens) and `kid_rp` is the looks half (pictures and
names). Your server reads both. Every time you change a file, the file saves
itself, the server restarts with the new one, and the status bar at the
bottom says **live**. Your phone drops out of the world for a moment each
time; that is normal.

Today you only look, join, and hold something your pack made.

**Predict:** which half made the words in chat, and which made the Wand's
picture?

## Step 1: Find the two halves
<!-- check
{"deploy": "ok", "behavior_packs": ["kid_bp"], "resource_packs": ["kid_rp"], "scripts_ok": true, "msg": "your server is still starting with your packs; wait for the status bar at the bottom to say live"}
-->
In the file tree on the left open `packs` → `kid_bp` → `scripts` →
`main.js`. That is your code: one block that waits for a player to appear.
Then open `packs` → `kid_rp` → `texts` → `en_US.lang`: one line, the
Wand's name. Change nothing yet.

<details><summary>Hint</summary>
The bar at the bottom of the editor says **live** when your server has your
packs. If it says *deploying*, wait. If it says *failed*, click it and show
someone.
</details>

## Step 2: Join your world
<!-- check
{"game": "00-joined", "msg": "I do not see you in the world yet; on your phone tap Play, then Servers, then your server, then Join Server"}
-->
On your phone: **Play** → **Servers** → scroll to your server → **Join
Server**. Tap **Download** if it asks about resource packs. When you appear,
chat says **My Pack is on!** That line is in `main.js`.

Then press **Check** in the panel (or type `lesson check` in the terminal).

<details><summary>Hint</summary>
Chat is the speech bubble at the top of the screen. If the Servers tab is
empty, someone needs to add your server once: **Add Server**, then the
address.
</details>

## Step 3: Hold your wand
<!-- check
{"game": "00-wand", "msg": "nobody is holding a Wand yet; open chat, type /give @s kid:wand and press Enter, then tap the Wand in your hotbar"}
-->
Tap the chat bubble and type:

```
/give @s kid:wand
```

Tap the Wand in your hotbar: its name shows above the hotbar. `kid_bp` made
the item; `kid_rp` gave it the picture and the name. Was your prediction
right?

**Try this:** drop the Wand and pick it up. Open your inventory and find it
there.

**Say it back:** what does the server read, and where do you see the result?

<details><summary>Hint</summary>
The command needs the slash and the colon: `/give @s kid:wand`. If the game
says you do not have permission, that is the server's setting, not you: tell
someone.
</details>
