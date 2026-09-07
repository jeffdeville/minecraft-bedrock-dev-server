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
