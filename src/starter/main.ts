import { world, system } from "@minecraft/server";

// Anything you print with console.warn shows up in the web log viewer.
// console.log is swallowed by BDS unless content logging is on, so prefer warn.
console.warn("[starter] script loaded");

// Say hello when someone joins.
world.afterEvents.playerSpawn.subscribe((event) => {
  if (!event.initialSpawn) return;
  event.player.sendMessage("§aStarter pack is loaded. Go build something.");
  console.warn(`[starter] ${event.player.name} joined`);
});

// Try it in game: punch any block while holding a stick.
world.afterEvents.playerBreakBlock.subscribe((event) => {
  const { player, brokenBlockPermutation } = event;
  console.warn(`[starter] ${player.name} broke ${brokenBlockPermutation.type.id}`);
});

// system.runInterval is the Script API's timer. 20 ticks = 1 second.
let ticks = 0;
system.runInterval(() => {
  ticks += 1;
  if (ticks % 60 === 0) {
    console.warn(`[starter] alive for ${ticks} minutes`);
  }
}, 20 * 60);
