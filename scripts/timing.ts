import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { SceneSpec, SceneTiming, Storyboard, Timing } from "../src/spec";
import {
  ensureDirs,
  loadStoryboard,
  paths,
  readJson,
  sceneKey,
  uniqueMatch,
  writeJson,
  type VoiceClip,
  type VoiceState,
} from "./lib";

const storyboard: Storyboard = loadStoryboard();
const { fps } = storyboard;
const voice: VoiceState = existsSync(paths.voiceState)
  ? readJson<VoiceState>(paths.voiceState)
  : { provider: "none", model: "none", voice: "none", clips: {} };

const errors: string[] = [];
const resolution: string[] = [];

interface Caption {
  text: string;
  start: number;
  end: number;
}

interface ResolvedScene {
  timing: SceneTiming;
  audioSeconds: number;
  captions: Caption[];
}

function sentences(text: string): string[] {
  const parts = text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+(?=[A-Z“"'])/)
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts : [text.trim()];
}

function resolveScene(
  episodeId: string,
  scene: SceneSpec,
  startFrame: number,
): ResolvedScene | null {
  const where = `${episodeId}/${scene.id}`;
  let audioSeconds: number;
  let clip: VoiceClip | undefined;

  if (scene.silent) {
    audioSeconds = scene.seconds ?? 0;
    if (audioSeconds <= 0) {
      errors.push(`${where}: a silent scene needs a positive seconds:`);
      return null;
    }
  } else {
    clip = voice.clips[sceneKey(episodeId, scene.id)];
    if (!clip) {
      errors.push(
        `${where}: no narration; run \`npm run voice -- --episode ${episodeId}\``,
      );
      return null;
    }
    if (!existsSync(join(paths.root, "public", clip.file))) {
      errors.push(`${where}: recorded clip is missing at public/${clip.file}`);
      return null;
    }
    audioSeconds = clip.durationSeconds;
  }

  const cueFrames: Record<string, number> = {};
  const cueSeconds: Record<string, number> = {};

  for (const [name, declaration] of Object.entries(scene.cues ?? {})) {
    const phrase =
      typeof declaration === "string" ? declaration : declaration.phrase;
    const override =
      typeof declaration === "string" ? undefined : declaration.at;

    if (override !== undefined) {
      cueSeconds[name] = override;
      resolution.push(
        `${where}.${name}: at ${override.toFixed(2)}s (explicit)`,
      );
      continue;
    }
    if (!phrase) {
      errors.push(`${where}.${name}: needs a phrase or an at: override`);
      continue;
    }
    if (!clip || !clip.words || clip.words.length === 0) {
      errors.push(
        `${where}.${name}: this clip has no word alignment; rerun \`npm run voice -- --episode ${episodeId} --force\`, or set at:`,
      );
      continue;
    }
    const located = uniqueMatch(phrase, clip.words);
    if ("error" in located) {
      errors.push(
        `${where}.${name}: ${located.error}. Heard: ${JSON.stringify((clip.transcript ?? "").slice(0, 240))}`,
      );
      continue;
    }
    const word = clip.words[located.index]!;
    // Land just before the word begins, so the reveal has settled by the time
    // the viewer hears it.
    cueSeconds[name] = Math.max(0, word.start - 0.12);
    resolution.push(`${where}.${name}: ${word.start.toFixed(2)}s (aligned)`);
  }

  for (const [name, seconds] of Object.entries(cueSeconds)) {
    if (seconds > audioSeconds) {
      errors.push(
        `${where}.${name}: cue at ${seconds.toFixed(2)}s is past the end of the ${audioSeconds.toFixed(2)}s clip`,
      );
    }
    cueFrames[name] = Math.round(seconds * fps);
  }

  const tailHold = scene.tailHold ?? 1;
  const durationInFrames = Math.ceil((audioSeconds + tailHold) * fps);
  for (const [name, frame] of Object.entries(cueFrames)) {
    if (frame + 8 > durationInFrames) {
      errors.push(
        `${where}.${name}: cue lands at frame ${frame} of ${durationInFrames}; increase tailHold`,
      );
    }
  }

  const sceneSentences = scene.silent ? [] : sentences(scene.narration);
  const characters = sceneSentences.reduce((n, line) => n + line.length, 0);
  let elapsed = 0;
  const captions = sceneSentences.map((text) => {
    const start = startFrame / fps + elapsed;
    elapsed += (text.length / Math.max(1, characters)) * audioSeconds;
    return { text, start, end: startFrame / fps + elapsed };
  });

  return {
    timing: {
      id: scene.id,
      from: startFrame,
      durationInFrames,
      audio: scene.silent ? null : `audio/${episodeId}/${scene.id}.mp3`,
      cues: cueFrames,
      visual: scene.visual,
      narration: scene.narration,
    },
    audioSeconds,
    captions,
  };
}

function srtTime(seconds: number): string {
  const total = Math.round(seconds * 1000);
  const h = Math.floor(total / 3_600_000);
  const m = Math.floor((total % 3_600_000) / 60_000);
  const s = Math.floor((total % 60_000) / 1000);
  const ms = total % 1000;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")},${String(ms).padStart(3, "0")}`;
}

function wrap(text: string, width = 42): string {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    if (line.length > 0 && `${line} ${word}`.length > width) {
      lines.push(line);
      line = word;
    } else {
      line = line.length === 0 ? word : `${line} ${word}`;
    }
  }
  if (line) lines.push(line);
  return lines.join("\n");
}

ensureDirs();

const timing: Timing = {
  fps,
  series: storyboard.series,
  subtitle: storyboard.subtitle,
  generatedFrom: {
    storyboard: "storyboard.yaml",
    voice: "generated/voice.json",
  },
  episodes: [],
};
const captionsByEpisode = new Map<string, Caption[]>();

for (const episode of storyboard.episodes) {
  if (episode.draft) {
    console.log(`skipping draft episode ${episode.id}`);
    continue;
  }
  let cursor = 0;
  const scenes: SceneTiming[] = [];
  const captions: Caption[] = [];

  for (const scene of episode.scenes) {
    const resolved = resolveScene(episode.id, scene, cursor);
    if (!resolved) {
      cursor += Math.ceil(((scene.seconds ?? 3) + (scene.tailHold ?? 1)) * fps);
      continue;
    }
    scenes.push(resolved.timing);
    captions.push(...resolved.captions);
    cursor += resolved.timing.durationInFrames;
  }

  timing.episodes.push({
    id: episode.id,
    title: episode.title,
    durationInFrames: cursor,
    scenes,
  });
  captionsByEpisode.set(episode.id, captions);
}

if (errors.length > 0) {
  console.error(
    `timing failed with ${errors.length} error${errors.length === 1 ? "" : "s"}:`,
  );
  for (const error of errors) console.error(`  ${error}`);
  process.exit(1);
}

writeJson(paths.timing, timing);
mkdirSync(paths.captions, { recursive: true });
for (const [episodeId, captions] of captionsByEpisode) {
  const entries = captions.map(
    (caption, index) =>
      `${index + 1}\n${srtTime(caption.start)} --> ${srtTime(caption.end)}\n${wrap(caption.text)}\n`,
  );
  writeFileSync(
    join(paths.captions, `${episodeId}.srt`),
    `${entries.join("\n")}\n`,
  );
}

for (const line of resolution) console.log(line);
const totalFrames = timing.episodes.reduce(
  (n, episode) => n + episode.durationInFrames,
  0,
);
console.log(
  `\ntiming.json: ${timing.episodes.length} episodes, ${totalFrames} frames (${(totalFrames / fps / 60).toFixed(1)} min)`,
);
