---
id: 01-manifest
title: A pack is a folder with a manifest
concept: Minecraft finds an add-on by its folder and reads one file, manifest.json, to learn what it is.
files: [packs/kid_bp/manifest.json]
game: false
---

# A pack is a folder with a manifest

## The idea

Minecraft cannot read your mind. To find an add-on it looks for a folder, and
inside that folder a file with the exact name `manifest.json`. That file is the
pack's ID card. It says the pack's name, what kind of pack it is, and gives it
two serial numbers, called UUIDs, that no other pack in the world has. If the
ID card is missing or has a mistake in it, Minecraft skips the folder without
saying a word, the way a chest with no sign is just another chest.

Everything you build in this course lives in one folder like that,
`packs/kid_bp`. The `bp` means behavior pack: the half of an add-on that
changes what things *do*. Later there is a second half, the resource pack,
which changes how things *look*.

## Step 1: Make the file
<!-- check
{"exists": "packs/kid_bp/manifest.json", "msg": "there is no file at packs/kid_bp/manifest.json yet; check the folder name and the file name, all lowercase"}
{"json": "packs/kid_bp/manifest.json", "path": "header", "exists": true, "msg": "the file needs the whole starter text; copy it again and make sure nothing is missing at the start or the end"}
{"json": "packs/kid_bp/manifest.json", "path": "modules[0]", "exists": true, "msg": "the modules part is missing; copy the starter text again"}
-->
In the file tree on the left, right-click `packs` and choose **New Folder**.
Name it `kid_bp`. Right-click `kid_bp`, choose **New File**, and name it
`manifest.json`. Paste this in and save:

```json
{
  "format_version": 2,
  "header": {
    "name": "My Pack",
    "description": "My first behavior pack",
    "uuid": "PASTE-A-UUID-HERE",
    "version": [1, 0, 0],
    "min_engine_version": [1, 26, 0]
  },
  "modules": [
    {
      "type": "data",
      "uuid": "PASTE-A-UUID-HERE",
      "version": [1, 0, 0]
    }
  ]
}
```

Do not worry about what it all means yet. The next steps change the parts
that matter, and the rest stays as it is.

<details><summary>Hint</summary>
The file must be inside `packs/kid_bp/`, and its name must be exactly
`manifest.json`: all lowercase, with `.json` on the end. If the editor shows a
red squiggle in the file, a comma, quote or bracket is missing; select all,
delete, and paste the starter text again.
</details>

## Step 2: Name your pack
<!-- check
{"json": "packs/kid_bp/manifest.json", "path": "header.name", "not": "My Pack", "msg": "the name is still \"My Pack\"; change the text between the quotes after \"name\" to something of your own"}
{"json": "packs/kid_bp/manifest.json", "path": "header.name", "matches": "\\S", "msg": "the name is empty; put some text between the quotes"}
-->
Find the line that says `"name": "My Pack"`. Change `My Pack` to whatever you
want your pack to be called. Keep the quotes around it: they tell Minecraft
where the name starts and ends.

<details><summary>Hint</summary>
Only the text *between* the second pair of quotes changes. The line should
still look like `"name": "Something You Chose",` with a comma at the end,
because another line follows it.
</details>

## Step 3: Give it a serial number
<!-- check
{"json": "packs/kid_bp/manifest.json", "path": "header.uuid", "uuid": true, "msg": "the uuid in the header has to be a real UUID: 32 letters and numbers with dashes, like 7c1b3a9e-2f4d-4e8a-9b6c-1d2e3f4a5b6c"}
-->
A UUID is a serial number so long that no two are ever the same, so your pack
can never be confused with anyone else's. In the terminal at the bottom of the
editor, type `lesson uuid` and press Enter. It prints one. Copy it, and paste
it over `PASTE-A-UUID-HERE` in the `header` part, the first one in the file.
Keep the quotes.

<details><summary>Hint</summary>
Select the words `PASTE-A-UUID-HERE` (only the words, not the quotes) and
paste. If `lesson uuid` prints nothing, click inside the terminal first and try
again. The result should look like `"uuid": "9f2c...-...-...-...-...",` with
five groups separated by dashes.
</details>

## Step 4: And one for the module
<!-- check
{"json": "packs/kid_bp/manifest.json", "path": "modules[0].uuid", "uuid": true, "msg": "the uuid inside modules also has to be a real UUID; run `lesson uuid` again for a new one"}
{"json": "packs/kid_bp/manifest.json", "path": "modules[0].uuid", "differsFrom": "header.uuid", "msg": "the module needs its own UUID, different from the one in the header; run `lesson uuid` again and paste the new one"}
{"json": "packs/kid_bp/manifest.json", "path": "modules[0].type", "equals": "data", "msg": "the module type should still be \"data\"; that word tells Minecraft this pack holds behavior, not pictures"}
-->
The pack has a second UUID lower down, inside `modules`. That one is for the
part of the pack that holds your behavior. Run `lesson uuid` again to get a
**new** one and paste it over the second `PASTE-A-UUID-HERE`.

<details><summary>Hint</summary>
Every UUID in the file must be different. If you pasted the same one twice,
run `lesson uuid` once more and replace the second one.
</details>

## Step 5: See it arrive
<!-- check
{"deploy": "ok", "behavior_packs": ["kid_bp"], "msg": "the last deploy did not install kid_bp; the deploy message on your course page says why"}
-->
Save. Within about fifteen seconds your course page shows a new deploy with
your pack's name in it. That is the whole trip: you saved a file, the server
read your ID card, and it now knows your pack exists. It does nothing yet.
That changes in the next lesson.

<details><summary>Hint</summary>
If the course page says the deploy failed, read the message: it names the
file and the problem. Most often it is a missing comma or quote. Fix it and
save again; every save is another try.
</details>
