import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import type { SceneSpec, Storyboard } from "../src/spec";
import {
  ensureDirs,
  ffprobeDuration,
  loadLocalEnv,
  loadStoryboard,
  loadVoice,
  paths,
  readJson,
  sceneKey,
  spokenText,
  relative,
  voiceCacheKey,
  type VoiceClip,
  type VoiceState,
  writeJson,
  type VoiceConfig,
  type Word,
} from "./lib";

const args = process.argv.slice(2);
const flag = (name: string): boolean => args.includes(name);
const option = (name: string): string | undefined => {
  const index = args.indexOf(name);
  return index === -1 ? undefined : args[index + 1];
};

const force = flag("--force");
const audition = flag("--audition");
const listVoices = flag("--list-voices");
const skipAlignment = flag("--no-align");
const onlyEpisode = option("--episode");
const onlyScene = option("--scene");

loadLocalEnv();
const config = loadVoice();
const storyboard: Storyboard = loadStoryboard();

type Provider = "openai" | "elevenlabs";

const KEY_VARIABLE: Record<Provider, string> = {
  openai: "OPENAI_API_KEY",
  elevenlabs: "ELEVENLABS_API_KEY",
};

function apiKey(provider: Provider): string {
  const name = KEY_VARIABLE[provider];
  const key = process.env[name];
  if (!key) {
    throw new Error(
      `${name} is not set. Narration is a network step; the render itself is not.`,
    );
  }
  return key;
}

function provider(): Provider {
  if (config.provider !== "openai" && config.provider !== "elevenlabs") {
    throw new Error(
      `unknown voice provider ${JSON.stringify(config.provider)}`,
    );
  }
  return config.provider;
}

async function request(
  url: string,
  init: RequestInit,
  providerName: Provider,
): Promise<Response> {
  let lastError = "";
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const response = await fetch(url, init);
    if (response.ok) return response;
    lastError = `${response.status} ${response.statusText}: ${(await response.text()).slice(0, 400)}`;
    if (response.status !== 429 && response.status < 500) break;
    await sleep(attempt * 1500);
  }
  throw new Error(`${providerName} request to ${url} failed: ${lastError}`);
}

interface ElevenVoice {
  voice_id: string;
  name: string;
  labels?: Record<string, string>;
}

async function listElevenVoices(): Promise<ElevenVoice[]> {
  let response: Response;
  try {
    response = await request(
      "https://api.elevenlabs.io/v1/voices",
      { headers: { "xi-api-key": apiKey("elevenlabs") } },
      "elevenlabs",
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("voices_read")) {
      throw new Error(
        `${message}\nThe key needs the "Voices: Read" permission. Either grant it, or put the voice id from the ElevenLabs UI straight into voice.json (an id needs no listing).`,
      );
    }
    throw error;
  }
  const payload = (await response.json()) as { voices?: ElevenVoice[] };
  return payload.voices ?? [];
}

/**
 * A voice is either an id or a name from the account's voice library. A name
 * is resolved here rather than baked in, so a library voice can be swapped
 * without editing 37 scenes.
 */
async function resolveElevenVoice(nameOrId: string): Promise<string> {
  if (nameOrId === "") {
    throw new Error(
      "voice.json needs a voice: an ElevenLabs voice id, or a name from the account's voice library. `npm run voice -- --list-voices` prints both.",
    );
  }
  if (/^[A-Za-z0-9]{15,}$/.test(nameOrId)) return nameOrId;

  const voices = await listElevenVoices();
  const wanted = nameOrId.toLowerCase();
  const exact = voices.filter((voice) => voice.name.toLowerCase() === wanted);
  const partial = voices.filter((voice) =>
    voice.name.toLowerCase().includes(wanted),
  );
  const matches = exact.length > 0 ? exact : partial;
  if (matches.length === 1) return matches[0]!.voice_id;
  if (matches.length === 0) {
    throw new Error(
      `no voice matching ${JSON.stringify(nameOrId)}; available: ` +
        voices.map((voice) => voice.name).join(", "),
    );
  }
  throw new Error(
    `${matches.length} voices match ${JSON.stringify(nameOrId)}: ` +
      matches.map((voice) => `${voice.name} (${voice.voice_id})`).join(", "),
  );
}

async function synthesize(text: string, voice: string): Promise<Buffer> {
  const providerName = provider();

  if (providerName === "openai") {
    const response = await request(
      "https://api.openai.com/v1/audio/speech",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey("openai")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: config.model,
          voice,
          input: text,
          instructions: config.instructions,
          speed: config.speed ?? 1,
          response_format: "mp3",
        }),
      },
      "openai",
    );
    return Buffer.from(await response.arrayBuffer());
  }

  const voiceId = await resolveElevenVoice(voice);
  const response = await request(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey("elevenlabs"),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        model_id: config.model,
        voice_settings: config.settings,
      }),
    },
    "elevenlabs",
  );
  return Buffer.from(await response.arrayBuffer());
}

/**
 * Forced alignment against the audio we actually produced. This is what turns
 * a spoken phrase into a frame number, and it also catches a mispronounced
 * word: a phrase the transcript does not contain cannot be placed.
 */
