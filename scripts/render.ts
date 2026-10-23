import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { renderMedia, selectComposition } from "@remotion/renderer";
import type { EpisodeTiming, Timing } from "../src/spec";
import { ffprobeDuration, paths, readJson, writeJson } from "./lib";
import { browserExecutable, bundleProject, concurrency } from "./remotion";

const args = process.argv.slice(2);
const preview = args.includes("--preview") && !args.includes("--final");
const option = (name: string): string | undefined => {
  const index = args.indexOf(name);
  return index === -1 ? undefined : args[index + 1];
};
const onlyEpisode = option("--episode");
const includeDrafts = args.includes("--include-drafts");

if (!preview && !args.includes("--final")) {
  console.error("choose --preview or --final");
  process.exit(1);
}

const timing = readJson<Timing>(paths.timing);
const episodes = timing.episodes.filter(
  (episode) =>
    (!onlyEpisode || episode.id === onlyEpisode) &&
    (includeDrafts || !episode.draft),
);
if (episodes.length === 0) {
  console.error(
    `no episode matched ${JSON.stringify(onlyEpisode)} (drafts are excluded unless --include-drafts)`,
  );
  process.exit(1);
}

const outputDir = preview ? paths.preview : paths.final;
mkdirSync(outputDir, { recursive: true });
const scale = preview ? 0.5 : 1;
const crf = preview ? 30 : 18;
const serveUrl = await bundleProject();
const started = Date.now();

const rendered: {
  episode: EpisodeTiming;
  file: string;
  seconds: number;
  expectedSeconds: number;
  audio: Record<string, string>;
}[] = [];

for (const episode of episodes) {
  const inputProps = { episode, series: timing.series };
  const composition = await selectComposition({
    serveUrl,
    id: episode.id,
    inputProps,
    browserExecutable,
  });
  const file = join(outputDir, `${episode.id}.mp4`);
  let lastReported = -1;

  await renderMedia({
    composition,
    serveUrl,
    codec: "h264",
    outputLocation: file,
    inputProps,
    crf,
    scale,
    concurrency,
    imageFormat: "png",
    browserExecutable,
    chromiumOptions: { gl: "swangle" },
    overwrite: true,
    onProgress: ({ progress }) => {
      const percent = Math.floor(progress * 100);
      if (percent >= lastReported + 10) {
        lastReported = percent;
        console.log(`${episode.id}: ${percent}%`);
      }
    },
  });

  const seconds = ffprobeDuration(file);
  const expectedSeconds = composition.durationInFrames / composition.fps;
  const audio: Record<string, string> = {};
  for (const scene of episode.scenes) {
    if (!scene.audio) continue;
    const bytes = readFileSync(join(paths.root, "public", scene.audio));
    audio[scene.id] = createHash("sha256")
      .update(bytes)
      .digest("hex")
      .slice(0, 16);
  }

  if (Math.abs(seconds - expectedSeconds) > 0.25) {
    console.error(
      `${episode.id}: rendered ${seconds.toFixed(2)}s but the composition is ${expectedSeconds.toFixed(2)}s`,
    );
    process.exit(1);
  }
  console.log(
    `${episode.id}: ${seconds.toFixed(2)}s, ${composition.durationInFrames} frames`,
  );
  rendered.push({ episode, file, seconds, expectedSeconds, audio });
}

if (!preview) {
  for (const episode of episodes) {
    const source = join(paths.captions, `${episode.id}.srt`);
    copyFileSync(source, join(paths.final, `${episode.id}.srt`));
  }
  // Reproducible when a build pins the clock, and honest about the source
  // when Nix supplies the revision of the flake it built from.
  const epoch = Number(
    process.env.SOURCE_DATE_EPOCH ?? Math.floor(Date.now() / 1000),
  );
  const revision =
    process.env.VERIVIDS_REVISION ??
    (() => {
      try {
        return execFileSync("git", ["rev-parse", "--short", "HEAD"], {
          encoding: "utf8",
        }).trim();
      } catch {
        return "unknown";
      }
    })();

  // A partial render (`--episode`) replaces its own entries and keeps the
  // rest, so rendering one film again does not erase the provenance of the
  // others. Each entry records the revision that produced it.
  const manifestPath = join(paths.final, "manifest.json");
  let previous: { episodes?: { id: string }[] } = {};
  try {
    previous = JSON.parse(readFileSync(manifestPath, "utf8")) as {
      episodes?: { id: string }[];
    };
  } catch {
    previous = {};
  }
  const entries = new Map<string, unknown>();
  for (const entry of previous.episodes ?? []) entries.set(entry.id, entry);
  for (const entry of rendered) {
    entries.set(entry.episode.id, {
      id: entry.episode.id,
      title: entry.episode.title,
      file: `${entry.episode.id}.mp4`,
      captions: `${entry.episode.id}.srt`,
      frames: entry.episode.durationInFrames,
      seconds: Number(entry.seconds.toFixed(3)),
      revision,
      audio: entry.audio,
    });
  }

  writeJson(manifestPath, {
    series: timing.series,
    fps: timing.fps,
    width: 1920,
    height: 1080,
    codec: "h264",
    crf,
    timing: "generated/timing.json",
    revision,
    generatedAt: new Date(epoch * 1000).toISOString(),
    episodes: [...entries.values()].sort((a, b) =>
      (a as { id: string }).id.localeCompare((b as { id: string }).id),
    ),
  });
}

console.log(
  `\n${rendered.length} ${preview ? "previews" : "films"} in ${outputDir} ` +
    `(${((Date.now() - started) / 1000).toFixed(0)}s)`,
);
