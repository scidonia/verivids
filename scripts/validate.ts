import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { SceneSpec, Storyboard, Visual } from "../src/spec";
import {
  loadStoryboard,
  loadVoice,
  matchWords,
  paths,
  requireFile,
  uniqueMatch,
  visualCueRefs,
} from "./lib";

const KNOWN_KINDS = [
  "title",
  "closing",
  "claim",
  "quantify",
  "converge",
  "compare",
  "cards",
  "table",
  "pipeline",
  "code",
  "staircase",
  "stack",
] as const;

const ALLOWED_KEYS: Record<string, string[]> = {
  title: ["kind", "kicker", "title", "subtitle", "subtitleCue"],
  closing: ["kind", "text", "next", "cue"],
  claim: ["kind", "eyebrow", "heading", "points", "emphasis"],
  quantify: ["kind", "heading", "left", "right", "conclusion"],
  converge: ["kind", "heading", "items", "result"],
  compare: [
    "kind",
    "heading",
    "left",
    "right",
    "leftCue",
    "rightCue",
    "note",
    "noteCue",
  ],
  cards: ["kind", "heading", "cards", "note", "noteCue"],
  table: ["kind", "heading", "columns", "rows"],
  pipeline: [
    "kind",
    "heading",
    "stages",
    "verdict",
    "note",
    "noteCue",
    "afterword",
    "afterwordCue",
  ],
  code: ["kind", "heading", "language", "code", "reveal", "goals", "caption"],
  staircase: [
    "kind",
    "heading",
    "levels",
    "levelsCue",
    "optimiseCue",
    "lowerCue",
    "refineCue",
    "proposed",
  ],
  stack: ["kind", "heading", "layers", "bottom", "note", "noteCue"],
};

const errors: string[] = [];
const warnings: string[] = [];

function fail(where: string, message: string): void {
  errors.push(`${where}: ${message}`);
}

function checkKeys(value: unknown, allowed: string[], where: string): void {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail(where, "expected a mapping");
    return;
  }
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) {
      fail(
        where,
        `unknown field ${JSON.stringify(key)} (allowed: ${allowed.join(", ")})`,
      );
    }
  }
}

function checkNonEmptyString(value: unknown, where: string): void {
  if (typeof value !== "string" || value.trim() === "") {
    fail(where, "expected a non-empty string");
  }
}

function checkVisual(scene: SceneSpec, where: string): void {
  const visual = scene.visual as Visual;
  if (!visual || typeof visual !== "object") {
    fail(where, "missing visual");
    return;
  }
  const kind = visual.kind;
  if (!KNOWN_KINDS.includes(kind as (typeof KNOWN_KINDS)[number])) {
    fail(where, `unknown visual kind ${JSON.stringify(kind)}`);
    return;
  }
  checkKeys(visual, ALLOWED_KEYS[kind]!, `${where}.visual`);
  const primaryText =
    "heading" in visual
      ? visual.heading
      : "title" in visual
        ? visual.title
        : visual.text;
  checkNonEmptyString(primaryText, `${where}.visual heading`);

  if (visual.kind === "title") {
    checkNonEmptyString(visual.title, `${where}.title`);
  }
  if (visual.kind === "closing") {
    checkNonEmptyString(visual.text, `${where}.text`);
  }
  if (visual.kind === "code") {
    if (!["lean", "python", "text"].includes(visual.language)) {
      fail(
        `${where}.language`,
        `unknown language ${JSON.stringify(visual.language)}`,
      );
    }
    checkNonEmptyString(visual.code, `${where}.code`);
    const lineCount = visual.code.replace(/\n$/, "").split("\n").length;
    for (const [i, reveal] of (visual.reveal ?? []).entries()) {
      const [start, end] = reveal.lines;
      if (!(start >= 1 && end >= start && end <= lineCount)) {
        fail(
          `${where}.reveal[${i}]`,
          `lines ${start}..${end} outside 1..${lineCount}`,
        );
      }
    }
  }
  if (
    visual.kind === "table" &&
    (!Array.isArray(visual.columns) || visual.columns.length !== 2)
  ) {
    fail(`${where}.columns`, "expected exactly two column headings");
  }
  if (
    visual.kind === "staircase" &&
    (!Array.isArray(visual.levels) || visual.levels.length < 2)
  ) {
    fail(`${where}.levels`, "a staircase needs at least two levels");
  }

  // Every cue the visual names must be declared, and every declared cue used.
  const refs = new Set(visualCueRefs(visual));
  const declared = new Set(Object.keys(scene.cues ?? {}));
  for (const ref of refs) {
    if (!declared.has(ref)) {
      fail(where, `visual refers to undeclared cue ${JSON.stringify(ref)}`);
    }
  }
  for (const name of declared) {
    if (!refs.has(name)) {
      fail(
        where,
        `cue ${JSON.stringify(name)} is declared but the visual never uses it`,
      );
    }
  }
}

