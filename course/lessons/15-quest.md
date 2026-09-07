---
id: 15-quest
title: A tiny quest
concept: A quest is an event that starts it, state that remembers it, a condition that checks it, and an effect that rewards it.
files: [packs/kid_bp/dialogue/scene.json, packs/kid_bp/scripts/main.js]
game: true
---

# A tiny quest

## The idea

A quest is four things you have already met. An event starts it: a button
on an NPC. State remembers you are on it: a tag on you, like `/tag`. A
condition checks progress: ten blocks broken. An effect rewards you: big
words and a sound.

**Predict:** what has to be true for a broken block to count?

## Step 1: What the NPC says
<!-- check
{"exists": "packs/kid_bp/dialogue/scene.json", "msg": "make a folder dialogue inside packs/kid_bp and a file scene.json inside it"}
{"json": "packs/kid_bp/dialogue/scene.json", "path": "minecraft:npc_dialogue.scenes[0].scene_tag", "equals": "kid_quest", "msg": "the scene_tag must be kid_quest; that is the name you will type in the game"}
{"json": "packs/kid_bp/dialogue/scene.json", "path": "minecraft:npc_dialogue.scenes[0].buttons[0].commands[0]", "matches": "^/scriptevent kid:quest\\b", "msg": "the button's command must start /scriptevent kid:quest"}
-->
Make a folder `dialogue` inside `packs/kid_bp`, and a file `scene.json`
inside it. Paste:

```json
{
  "format_version": "1.17",
  "minecraft:npc_dialogue": {
    "scenes": [
      {
        "scene_tag": "kid_quest",
        "npc_name": "Quest Giver",
        "text": "Break 10 blocks for me.",
        "buttons": [
          {
            "name": "I will do it",
            "commands": [
              "/scriptevent kid:quest start"
            ]
          }
        ]
      }
    ]
  }
}
```

The name and the text are yours to change.

<details><summary>Hint</summary>
Copy from the first `{` to the last `}`. The button's command sends your
script a message called `kid:quest`.
</details>

## Step 2: Start the quest
<!-- check
{"js": "packs/kid_bp/scripts/main.js", "msg": "main.js has a problem; the block goes at the very end and ends with });"}
{"regex": "packs/kid_bp/scripts/main.js", "pattern": "system\\.afterEvents\\.scriptEventReceive\\s*\\.subscribe", "msg": "the block starts system.afterEvents.scriptEventReceive (capital E and R) then .subscribe((event) => {"}
{"regex": "packs/kid_bp/scripts/main.js", "pattern": "if\\s*\\(\\s*event\\.id\\s*={2,3}\\s*\"kid:quest\"\\s*\\)", "msg": "the if compares event.id with \"kid:quest\" only; the word start is a separate message"}
{"same": [{"file": "packs/kid_bp/dialogue/scene.json", "pattern": "/scriptevent (kid:[a-z_]+)"}, {"file": "packs/kid_bp/scripts/main.js", "pattern": "event\\.id\\s*={2,3}\\s*\"(kid:[a-z_]+)\""}], "msg": "the name in the if must be the same as in scene.json's command: kid:quest"}
{"regex": "packs/kid_bp/scripts/main.js", "pattern": "addTag\\(\\s*\"kid:quest\"\\s*\\)", "msg": "inside the if: player.addTag(\"kid:quest\");"}
-->
At the very end of `main.js`, paste:

```js
system.afterEvents.scriptEventReceive
  .subscribe((event) => {
    if (event.id === "kid:quest") {
      const player = event.initiator
        ?? event.sourceEntity;
      player.addTag("kid:quest");
      player.sendMessage("Quest started!");
    }
  });
```

The player is whoever pressed the button, or typed the command.

<details><summary>Hint</summary>
`event.id` is `kid:quest`; the word `start` arrives separately, so do
not put it in the quotes.
</details>

## Step 3: Count and win
<!-- check
{"js": "packs/kid_bp/scripts/main.js", "msg": "main.js has a problem; count the { and } in the new block, two ifs need two closing braces"}
{"regex": "packs/kid_bp/scripts/main.js", "pattern": "^let\\s+questBlocks\\s*=\\s*0\\s*;", "msg": "let questBlocks = 0; goes on its own line outside every block, right above the new block"}
{"regex": "packs/kid_bp/scripts/main.js", "pattern": "hasTag\\(\\s*\"kid:quest\"\\s*\\)", "msg": "the block only counts if (player.hasTag(\"kid:quest\"))"}
{"same": [{"file": "packs/kid_bp/scripts/main.js", "pattern": "addTag\\(\\s*\"(kid:[a-z_]+)\""}, {"file": "packs/kid_bp/scripts/main.js", "pattern": "hasTag\\(\\s*\"(kid:[a-z_]+)\""}], "msg": "hasTag must ask for the same tag that addTag gave: kid:quest"}
{"regex": "packs/kid_bp/scripts/main.js", "pattern": "questBlocks\\s*>=\\s*10", "msg": "the winning question is if (questBlocks >= 10) so the tenth block wins"}
{"regex": "packs/kid_bp/scripts/main.js", "pattern": "addTag\\(\\s*\"kid:quest_done\"\\s*\\)", "msg": "when you win: player.addTag(\"kid:quest_done\");"}
-->
At the very end of `main.js`, paste:

```js
let questBlocks = 0;
world.afterEvents.playerBreakBlock
  .subscribe((event) => {
    const player = event.player;
    if (player.hasTag("kid:quest")) {
      questBlocks = questBlocks + 1;
      player.sendMessage(
        "Quest: " + questBlocks + " of 10");
      if (questBlocks >= 10) {
        player.removeTag("kid:quest");
        player.addTag("kid:quest_done");
        player.onScreenDisplay
          .setTitle("QUEST DONE");
        player.playSound("random.levelup");
      }
    }
  });
```

<details><summary>Hint</summary>
The outer `if` asks *are you on the quest*; the inner one asks *is that
ten yet*. Each has its own `}`.
</details>

## Step 4: Place the quest giver and play
<!-- check
{"deploy": "ok", "behavior_packs": ["kid_bp"], "scripts_ok": true, "msg": "the server has not taken your script yet; the Deploy panel at the bottom says why"}
{"game": "15-quest", "msg": "nobody has finished the quest yet; talk to the NPC, press the button, break ten blocks, then check again"}
-->
Wait for the status bar to say **live**. Your phone shows *Disconnected from server*: tap your server in the list to join again, and tap **Download** if it asks about a resource pack.

In chat, two commands:

```
/summon npc
/dialogue change @e[type=npc,c=1] kid_quest
```

Tap the NPC, press the button, break ten blocks. If the NPC will not talk,
type `/scriptevent kid:quest start` yourself.

**Try this:** 10 → 3. Or a reward:
`player.runCommand("give @s diamond 5");`

**Say it back:** event, state, condition, effect: name each one for this
quest.

<details><summary>Hint</summary>
NPC says nothing: the last word of the dialogue command must be
`kid_quest` exactly. No *Quest started!* in chat: the button's command in
`scene.json`.
</details>
