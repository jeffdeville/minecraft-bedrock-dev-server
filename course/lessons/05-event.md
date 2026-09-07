---
id: 05-event
title: An event runs your code
concept: Code in a pack waits for something to happen in the world; subscribing to an event says which happening should run which code.
files: [packs/kid_bp/scripts/main.js]
game: false
---

# An event runs your code

## The idea

A script does not run from top to bottom like a recipe and then stop. It
sets up **listeners** and waits. An event is something that happens in the
world: a player appears, a block breaks, an item gets used. When you
*subscribe* to an event, you hand the server a piece of code and say "run
this every time that happens", the way a pressure plate is wired to a door.

The piece of code is called a function. It is written as `(event) => { ... }`:
the part in parentheses is what the server hands you about what happened,
and the code between the braces is what runs. This lesson subscribes to a
player appearing and says hello.

## Step 1: Listen for a player appearing
<!-- check
{"regex": "packs/kid_bp/scripts/main.js", "pattern": "world\\.afterEvents\\.playerSpawn\\.subscribe\\s*\\(", "msg": "main.js needs the line world.afterEvents.playerSpawn.subscribe( ... ) under the import"}
{"regex": "packs/kid_bp/scripts/main.js", "pattern": "subscribe\\s*\\(\\s*\\(\\s*\\w+\\s*\\)\\s*=>\\s*\\{", "msg": "subscribe needs a function to run: (event) => { ... } inside the parentheses"}
{"js": "packs/kid_bp/scripts/main.js", "msg": "main.js has a problem the server would refuse it for"}
-->
Under the import line in `packs/kid_bp/scripts/main.js`, add:

```js
world.afterEvents.playerSpawn.subscribe((event) => {

});
```

Read it right to left: subscribe a function to the `playerSpawn` event,
one of the `afterEvents` of the `world`. The function is empty for now, so
the server runs nothing when a player appears. Save it: the checker reads
the code even before the game does.

<details><summary>Hint</summary>
Every bracket opens and closes: `subscribe(` opens, `(event)` is the
function's input, `=> {` opens the body, `});` closes the body, the
subscribe call, and ends the line. Copy it exactly, including the empty
line in the middle where your code will go.
</details>

## Step 2: Say something
<!-- check
{"regex": "packs/kid_bp/scripts/main.js", "pattern": "world\\.sendMessage\\s*\\(\\s*[\"'`][^\"'`]+[\"'`]\\s*\\)", "msg": "inside the function's braces, add world.sendMessage(\"...\") with your message in the quotes"}
{"js": "packs/kid_bp/scripts/main.js", "msg": "main.js has a problem the server would refuse it for; world.sendMessage must be inside the function's braces, not outside them"}
-->
On the empty line between the braces, put:

```js
  world.sendMessage("Hello! Someone just arrived.");
```

`sendMessage` sends a line of chat to everyone in the world. Write whatever
you like between the quotes. Keep the semicolon at the end of the line.

<details><summary>Hint</summary>
The line has to be *inside* the braces `{ }` of the function, so it runs
when the event fires. Put outside, it would run while the server is still
loading, when there is no world to talk to yet, and the whole script would
fail.
</details>

## Step 3: Hear it
<!-- check
{"deploy": "ok", "behavior_packs": ["kid_bp"], "msg": "the last deploy did not install kid_bp; the deploy message on your course page says why"}
-->
Save, wait for **live**, then join your world. Your message appears in the
chat the moment you appear. Die and respawn, or leave and rejoin: it says
it again, because you appeared again. That is the whole idea of an event.

<details><summary>Hint</summary>
No message? Check the status bar said live before you joined, and that
your text is inside the quotes inside the braces. Then leave the world and
join again; the message is sent when you spawn, not while you stand there.
</details>
