import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import YAML from "yaml";
import type { SceneSpec, Storyboard, Visual } from "../src/spec";

export const ROOT = resolve(import.meta.dirname, "..");

export const paths = {
  root: ROOT,
  storyboard: join(ROOT, "storyboard.yaml"),
  voice: join(ROOT, "voice.json"),
  generated: join(ROOT, "generated"),
  timing: join(ROOT, "generated", "timing.json"),
  voiceState: join(ROOT, "generated", "voice.json"),
  captions: join(ROOT, "generated", "captions"),
  audio: join(ROOT, "public", "audio"),
  review: join(ROOT, "out", "review"),
  final: join(ROOT, "out", "final"),
  preview: join(ROOT, "out", "preview"),
};

export interface VoiceConfig {
  provider: string;
  model: string;
  voice: string;
  speed?: number;
  instructions?: string;
  /** Provider-specific voice settings; ElevenLabs voice_settings. */
  settings?: Record<string, number | boolean>;
  pronunciation?: Record<string, string>;
}

export interface Word {
  word: string;
  start: number;
  end: number;
}

export interface VoiceClip {
  /** Hash of everything that determines the audio bytes. */
  hash: string;
  /** Repository-relative path, e.g. `audio/01-what-is-vericoding/title.mp3`. */
  file: string;
  bytes: number;
  durationSeconds: number;
  /** Word timings from forced alignment, when alignment ran. */
  words?: Word[];
  transcript?: string;
}

export interface VoiceState {
  provider: string;
  model: string;
  voice: string;
  clips: Record<string, VoiceClip>;
}

/**
 * A local, git-ignored file for the narration credential, so a key never has
 * to be exported in the shell that runs the build. Existing environment
 * variables win.
 */
export function loadLocalEnv(): void {
  const file = join(ROOT, ".env.local");
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!match) continue;
    const [, name, raw] = match;
    if (!name || process.env[name] !== undefined) continue;
    process.env[name] = (raw ?? "").replace(/^["']|["']$/g, "");
  }
}

export function readJson<T>(file: string): T {
  return JSON.parse(readFileSync(file, "utf8")) as T;
}

export function writeJson(file: string, value: unknown): void {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

export function loadStoryboard(): Storyboard {
  return YAML.parse(readFileSync(paths.storyboard, "utf8")) as Storyboard;
}

export function loadVoice(): VoiceConfig {
  return readJson<VoiceConfig>(paths.voice);
}

export function sceneKey(episodeId: string, sceneId: string): string {
  return `${episodeId}/${sceneId}`;
}

export function sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex").slice(0, 16);
}

/** Whole-word pronunciation substitutions, applied to spoken text only. */
export function applyPronunciation(text: string, config: VoiceConfig): string {
  let out = text;
  for (const [from, to] of Object.entries(config.pronunciation ?? {})) {
    const escaped = from.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    out = out.replace(
      new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, "gu"),
      to,
    );
  }
  return out;
}

export function spokenText(scene: SceneSpec, config: VoiceConfig): string {
  const text = scene.spoken ?? scene.narration;
  return applyPronunciation(text, config);
}

/**
 * Everything that changes the produced audio. Regenerating is only correct
 * when this value changes; a visual edit must reuse the accepted clip.
 */
export function voiceCacheKey(scene: SceneSpec, config: VoiceConfig): string {
  return sha256(
    JSON.stringify({
      provider: config.provider,
      model: config.model,
      voice: config.voice,
      speed: config.speed ?? 1,
      instructions: config.instructions ?? "",
      settings: config.settings ?? {},
      text: spokenText(scene, config),
    }),
  );
}

export function ffprobeDuration(file: string): number {
  const out = execFileSync(
    "ffprobe",
    ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file],
    { encoding: "utf8" },
  ).trim();
  const value = Number.parseFloat(out);
  if (!Number.isFinite(value)) {
    throw new Error(
      `ffprobe could not read a duration from ${file}: ${JSON.stringify(out)}`,
    );
  }
  return value;
}

/** Every cue name a visual refers to. */
export function visualCueRefs(visual: Visual): string[] {
  const refs: string[] = [];
  const walk = (value: unknown): void => {
    if (Array.isArray(value)) {
      value.forEach(walk);
      return;
    }
    if (value && typeof value === "object") {
      for (const [key, child] of Object.entries(value)) {
        if (
          (key === "cue" || key.endsWith("Cue")) &&
          typeof child === "string"
        ) {
          refs.push(child);
        } else {
          walk(child);
        }
      }
    }
  };
  walk(visual);
  return refs;
}

export function ensureDirs(): void {
  for (const dir of [
    paths.generated,
    paths.captions,
    paths.audio,
    paths.review,
    paths.preview,
    paths.final,
  ]) {
    mkdirSync(dir, { recursive: true });
  }
}

export function requireFile(file: string): void {
  if (!existsSync(file)) throw new Error(`missing file: ${file}`);
}

export function relative(file: string): string {
  return file.startsWith(ROOT) ? file.slice(ROOT.length + 1) : file;
}

