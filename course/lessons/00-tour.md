---
id: 00-tour
title: The two halves of an add-on
concept: A behavior pack says what things do; a resource pack says what things look like, sound like and are called; the same name in both is how they find each other.
files: [packs/kid_bp/items/wand.json, packs/kid_rp/texts/en_US.lang, packs/kid_rp/textures/items/wand.png]
game: true
---

# The two halves of an add-on

## The idea

Think about a creeper. Two different things make it a creeper:

- **What it does.** It walks toward you, hisses, and explodes.
- **What it looks like.** Green skin, that face, the hiss sound, the name
  "Creeper" above it.

Minecraft keeps those two things in two separate packs. A **behavior pack**
holds what things *do*: an item exists, a mob attacks, code runs when a
player appears. A **resource pack** holds what things *look like, sound like
and are called*: pictures, sounds, names.

Your add-on is one of each. `kid_bp` is your behavior pack (bp). `kid_rp` is
your resource pack (rp). Your server reads both. Take away the resource
pack and everything still *works*, it just looks wrong: an item with no
picture shows up as a purple-and-black square. Take away the behavior pack
and the pictures are still there, but nothing happens.

How does the game know that a picture in one pack belongs to an item in the
other? By the **name**. Your Wand is called `kid:wand` in both halves.
That name is the thread that ties the two together.

**Predict:** if you change the Wand's *picture*, will it still work when you
tap with it? If you change its *name*, will it still have its picture?

## Step 1: Meet the Wand in both halves
<!-- check
{"deploy": "ok", "behavior_packs": ["kid_bp"], "resource_packs": ["kid_rp"], "scripts_ok": true, "msg": "your server is still starting with your packs; wait for the status bar at the bottom to say live"}
-->
In the file tree on the left, open these three files, one after another.
Change nothing yet.

1. `packs` → `kid_bp` → `items` → `wand.json`. Behavior. Find the line
   `"identifier": "kid:wand"`. This file is what makes a Wand *exist*.
2. `packs` → `kid_rp` → `textures` → `items` → `wand.png`. Looks. The
   editor shows you the picture.
3. `packs` → `kid_rp` → `texts` → `en_US.lang`. Looks. One line:
   `item.kid:wand=Wand`. Left of `=` is the name from step 1; right of `=`
   is what players see.

Same name, `kid:wand`, in all three. That is the thread.

<details><summary>Hint</summary>
Click the little arrows next to folder names to open them. The bar at the
bottom of the editor says **live** when your server has your packs. If it
says *deploying*, wait. If it says *failed*, click it and show someone.
</details>

## Step 2: Join your server
<!-- check
{"game": "00-joined", "msg": "I do not see you in the world yet; on your phone go to Play, then the Servers tab, tap your server, then Join Server"}
-->
Your server is called **{{LEARNER}}'s world**. It lives at the address
`{{SERVER_ADDRESS}}` on port `{{SERVER_PORT}}`. You add it to your phone
once; after that it stays in your list.

On your phone, in Minecraft:

1. Tap **Play**.
2. Tap the **Servers** tab at the top.
3. Scroll to the bottom and tap **Add Server**.
4. Fill in the three boxes:
   - **Server Name:** `{{LEARNER}}'s world` (any name is fine)
   - **Server Address:** `{{SERVER_ADDRESS}}`
   - **Port:** `{{SERVER_PORT}}`
5. Tap **Save**. Your server appears in the list.
6. Tap it, then tap **Join Server**.
7. If it asks about a resource pack, tap **Download**. That is your `kid_rp`
   arriving on your phone.

When you appear, chat says **My Pack is on!**. That sentence comes from
`kid_bp`, the behavior half: a line of code that runs when a player appears.

Then press **Check in the game** in the panel.

<details><summary>Hint</summary>
Chat is the speech bubble at the top of the screen; if you missed it, tap
the bubble to see the last lines. If the game says it cannot connect, check
the address for typos and that the port is exactly `{{SERVER_PORT}}`. If it
says you need to sign in, that is Xbox Live: the game needs an account to
join any server.
</details>

## Step 3: Hold your Wand
<!-- check
{"game": "00-wand", "msg": "nobody is holding a Wand yet; open chat, type /give @s kid:wand and press Enter, then tap the Wand in your hotbar"}
-->
Tap the chat bubble and type this, then press Enter:

```
/give @s kid:wand
```

`@s` means *me*. `kid:wand` is the name from step 1. The Wand lands in your
hotbar. Tap it: its name **Wand** shows above the hotbar, and it has a
picture.

Now the two halves, in your hand:

- The Wand **exists** because of `wand.json` in `kid_bp`.
- It has a **picture** because of `wand.png` in `kid_rp`.
- It is **called** Wand because of `en_US.lang` in `kid_rp`.

Press **Check in the game**. Then try your prediction:

**Try this:** in `kid_rp/texts/en_US.lang`, change `Wand` to any name you
like. Wait for **live**, join again, `/give @s kid:wand` again. New name,
same Wand: you changed the looks half, and the behavior half did not care.
Change it back if you want.

**Say it back:** which half makes the Wand exist, and which half makes it
look like a Wand? What is the one thing both halves share?

<details><summary>Hint</summary>
The command needs the slash and the colon: `/give @s kid:wand`. If the
Wand shows as a purple-and-black square, the picture half did not arrive:
leave the world and join again, and tap **Download** when asked.
</details>
