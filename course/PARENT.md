# For the parent

One line per lesson: what to ask before, what to watch for, what the payoff
looks like. You do not need to have done the lesson. The lessons are
independent; any order works, though the numbering is the one we recommend.

Two things for every lesson: every deploy restarts the server, so the phone
drops to the menu (tap the server again; tap **Download** if it asks about a
resource pack), and the learner needs operator permission on their server to
type `/give`, `/kill`, `/summon` (the platform sets this; if a command says
"no permission", that is ours to fix, not theirs).

- **00-tour** — Before: "Which folder do you think makes the words in chat, and which makes the Wand's picture?" Watch for: joining before the status bar says live. Payoff: chat says *My Pack is on!* on join, and `/give @s kid:wand` puts a Wand with a picture in the hotbar.
- **01-rename-a-diamond** — Before: "Where will the new name show up?" Watch for: spaces around the `=`, quotes around the name, tapping the diamond in the hotbar (there is no hover on a phone). Payoff: a selected diamond shows their name above the hotbar. Then: "rename one more thing and show me".
- **02-candy-dirt** — Before: "Will every dirt block change, or only new ones?" Watch for: the folder spelled `block`, the file pasted as `dirt copy.png`. Payoff: all dirt is pink. Ask: "why did that need no code?"
- **03-say-hello** — Before: "When will your words appear: when the server starts, when you join, or both?" Watch for: a deleted quote (the panel shows a red box; that is a quote or bracket, not a reason to start over). Payoff: their words in chat on join, and again after `/kill @s`. Ask: "what is the event, and what runs?"
- **04-second-event** — Before: "Break three blocks: how many Crunches?" Watch for: pasting the new block inside the hello block. Payoff: chat says Crunch on every broken block. Ask them to name the three parts of the block.
- **05-say-my-name** — Before: "Will it say the word name, or your gamertag?" Watch for: `event.player.name` typed inside the quotes. Payoff: *Hello, <gamertag>*. Ask: "what is inside event?"
- **06-first-time-only** — Before: "After you die and come back, which message?" Watch for: a missing `}`. Payoff: one message on join, a different one after `/kill @s`. Ask: "what question does the if ask?"
- **07-big-words** — Phone volume up. Before: "Where on the screen will WELCOME be?" Payoff: big text and a level-up sound on join. Ask: "what does the dot do in event.player.playSound?"
- **08-clock** — Before: "200 what? How often?" Watch for: the block pasted inside another block. Payoff: *Tick* every ten seconds. Have them try 20, then 1200. Ask: "what is a tick?"
- **09-counter** — Before: "What does the third message say? What after a restart?" Watch for: `let blocks = 0` put inside the block (it always says 1). Payoff: Blocks: 1, 2, 3 as they break. Then a redeploy resets it: that is the point, not a bug.
- **10-recipe** — Before: "You write the party lines once; how many places run them?" Payoff: the same title and sound on join and on placing a block; change one word, both change. Ask: "why a function instead of pasting twice?"
- **11-scoreboard** — Before: "Where will the number appear this time?" Payoff: a *Blocks* sidebar counting per player; it survives a redeploy, unlike lesson 09. Ask: "who keeps the number, your script or the world?"
- **12-your-own-item** — Before: "Which half gives the gem its picture, and which its name?" Watch for: the comma in `item_texture.json`, the picture pasted in the wrong folder, `kid:Gem`. Payoff: `/give @s kid:gem` shows a Gem with its own picture and name. Ask for the four places `kid:gem` appears.
- **13-wand-power** — Before: "What happens if you tap with a stick instead?" Watch for: tapping on a block instead of the sky. Payoff: tap with the Wand and float for three seconds. Have them try `speed` or `night_vision`.
- **14-remember** — Before: "Five uses, then the server restarts: does the next say 1 or 6?" Watch for: *NaN* on screen (they left out `?? 0`). Payoff: *Wand uses: N* keeps counting after a redeploy. Ask: "where does the number live between restarts?"
- **15-quest** — Before: "What must be true for a broken block to count?" You type two commands with them: `/summon npc`, then `/dialogue change @e[type=npc,c=1] kid_quest` (if the NPC does not work on the phone, they type `/scriptevent kid:quest start` instead). Payoff: press the NPC's button, break ten blocks, *QUEST DONE* with a fanfare. The gate question from the learning track: "event, state, condition, effect: name each."
