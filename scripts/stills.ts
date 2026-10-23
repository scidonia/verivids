import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { renderStill, selectComposition } from "@remotion/renderer";
import type { Timing } from "../src/spec";
import { paths, readJson, writeJson } from "./lib";
import { browserExecutable, bundleProject } from "./remotion";

const args = process.argv.slice(2);
const option = (name: string): string | undefined => {
  const index = args.indexOf(name);
  return index === -1 ? undefined : args[index + 1];
};
const onlyEpisode = option("--episode");

const timing = readJson<Timing>(paths.timing);
const episodes = timing.episodes.filter(
  (episode) => !onlyEpisode || episode.id === onlyEpisode,
);
if (episodes.length === 0) {
  console.error(`no episode matched ${JSON.stringify(onlyEpisode)}`);
  process.exit(1);
}

mkdirSync(paths.review, { recursive: true });
const serveUrl = await bundleProject();
const written: string[] = [];

for (const episode of episodes) {
  const inputProps = { episode, series: timing.series };
  const composition = await selectComposition({
    serveUrl,
    id: episode.id,
    inputProps,
    browserExecutable,
  });
  const directory = join(paths.review, episode.id);
  mkdirSync(directory, { recursive: true });

  for (const scene of episode.scenes) {
    // The scene's first frame, every cue at the instant it fires and once it
    // has settled, and the last frame before the cut.
    const localFrames = new Set<number>([0, 30, scene.durationInFrames - 1]);
    for (const cue of Object.values(scene.cues)) {
      localFrames.add(Math.min(cue, scene.durationInFrames - 1));
      localFrames.add(Math.min(cue + 12, scene.durationInFrames - 1));
    }

    for (const localFrame of [...localFrames].sort((a, b) => a - b)) {
      const frame = scene.from + localFrame;
      if (frame >= composition.durationInFrames) continue;
      const output = join(
        directory,
        `${scene.id}-f${String(frame).padStart(5, "0")}.png`,
      );
      await renderStill({
        composition,
        serveUrl,
        output,
        frame,
        imageFormat: "png",
        browserExecutable,
        chromiumOptions: { gl: "swangle" },
        inputProps,
        overwrite: true,
      });
      written.push(output);
    }
  }

  const cues = episode.scenes.reduce(
    (n, scene) => n + Object.keys(scene.cues).length,
    0,
  );
  console.log(`${episode.id}: ${episode.scenes.length} scenes, ${cues} cues`);
}

writeJson(join(paths.review, "stills.json"), { files: written });
console.log(`\n${written.length} stills in ${paths.review}`);
