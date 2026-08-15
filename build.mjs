// Bundles src/<pack>/main.ts -> packs/behavior/<pack>/scripts/main.js
//
// The @minecraft/* modules are supplied by the BDS script runtime at load time,
// so they must stay external -- bundling them in would shadow the real runtime
// and the pack would fail to load.

import { build, context } from "esbuild";
import { readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const SRC = "src";
const PACKS = "packs/behavior";
const watch = process.argv.includes("--watch");

const packs = readdirSync(SRC, { withFileTypes: true })
  .filter((d) => d.isDirectory() && existsSync(join(SRC, d.name, "main.ts")))
  .map((d) => d.name);

if (packs.length === 0) {
  console.error(`No packs found. Expected ${SRC}/<name>/main.ts`);
  process.exit(1);
}

for (const name of packs) {
  if (!existsSync(join(PACKS, name, "manifest.json"))) {
    console.error(
      `src/${name}/ has no matching ${PACKS}/${name}/manifest.json -- it will ` +
        `build, but BDS will ignore it until the manifest exists.`,
    );
  }

  const options = {
    entryPoints: [join(SRC, name, "main.ts")],
    outfile: join(PACKS, name, "scripts", "main.js"),
    bundle: true,
    format: "esm",
    target: "es2022",
    external: ["@minecraft/*"],
    logLevel: "info",
  };

  if (watch) {
    const ctx = await context(options);
    await ctx.watch();
  } else {
    await build(options);
  }
}

console.log(`${watch ? "watching" : "built"} ${packs.length} pack(s): ${packs.join(", ")}`);