const NUMBER_WORDS: Record<string, string> = {
  "0": "zero",
  "1": "one",
  "2": "two",
  "3": "three",
  "4": "four",
  "5": "five",
  "6": "six",
  "7": "seven",
  "8": "eight",
  "9": "nine",
  "10": "ten",
  "11": "eleven",
  "12": "twelve",
  "13": "thirteen",
  "14": "fourteen",
  "15": "fifteen",
  "16": "sixteen",
  "17": "seventeen",
  "18": "eighteen",
  "19": "nineteen",
  "20": "twenty",
  "21": "twentyone",
  "22": "twentytwo",
  "23": "twentythree",
  "24": "twentyfour",
  "25": "twentyfive",
  "26": "twentysix",
  "27": "twentyseven",
  "28": "twentyeight",
  "29": "twentynine",
  "30": "thirty",
  "40": "forty",
  "50": "fifty",
  "60": "sixty",
  "70": "seventy",
  "80": "eighty",
  "90": "ninety",
  "100": "hundred",
};

/**
 * Words as a transcript or a phrase would normalise them: lower case, no
 * punctuation, digits written out, so "27" and "twenty-seven" agree.
 */
/**
 * Whisper emits American spellings for British speech, so the narration's
 * "programme" and the transcript's "program" must compare equal.
 */
const SPELLINGS: Record<string, string> = {
  programme: "program",
  programmes: "programs",
  behaviour: "behavior",
  behaviours: "behaviors",
  optimise: "optimize",
  optimises: "optimizes",
  optimisation: "optimization",
  artefact: "artifact",
  artefacts: "artifacts",
  colour: "color",
  centre: "center",
  organisation: "organization",
  recognise: "recognize",
  analyse: "analyze",
  licence: "license",
  defence: "defense",
  labelled: "labeled",
  modelling: "modeling",
};

export function normalizeWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[’']/g, "")
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
    .flatMap((word) => {
      const digits = NUMBER_WORDS[word];
      if (digits) return [digits];
      // "twenty-seven" splits into two tokens; join the tens and units.
      return [word];
    })
    .map((word) => word.replace(/[^a-z0-9]/g, ""))
    .map((word) => SPELLINGS[word] ?? word);
}

/** Join tens and units so "twenty seven" and "twentyseven" compare equal. */
function collapseNumberPairs(words: string[]): string[] {
  const out: string[] = [];
  for (const word of words) {
    const previous = out[out.length - 1];
    if (
      previous &&
      /^(twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)$/.test(
        previous,
      ) &&
      /^(one|two|three|four|five|six|seven|eight|nine)$/.test(word)
    ) {
      out[out.length - 1] = previous + word;
    } else {
      out.push(word);
    }
  }
  return out;
}

export function matchWords(text: string): string[] {
  return collapseNumberPairs(normalizeWords(text));
}

/** At most one insertion, deletion or substitution. */
function withinOneEdit(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i += 1;
      j += 1;
      continue;
    }
    edits += 1;
    if (edits > 1) return false;
    if (a.length > b.length) i += 1;
    else if (b.length > a.length) j += 1;
    else {
      i += 1;
      j += 1;
    }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

function trimPlural(word: string): string {
  return word.length > 3 && word.endsWith("s") && !word.endsWith("ss")
    ? word.slice(0, -1)
    : word;
}

/**
 * A transcript mangles an inflection now and then — "tests" as "test",
 * "changed" as "change". A phrase match tolerates one edit on a word of four
 * characters or more, which keeps a mispronunciation detectable while not
 * failing on the transcriber's grammar.
 */
function sameWord(a: string, b: string): boolean {
  if (a === b) return true;
  if (trimPlural(a) === trimPlural(b)) return true;
  return a.length >= 4 && b.length >= 4 && withinOneEdit(a, b);
}

/**
 * Locate `phrase` in `words`, requiring exactly one match. Returns the index
 * of the phrase's first word.
 */
export function uniqueMatch(
  needle: string,
  haystack: { word: string }[],
): { index: number } | { error: string } {
  const target = matchWords(needle);
  if (target.length === 0) return { error: "phrase has no words" };
  const matches: number[] = [];
  for (let i = 0; i + target.length <= haystack.length; i += 1) {
    let ok = true;
    for (let j = 0; j < target.length; j += 1) {
      if (!sameWord(matchWords(haystack[i + j]!.word)[0] ?? "", target[j]!)) {
        ok = false;
        break;
      }
    }
    if (ok) matches.push(i);
  }
  if (matches.length === 0) {
    return {
      error: `no match for ${JSON.stringify(needle)} in the transcript`,
    };
  }
  if (matches.length > 1) {
    return {
      error: `${matches.length} matches for ${JSON.stringify(needle)} (word ${matches.join(", ")}); make the phrase longer or use at:`,
    };
  }
  return { index: matches[0]! };
}

export function fmtSeconds(value: number): string {
  return `${value.toFixed(2)}s`;
}
