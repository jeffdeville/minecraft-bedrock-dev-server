// This is your pack's code. The server reads it when it starts.
// Nothing in here runs by itself: each block waits for an event
// (something happening in the game), then does its lines.
import { world, system, DisplaySlotId } from "@minecraft/server";

let blocks = 0;

// When a player appears in the world, say something in chat.
world.afterEvents.playerSpawn
  .subscribe((event) => {
    event.player.onScreenDisplay
      .setTitle("WELCOME");
    event.player
      .playSound("random.levelup");
    if (event.initialSpawn) {
      world.sendMessage(
        "Hello, " + event.player.name);
    } else {
      world.sendMessage("Back again!");
    }
    party(event.player);
  });

world.afterEvents.playerBreakBlock
  .subscribe((event) => {
    world.sendMessage("Crunch!");
  });

system.runInterval(() => {
  world.sendMessage("Tick");
}, 200);

world.afterEvents.playerBreakBlock
  .subscribe((event) => {
    blocks = blocks + 1;
    world.sendMessage("Blocks: " + blocks);
  });

function party(player) {
  player.playSound("random.levelup");
  player.onScreenDisplay.setTitle("PARTY");
}

world.afterEvents.playerPlaceBlock
  .subscribe((event) => {
    party(event.player);
  });

world.afterEvents.playerBreakBlock
  .subscribe((event) => {
    const board = world.scoreboard;
    if (!board.getObjective("kid:blocks")) {
      board.addObjective(
        "kid:blocks", "Blocks");
    }
    const score =
      board.getObjective("kid:blocks");
    score.addScore(event.player, 1);
    board.setObjectiveAtDisplaySlot(
      DisplaySlotId.Sidebar,
      { objective: score });
  });

world.afterEvents.itemUse
  .subscribe((event) => {
    const item = event.itemStack.typeId;
    if (item === "kid:wand") {
      event.source
        .addEffect("levitation", 60);
    }
  });

world.afterEvents.itemUse
  .subscribe((event) => {
    const item = event.itemStack.typeId;
    const me = event.source;
    if (item === "kid:wand") {
      const saved =
        me.getDynamicProperty("kid:uses");
      const uses = (saved ?? 0) + 1;
      me.setDynamicProperty(
        "kid:uses", uses);
      me.onScreenDisplay
        .setActionBar("Wand uses: " + uses);
    }
  });

system.afterEvents.scriptEventReceive
  .subscribe((event) => {
    if (event.id === "kid:quest") {
      const player = event.initiator
        ?? event.sourceEntity;
      player.addTag("kid:quest");
      player.sendMessage("Quest started!");
    }
  });
