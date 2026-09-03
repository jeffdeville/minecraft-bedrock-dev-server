# Quickstart

For whoever is writing the add-on. Everything you do day-to-day is one command:

```bash
mc dev
```

Leave it running. Every time your add-on project writes a pack into
`MC_ADDON_DIR` (set in `.envrc`, `$HOME/minecraft-addons` by default), it goes
to the server and the server restarts with it. The terminal prints
`✓ deployed` when it's ready. Reconnect in Minecraft and your change is live.

## Where to write code

Not here. This repo only moves finished packs to the server. Point your add-on
project's build output at `MC_ADDON_DIR`: a pack directory with a
`manifest.json`, a `.mcpack`, or a `.mcaddon` all work, nested however your
tool likes. `examples/hello-pack/` shows the minimum a finished behavior pack
needs.

To try the loop before you have a project:

```bash
cp -r examples/hello-pack "$MC_ADDON_DIR/"
```

## Seeing what went wrong

Open the log page (`mc logs` prints the URL, and opens it). Tick **errors
only** to filter the noise. If your script has a bug, the stack trace is there.

To print your own messages from a script, use `console.warn` -- plain
`console.log` gets swallowed by the server.

```js
console.warn("got here", someValue);
```

## The other commands

| Command | What it does |
|---|---|
| `mc dev` | Watch and deploy on every save. The main one. |
| `mc sync` | Deploy once, right now. |
| `mc logs` | Open the web console. `mc logs -t` tails it in the terminal. |
| `mc console "time set day"` | Run any Minecraft command on the server. |
| `mc backup` | Download a copy of the world. |
| `mc status` | Did the last deploy work? |
| `mc doctor` | Something's off with this machine? Start here. |

## When something is weird

Scripts get strange after many fast reloads -- event handlers stack up. Force a
clean restart:

```bash
mc console stop     # the server comes back on its own in a few seconds
```
