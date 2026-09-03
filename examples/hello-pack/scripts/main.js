// Plain JavaScript, no build step: this is what a finished pack looks like.
// Your real add-on project (Creator Tools, Regolith, esbuild, whatever) should
// emit something shaped like this directory, or a .mcpack/.mcaddon of it.
//
// console.warn reaches the server log and the web console; console.log is
// dropped by BDS unless content logging is on.
import { world } from "@minecraft/server";

console.warn("[hello-pack] loaded");

world.afterEvents.playerSpawn.subscribe((event) => {
  if (!event.initialSpawn) return;
  event.player.sendMessage("§ahello-pack is live. The deploy loop works.");
  console.warn(`[hello-pack] ${event.player.name} joined`);
});
