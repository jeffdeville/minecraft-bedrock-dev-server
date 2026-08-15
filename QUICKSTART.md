# Quickstart

Everything you do day-to-day is one command.

```bash
mc dev
```

Leave it running. Every time you save a file, your code goes to the server and
the server restarts with it. Watch the terminal — it prints `✓ deployed` when
it's ready. Reconnect in Minecraft and your change is live.

## Where to write code

`src/starter/main.ts` — that's it. Start there.

```ts
import { world } from "@minecraft/server";

world.afterEvents.playerSpawn.subscribe((event) => {
  event.player.sendMessage("hello!");
});
```

Your editor will autocomplete everything under `world.` and `system.` — that's
the fastest way to find out what the API can do.

## Seeing what went wrong

Open the log page (`mc logs` prints the URL). Tick **errors only** to filter out
the noise. If your script has a bug, the stack trace is there.

To print your own messages, use `console.warn` — plain `console.log` gets
swallowed by the server.

```ts
console.warn("got here", someValue);
```

## The other commands

| Command | What it does |
|---|---|
| `mc dev` | Watch and deploy on every save. The main one. |
| `mc sync` | Deploy once, right now. |
| `mc push "what I did"` | Save a checkpoint to git you can go back to. |
| `mc logs` | Open the web console. `mc logs -t` tails it in the terminal. |
| `mc console "time set day"` | Run any Minecraft command on the server. |
| `mc backup` | Download a copy of the world. |
| `mc status` | Did the last deploy work? |

## When something is weird

Scripts sometimes get strange after many fast reloads — event handlers stack up.
Force a clean restart:

```bash
mc console stop     # the server comes back on its own in a few seconds
```
