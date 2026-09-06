// The course grader. The platform sends `scriptevent course:check <lesson-id>`
// to the server console; this pack inspects the world and prints one line:
//
//   [course] PASS <lesson-id>
//   [course] FAIL <lesson-id>: <what is wrong, for the learner>
//
// console.warn is the only console call BDS forwards, and only when
// content-log-console-output-enabled is true on the server.
//
// Checks are keyed by lesson id (course/FORMAT.md). A check returns null to
// pass or a sentence for the learner to fail. Lessons whose payoff is only
// "the deploy listed the pack" use a `deploy` check instead and never come
// here.
import { world, system, DisplaySlotId, ItemTypes } from "@minecraft/server";

const checks = {
  "11-scoreboard": () => {
    const objective = world.scoreboard.getObjective("kid:blocks");
    if (!objective) return "there is no scoreboard objective called kid:blocks yet";
    const shown = world.scoreboard.getObjectiveAtDisplaySlot(DisplaySlotId.Sidebar);
    if (!shown || shown.objective.id !== "kid:blocks") {
      return "kid:blocks exists but it is not on the sidebar";
    }
    return null;
  },

  "12-item": () => {
    if (!ItemTypes.get("kid:wand")) {
      return "the game does not know an item called kid:wand; check items/wand.json and the deploy";
    }
    return null;
  },

  "14-persist": () => {
    const players = world.getAllPlayers();
    if (players.length === 0) return "join the game first, then run the check again";
    for (const player of players) {
      if (typeof player.getDynamicProperty("kid:uses") === "number") return null;
    }
    return "no player has a number saved as kid:uses yet; use the wand once, then check again";
  },

  "15-quest": () => {
    const players = world.getAllPlayers();
    if (players.length === 0) return "join the game first, then run the check again";
    for (const player of players) {
      if (player.getDynamicProperty("kid:quest") === "done") return null;
    }
    return "nobody has finished the quest yet (the script should save kid:quest as \"done\" when it is)";
  },
};

system.afterEvents.scriptEventReceive.subscribe((event) => {
  if (event.id === "course:ping") {
    console.warn("[course] PASS ping");
    return;
  }
  if (event.id !== "course:check") return;
  const id = event.message.trim();
  const check = checks[id];
  if (!check) {
    console.warn(`[course] FAIL ${id}: the grader has no check for this lesson`);
    return;
  }
  let problem;
  try {
    problem = check();
  } catch (e) {
    problem = `the check crashed: ${e}`;
  }
  console.warn(problem ? `[course] FAIL ${id}: ${problem}` : `[course] PASS ${id}`);
});

console.warn("[course] grader loaded");