async function align(
  file: string,
): Promise<{ words: Word[]; transcript: string }> {
  const bytes = new Uint8Array(readFileSync(file));
  const form = new FormData();
  form.append(
    "file",
    new Blob([bytes], { type: "audio/mpeg" }),
    "narration.mp3",
  );
  form.append("model", "whisper-1");
  form.append("response_format", "verbose_json");
  form.append("timestamp_granularities[]", "word");
  const response = await request(
    "https://api.openai.com/v1/audio/transcriptions",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey("openai")}` },
      body: form,
    },
    "openai",
  );
  const payload = (await response.json()) as {
    text?: string;
    words?: { word: string; start: number; end: number }[];
  };
  return {
    words: (payload.words ?? []).map((word) => ({
      word: word.word,
      start: word.start,
      end: word.end,
    })),
    transcript: payload.text ?? "",
  };
}

function sceneFile(episodeId: string, sceneId: string): string {
  return join(paths.audio, episodeId, `${sceneId}.mp3`);
}

function publicPath(episodeId: string, sceneId: string): string {
  return `audio/${episodeId}/${sceneId}.mp3`;
}

async function runAudition(): Promise<void> {
  const requested = option("--voices");
  const voices = (requested ?? config.voice)
    .split(",")
    .map((voice) => voice.trim())
    .filter(Boolean);
  if (voices.length === 0) {
    console.error(
      "name the voices to audition with --voices, or set voice.json voice",
    );
    process.exit(1);
  }
  // The sentences a judge of the accent needs: ordinary prose, the name
  // "Lean", and the technical words the series uses.
  const text =
    "Vericoding means writing a program, its specification, and a proof in one language. Lean checks every step. A lambda calculus core, reference counting, bisimulation, and the RTL of a processor all appear on the way down to machine code.";
  const dir = join(paths.root, "out", "audition");
  mkdirSync(dir, { recursive: true });
  for (const entry of voices) {
    // `label:voice` names the output after the voice; a bare value is both.
    const separator = entry.lastIndexOf(":");
    const label = separator === -1 ? entry : entry.slice(0, separator);
    const voice = separator === -1 ? entry : entry.slice(separator + 1);
    const file = join(dir, `${label.replace(/[^A-Za-z0-9_-]+/g, "-")}.mp3`);
    const bytes = await synthesize(text, voice);
    writeFileSync(file, bytes);
    console.log(
      `${relative(file)}  ${ffprobeDuration(file).toFixed(2)}s  ${label}`,
    );
  }
  console.log("Listen to these and record the chosen voice in voice.json.");
}

function selectedScenes(): { episodeId: string; scene: SceneSpec }[] {
  const out: { episodeId: string; scene: SceneSpec }[] = [];
  for (const episode of storyboard.episodes) {
    if (onlyEpisode && episode.id !== onlyEpisode) continue;
    if (!onlyEpisode && episode.draft) continue;
    for (const scene of episode.scenes) {
      if (onlyScene && scene.id !== onlyScene) continue;
      if (scene.silent) continue;
      out.push({ episodeId: episode.id, scene });
    }
  }
  return out;
}

async function main(): Promise<void> {
  ensureDirs();
  if (listVoices) {
    if (provider() !== "elevenlabs") {
      console.error("--list-voices is an ElevenLabs feature");
      process.exit(1);
    }
    for (const voice of await listElevenVoices()) {
      const labels = Object.entries(voice.labels ?? {})
        .map(([key, value]) => `${key}: ${value}`)
        .join(", ");
      console.log(
        `${voice.voice_id}  ${voice.name}${labels ? `  (${labels})` : ""}`,
      );
    }
    return;
  }
  if (audition) {
    await runAudition();
    return;
  }
  if (!skipAlignment && !process.env.OPENAI_API_KEY) {
    throw new Error(
      "alignment needs OPENAI_API_KEY even when narration comes from another provider",
    );
  }

  const state: VoiceState = existsSync(paths.voiceState)
    ? readJson<VoiceState>(paths.voiceState)
    : {
        provider: config.provider,
        model: config.model,
        voice: config.voice,
        clips: {},
      };
  state.provider = config.provider;
  state.model = config.model;
  state.voice = config.voice;

  const targets = selectedScenes();
  if (targets.length === 0) {
    console.error("no scenes matched the selection");
    process.exit(1);
  }

  let generated = 0;
  let reused = 0;

  for (const { episodeId, scene } of targets) {
    const key = sceneKey(episodeId, scene.id);
    const hash = voiceCacheKey(scene, config);
    const cached = state.clips[key];
    const file = sceneFile(episodeId, scene.id);

    const cacheValid = !force && cached?.hash === hash && existsSync(file);
    if (cacheValid && cached) {
      if (!cached.words && !skipAlignment) {
        console.log(`${key}: audio cached, aligning`);
        const { words, transcript } = await align(file);
        cached.words = words;
        cached.transcript = transcript;
        writeJson(paths.voiceState, state);
        continue;
      }
      reused += 1;
      console.log(`${key}: cached (${cached.durationSeconds.toFixed(2)}s)`);
      continue;
    }

    console.log(`${key}: synthesizing`);
    const text = spokenText(scene, config);
    const bytes = await synthesize(text, config.voice);
    mkdirSync(join(paths.audio, episodeId), { recursive: true });
    writeFileSync(file, bytes);

    const clip: VoiceClip = {
      hash,
      file: publicPath(episodeId, scene.id),
      bytes: bytes.byteLength,
      durationSeconds: ffprobeDuration(file),
    };
    if (!skipAlignment) {
      const { words, transcript } = await align(file);
      clip.words = words;
      clip.transcript = transcript;
    }
    state.clips[key] = clip;
    writeJson(paths.voiceState, state);
    generated += 1;
    console.log(
      `${key}: ${clip.durationSeconds.toFixed(2)}s, ${(bytes.byteLength / 1024).toFixed(0)} KiB` +
        (clip.words
          ? `, ${clip.words.length} aligned words`
          : ", no alignment"),
    );
  }

  writeJson(paths.voiceState, state);
  console.log(
    `\n${generated} generated, ${reused} reused. State: ${relative(paths.voiceState)}`,
  );
}

await main();
