---
id: 06-first-time-only
title: Say different things on join and respawn
concept: if asks a yes-or-no question and runs one of two sets of lines.
files: [packs/kid_bp/scripts/main.js]
game: false
---

# Say different things on join and respawn

## The idea

`if` asks a yes-or-no question and runs one set of lines when the answer
is yes, another when it is no. The package for a player appearing has
`event.initialSpawn`: yes the first time you appear after joining, no when
you come back after dying.

**Predict:** after you die and come back, which message will you see?

## Step 1: Ask the question
<!-- check
{"js": "packs/kid_bp/scripts/main.js", "msg": "main.js has a problem; the if needs a } on its own line after the sendMessage line"}
{"regex": "packs/kid_bp/scripts/main.js", "pattern": "if\\s*\\(\\s*event\\.initialSpawn\\s*\\)\\s*\\{", "msg": "the line is if (event.initialSpawn) { with the parentheses and the {, and it goes above the sendMessage line"}
-->
In the hello block, wrap the sendMessage line so it reads:

```js
    if (event.initialSpawn) {
      world.sendMessage("...");
    }
```

Keep your own sendMessage line in the middle.

<details><summary>Hint</summary>
Three lines: the `if` line, your sendMessage line, then `}` on its own.
Both braces are curly, and `initialSpawn` has a capital S.
</details>

## Step 2: Add the other answer
<!-- check
{"js": "packs/kid_bp/scripts/main.js", "msg": "main.js has a problem; the else needs its own { and }"}
{"regex": "packs/kid_bp/scripts/main.js", "pattern": "\\}\\s*else\\s*\\{[\\s\\S]{0,120}?world\\.sendMessage\\(", "msg": "change the } that closes the if into } else { then a second sendMessage line, then a new }"}
-->
Change that closing `}` into these three lines:

```js
    } else {
      world.sendMessage("Back again!");
    }
```

<details><summary>Hint</summary>
The `}` that closed the if becomes `} else {`. Then the second message,
then a new `}` to close the else.
</details>

## Step 3: See it
<!-- check
{"deploy": "ok", "behavior_packs": ["kid_bp"], "scripts_ok": true, "msg": "the server has not taken your script yet; the Deploy panel at the bottom says why"}
-->
Wait for the status bar to say **live**. Your phone shows *Disconnected from server*: tap your server in the list to join again, and tap **Download** if it asks about a resource pack.

Read chat. Then type `/kill @s`. When you respawn, read chat again.

**Try this:** swap the two messages.

**Say it back:** what question does the if ask, and what are its two
answers?

<details><summary>Hint</summary>
Same message both times? Check the if says `event.initialSpawn`. No
message? Wait for **live** and join again.
</details>
