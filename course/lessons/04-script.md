---
id: 04-script
title: A pack can carry a script
concept: A behavior pack runs code only if its manifest declares a script module, names the entry file, and asks for the server API.
files: [packs/kid_bp/manifest.json, packs/kid_bp/scripts/main.js]
game: false
---

# A pack can carry a script

## The idea

So far your packs are only files the game reads. A **script** is different:
it is a program the server *runs*, in a language called JavaScript. It can
watch what happens in the world and react. Everything from here on is
scripting.

For a script to run, the manifest has to promise three things: that this
pack has a script module (so the game looks for code at all), which file the
code starts in, and which version of the server's toolbox, `@minecraft/server`,
the code was written for. Get one of them wrong and the game skips the
script silently. This lesson sets up all three, and writes a script that does
nothing yet.

## Step 1: Add a script module
<!-- check
{"json": "packs/kid_bp/manifest.json", "path": "modules[1].type", "equals": "script", "msg": "kid_bp's manifest needs a second module with \"type\": \"script\", after the data module"}
{"json": "packs/kid_bp/manifest.json", "path": "modules[1].language", "equals": "javascript", "msg": "the script module needs \"language\": \"javascript\""}
{"json": "packs/kid_bp/manifest.json", "path": "modules[1].entry", "equals": "scripts/main.js", "msg": "the script module's \"entry\" must be \"scripts/main.js\", the file the code starts in"}
-->
Open `packs/kid_bp/manifest.json`. Inside the `modules` list, after the
`data` module's closing `}`, add a second module. Mind the comma between
them:

```json
    {
      "type": "script",
      "language": "javascript",
      "uuid": "PASTE-A-UUID-HERE",
      "version": [1, 0, 0],
      "entry": "scripts/main.js"
    }
```

<details><summary>Hint</summary>
The `modules` list should now hold two `{ ... }` blocks with a comma between
them, like this:

```json
  "modules": [
    {
      "type": "data",
      ...
    },
    {
      "type": "script",
      ...
    }
  ],
```
</details>

## Step 2: Its serial number
<!-- check
{"json": "packs/kid_bp/manifest.json", "path": "modules[1].uuid", "uuid": true, "msg": "the script module needs its own real UUID; run `lesson uuid` and paste it"}
{"json": "packs/kid_bp/manifest.json", "path": "modules[1].uuid", "differsFrom": "modules[0].uuid", "msg": "the script module's UUID must differ from the data module's; run `lesson uuid` again"}
{"json": "packs/kid_bp/manifest.json", "path": "modules[1].uuid", "differsFrom": "header.uuid", "msg": "the script module's UUID must differ from the header's; run `lesson uuid` again"}
-->
Run `lesson uuid` and paste the result over `PASTE-A-UUID-HERE` in the new
module. Third UUID in this file, all different.

<details><summary>Hint</summary>
Same move as before: `lesson uuid` in the terminal, copy, select the
placeholder, paste.
</details>

## Step 3: Ask for the server's toolbox
<!-- check
{"json": "packs/kid_bp/manifest.json", "path": "dependencies[1].module_name", "equals": "@minecraft/server", "msg": "the dependencies list needs a second entry with \"module_name\": \"@minecraft/server\", after the resource pack one"}
{"json": "packs/kid_bp/manifest.json", "path": "dependencies[1].version", "equals": "2.9.0", "exact": true, "msg": "the @minecraft/server version must be exactly \"2.9.0\" in quotes, because that is what this server offers"}
{"json": "packs/kid_bp/manifest.json", "path": "dependencies[1].uuid", "absent": true, "msg": "a dependency has either a uuid (a pack) or a module_name (a toolbox), never both; remove the uuid from the @minecraft/server entry"}
-->
In the same file, the `dependencies` list already names your resource pack.
Add a second entry after it, for the server's scripting toolbox:

```json
    {
      "module_name": "@minecraft/server",
      "version": "2.9.0"
    }
```

Two things are different about this entry on purpose: it has a
`module_name` instead of a `uuid`, and its version is text in quotes, not
three numbers.

<details><summary>Hint</summary>
The list should end up as two entries with a comma between them: the
resource pack one with a `uuid`, then this one with a `module_name`. Copy
`2.9.0` exactly, in quotes.
</details>

## Step 4: The file the code starts in
<!-- check
{"exists": "packs/kid_bp/scripts/main.js", "msg": "there is no file at packs/kid_bp/scripts/main.js yet; make a scripts folder inside kid_bp and main.js inside it"}
{"regex": "packs/kid_bp/scripts/main.js", "pattern": "import\\s*\\{[^}]*\\bworld\\b[^}]*\\}\\s*from\\s*[\"']@minecraft/server[\"']", "msg": "main.js needs the import line exactly: import { world } from \"@minecraft/server\";"}
{"js": "packs/kid_bp/scripts/main.js", "msg": "main.js has a problem the server would refuse it for"}
-->
Inside `kid_bp`, make a folder called `scripts`, and inside it a file called
`main.js`. Put one line in it:

```js
import { world } from "@minecraft/server";
```

That line opens the toolbox and takes out `world`, the thing your code will
talk to. It does nothing else yet, and that is the point: a script that
loads cleanly before it does anything.

<details><summary>Hint</summary>
Copy the line exactly: the curly braces around `world`, the word `from`, the
name in double quotes, the semicolon at the end. The folder is `scripts`
with an s; the file is `main.js`.
</details>

## Step 5: Loaded
<!-- check
{"deploy": "ok", "behavior_packs": ["kid_bp"], "msg": "the last deploy did not install kid_bp; the deploy message on your course page says why"}
-->
Save and wait for **live** in the status bar. Nothing changes in the game,
but the server has now loaded a script of yours. If it had refused it, the
deploy would still say live, so from now on the checker reads your
script before the server does. The next lesson makes it speak.

<details><summary>Hint</summary>
If the deploy failed, the message names the problem; a missing comma
between the two modules or the two dependencies is the usual one.
</details>
