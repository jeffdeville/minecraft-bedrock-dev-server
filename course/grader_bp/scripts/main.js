// The course grader. The platform sends `scriptevent course:check <id>`
// to the server console; this pack inspects the world and prints one line:
//
//   [course] PASS <id>
//   [course] FAIL <id>: <what is wrong, for the learner>
//
// console.warn is the only console call BDS forwards, and only when
// content-log-console-output-enabled is true on the server.
//
// Checks are keyed by the id a lesson's `game` check names (course/FORMAT.md,
// docs/2026-09-07-course-design.md section 7). A check returns null to pass
// or a sentence for the learner to fail. Everything read here is shared world
// state (players, inventories, scoreboards, tags): a dynamic property set by
// the learner's pack is keyed to that pack and invisible from this one.
import { world, system, DisplaySlotId, ItemTypes } from "@minecraft/server";

const NOBODY = "I do not see you in the world yet; tap your server in the Servers tab and join";

function players() {
  return world.getAllPlayers();
}

function holds(player, typeId) {
  const inv = player.getComponent("inventory");
  const container = inv && inv.container;
  if (!container) return false;
  for (let i = 0; i < container.size; i++) {
    const item = container.getItem(i);
    if (item && item.typeId === typeId) return true;
  }
  return false;
}

const checks = {
  "00-joined": () => (players().length > 0 ? null : NOBODY),

  "00-wand": () => {
    if (players().length === 0) return NOBODY;
    for (const p of players()) {
      if (holds(p, "kid:wand")) return null;
    }
    return "nobody has a Wand yet; open chat, type /give @s kid:wand, then tap the Wand in your hotbar";
  },

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
    if (!ItemTypes.get("kid:gem")) {
      return "the game does not know an item called kid:gem; check items/gem.json and the deploy";
    }
    return null;
  },

  "15-quest": () => {
    if (players().length === 0) return NOBODY;
    let started = false;
    for (const p of players()) {
      if (p.hasTag("kid:quest_done")) return null;
      if (p.hasTag("kid:quest")) started = true;
    }
    if (started) return "the quest is started but not finished: break more blocks, then check again";
    return "nobody has started the quest: tap the NPC and press the button";
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