function checkCues(scene: SceneSpec, where: string): void {
  const narrationWords = matchWords(scene.narration);
  for (const [name, declaration] of Object.entries(scene.cues ?? {})) {
    const phrase =
      typeof declaration === "string" ? declaration : declaration.phrase;
    const at = typeof declaration === "string" ? undefined : declaration.at;
    if (phrase === undefined && at === undefined) {
      fail(`${where}.cues.${name}`, "needs a phrase or an at: override");
      continue;
    }
    if (at !== undefined && !(Number.isFinite(at) && at >= 0)) {
      fail(
        `${where}.cues.${name}`,
        `at must be a non-negative number, got ${String(at)}`,
      );
    }
    if (phrase !== undefined) {
      if (!scene.narration.toLowerCase().includes(phrase.toLowerCase())) {
        fail(
          `${where}.cues.${name}`,
          `phrase is not a substring of the narration: ${JSON.stringify(phrase)}`,
        );
        continue;
      }
      const located = uniqueMatch(
        phrase,
        narrationWords.map((word) => ({ word })),
      );
      if ("error" in located) {
        fail(`${where}.cues.${name}`, located.error);
      }
    }
  }
}

function checkLean(code: string, where: string): void {
  const dir = mkdtempSync(join(tmpdir(), "verivids-"));
  const file = join(dir, "Snippet.lean");
  writeFileSync(file, code.endsWith("\n") ? code : `${code}\n`);
  try {
    const out = execFileSync("lean", [file], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    const text = out.trim();
    if (text)
      warnings.push(
        `${where}: lean reported: ${text.split("\n").slice(0, 4).join(" | ")}`,
      );
  } catch (error) {
    const err = error as { stdout?: string; stderr?: string; message?: string };
    const detail =
      `${err.stdout ?? ""}${err.stderr ?? ""}`.trim() ||
      err.message ||
      "lean failed";
    fail(where, `lean rejected the snippet:\n${detail}`);
  }
}

function checkPython(code: string, where: string): void {
  try {
    execFileSync("python3", ["-c", code], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    const err = error as { stdout?: string; stderr?: string };
    fail(
      where,
      `python3 rejected the snippet:\n${`${err.stdout ?? ""}${err.stderr ?? ""}`.trim()}`,
    );
  }
}

const storyboard: Storyboard = loadStoryboard();
const voice = loadVoice();

if (!Number.isInteger(storyboard.fps) || storyboard.fps <= 0) {
  fail("storyboard.fps", "expected a positive integer");
}
if (!Array.isArray(storyboard.episodes) || storyboard.episodes.length === 0) {
  fail("storyboard.episodes", "expected at least one episode");
}

if (!["openai", "elevenlabs", "none"].includes(voice.provider)) {
  fail(
    "voice.json.provider",
    `unknown provider ${JSON.stringify(voice.provider)}; supported: openai, elevenlabs, none`,
  );
}
if (voice.provider === "elevenlabs" && !voice.voice) {
  fail(
    "voice.json.voice",
    "an ElevenLabs voice id or library voice name is required",
  );
}

const episodeIds = new Set<string>();
for (const episode of storyboard.episodes) {
  const where = episode.id;
  if (episodeIds.has(episode.id)) fail(where, "duplicate episode id");
  episodeIds.add(episode.id);
  if (!/^[a-z0-9][a-z0-9-]*$/.test(episode.id)) {
    fail(where, "episode id must be lower-case words joined by hyphens");
  }
  if (episode.scenes.length === 0) fail(where, "episode has no scenes");

  const sceneIds = new Set<string>();
  for (const scene of episode.scenes) {
    const sceneWhere = `${episode.id}/${scene.id}`;
    if (sceneIds.has(scene.id)) fail(sceneWhere, "duplicate scene id");
    sceneIds.add(scene.id);
    if (!/^[a-z0-9][a-z0-9-]*$/.test(scene.id)) {
      fail(sceneWhere, "scene id must be lower-case words joined by hyphens");
    }
    if (
      !scene.silent &&
      (typeof scene.narration !== "string" || scene.narration.trim() === "")
    ) {
      fail(
        sceneWhere,
        "narration is empty; set silent: true with seconds: for a silent scene",
      );
    }
    if (scene.silent && typeof scene.seconds !== "number") {
      fail(sceneWhere, "silent scenes need seconds:");
    }
    if (scene.tailHold !== undefined && !(scene.tailHold >= 0)) {
      fail(sceneWhere, "tailHold must be a non-negative number of seconds");
    }
    checkVisual(scene, sceneWhere);
    checkCues(scene, sceneWhere);
    if (scene.visual.kind === "code") {
      if (scene.visual.language === "lean")
        checkLean(scene.visual.code, `${sceneWhere}.code`);
      if (scene.visual.language === "python")
        checkPython(scene.visual.code, `${sceneWhere}.code`);
    }
  }
}

for (const file of [paths.storyboard, paths.voice]) requireFile(file);
readFileSync(paths.storyboard, "utf8");

for (const warning of warnings) console.warn(`warning: ${warning}`);
if (errors.length > 0) {
  console.error(
    `validation failed with ${errors.length} error${errors.length === 1 ? "" : "s"}:`,
  );
  for (const error of errors) console.error(`  ${error}`);
  process.exit(1);
}

const sceneCount = storyboard.episodes.reduce(
  (n, episode) => n + episode.scenes.length,
  0,
);
const cueCount = storyboard.episodes.reduce(
  (n, episode) =>
    n +
    episode.scenes.reduce(
      (m, scene) => m + Object.keys(scene.cues ?? {}).length,
      0,
    ),
  0,
);
console.log(
  `validated ${storyboard.episodes.length} episodes, ${sceneCount} scenes, ${cueCount} cues`,
);
