import { world } from "@minecraft/server";

world.afterEvents.playerSpawn.subscribe((event) => {
  world.sendMessage("Hello! Someone just arrived.");
});
