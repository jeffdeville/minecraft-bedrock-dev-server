// This is your pack's code. The server reads it when it starts.
// Nothing in here runs by itself: each block waits for an event
// (something happening in the game), then does its lines.
import { world, system, DisplaySlotId } from "@minecraft/server";

// When a player appears in the world, say something in chat.
world.afterEvents.playerSpawn
  .subscribe((event) => {
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
