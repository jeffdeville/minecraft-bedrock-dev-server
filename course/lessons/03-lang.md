---
id: 03-lang
title: Rename anything in the game
concept: Every name the game shows comes from a text file with one name per line, and a resource pack can replace any line.
files: [packs/kid_rp/texts/en_US.lang, packs/kid_rp/texts/languages.json]
game: false
---

# Rename anything in the game

## The idea

Minecraft never has the word "Diamond" built into the item. It has a key,
`item.diamond.name`, and a list that says what that key reads as in each
language. The list is a plain text file, one line per name, like a
dictionary: `key=what to show`.

Your resource pack can carry its own copy of that list. Any line you put in
it wins over the game's own, for everyone who has your pack. So renaming a
diamond is one line of text, no code, and it is the first change you will
actually *see* in the game.

## Step 1: Write the new name
<!-- check
{"exists": "packs/kid_rp/texts/en_US.lang", "msg": "there is no file at packs/kid_rp/texts/en_US.lang yet; make a texts folder inside kid_rp, and the file inside that"}
{"regex": "packs/kid_rp/texts/en_US.lang", "pattern": "^item\\.diamond\\.name=(?!\\s*diamond\\s*$)\\S", "msg": "the file needs a line that starts with item.diamond.name= followed by the new name; and \"Diamond\" is the old name, pick a new one"}
-->
Inside `kid_rp`, make a new folder called `texts`. Inside it, make a file
called `en_US.lang` (that is the game's name for American English). Put one
line in it:

```
item.diamond.name=Shiny Rock
```

Everything after the `=` is yours to choose. No quotes, no comma, no
spaces around the `=`.

<details><summary>Hint</summary>
The folder is `texts` (with an s), the file is `en_US.lang` with a capital
U and S. The line is the key, then `=`, then your name. If you typed quotes
around the name they will show up in the game, so leave them out.
</details>

## Step 2: Say which languages you wrote
<!-- check
{"exists": "packs/kid_rp/texts/languages.json", "msg": "there is no file at packs/kid_rp/texts/languages.json yet; it goes next to en_US.lang"}
{"json": "packs/kid_rp/texts/languages.json", "path": "[0]", "equals": "en_US", "msg": "languages.json should be a list with \"en_US\" in it, exactly: [\"en_US\"]"}
-->
Next to `en_US.lang`, make a file called `languages.json` with this in it:

```json
["en_US"]
```

It tells the game which language files to look for. Without it, your
`.lang` file is ignored without a word.

<details><summary>Hint</summary>
The whole file is those eight characters: an opening bracket, `"en_US"` in
double quotes, a closing bracket. It lives in the `texts` folder, next to
`en_US.lang`.
</details>

## Step 3: See it
<!-- check
{"deploy": "ok", "resource_packs": ["kid_rp"], "msg": "the last deploy did not install kid_rp; the deploy message on your course page says why"}
-->
Save, wait for the status bar to say **live**, then leave your world and
join it again. Open your inventory (creative mode: search for it) and hover
over a diamond. It has your name now.

Any name in the game can be changed the same way. The keys look like
`item.<thing>.name` for items and `tile.<thing>.name` for blocks. Try one
more before moving on.

<details><summary>Hint</summary>
If the diamond is still called Diamond: did you rejoin the world after the
status bar said live? The pack only updates when you join. If the deploy
failed, the message names the problem.
</details>
