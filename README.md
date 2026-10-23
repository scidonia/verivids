# verivids

A six-part introduction to vericoding — what it is, and how it is done —
authored as code and rendered with Remotion. Every visual is a React
component driven by the storyboard's cues; every narration clip is generated
once, aligned to its own audio, and committed, so a render is deterministic
and needs no network.

| Episode | Length | Question it answers |
| ------------------------- | ------ | ------------------------------------------------------ |
| 01 `what-is-vericoding` | 1:36 | What is vericoding, and why is it practical now? |
| 02 `proofs-are-programs` | 1:27 | Why can a theorem prover also be the compiler? |
| 03 `first-contract` | 1:17 | What does a program + specification + proof look like? |
| 04 `two-ways-to-specify` | 2:05 | Intrinsic or extrinsic, deep or shallow? |
| 05 `from-proof-to-binary` | 1:35 | What survives compilation, and what is the staircase? |
| 06 `building-the-world` | 1:58 | Effects, libraries, theories, and the trusted base |

Total: 10 minutes at 1920x1080, 30 fps, with an H.264 MP4 and an
SRT caption track per episode.

The content follows the `vericoding-tutorial` repository (CC BY 4.0), whose
examples are the ones shown in episode 3. The production plan is
`docs/notes/OMP_2D_Explainer_Video_Suggestion.md`.

## Quick start

Everything runs through the flake. There is no activated shell to set up:

```sh
nix develop -c npm install
nix develop -c npm run validate        # storyboard + Lean snippets compile
nix develop -c npm run render          # writes out/final/
```

`nix build` renders every film from the committed narration and timing
artefacts, with Chromium from the Nix store:

```sh
nix build .#videos
ls result/
```

## Commands

| Command | Effect |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run validate` | Checks the storyboard: unique ids, known visual kinds, no unknown fields, every cue declared and used, every cue phrase present in its narration, every Lean snippet compiled by `lean`. |
| `npm run voice` | Synthesizes any scene whose spoken text, voice or settings changed, then force-aligns the clip and records word timings. Reuses everything else. |
| `npm run timing` | Resolves each cue to a frame from its aligned phrase, writes `generated/timing.json` and the SRTs, and refuses to proceed on a phrase it cannot place uniquely. |
| `npm run stills -- --episode 03-first-contract` | Renders review PNGs at every cue, cue + 12 frames, and the scene's first and last frames. |
| `npm run preview` | 960x540 renders into `out/preview/`. |
| `npm run render` | 1920x1080 renders, captions and `manifest.json` into `out/final/`. |
| `npm run studio` | Remotion Studio, for scrubbing a composition. |
| `npm run voice -- --audition` | Synthesizes the same paragraph in two voices into `out/audition/` for a listening decision. It does not touch the committed clips. |

`--episode <id>` narrows `voice`, `stills`, `preview` and `render`.

## How the pipeline is wired

```text
storyboard.yaml ──► voice.ts ──► public/audio/<episode>/<scene>.mp3
        │                 │              + generated/voice.json (word times)
        │                 ▼
        │            timing.ts ──► generated/timing.json ──► Root.tsx compositions
        │                 └─────► generated/captions/<episode>.srt
        ▼
   validate.ts (Lean compiles every snippet)
```

- **A cue is a spoken phrase**, not a timestamp. `timing.ts` locates the
  phrase in the forced-alignment transcript and converts the word's start to
  a frame. It fails if the phrase is absent or matched more than once, so a
  mispronounced word cannot silently shift the edit. `at: <seconds>` is the
  explicit override.
- **Scene duration comes from the audio**, plus `tailHold` seconds of
  stillness. Nothing is padded to a target length.
- **A visual names cues; the point is the one place a cue is declared.**
  `validate.ts` rejects a visual that names an undeclared cue and a declared
  cue that no visual uses.
- **Every Lean snippet is compiled.** The goal panel in episode 3 is Lean's
  own output captured with `trace_state`, not prose about a proof.

## Narration

`voice.json` selects the provider, model, voice and voice settings. The
accent has to come from a native Irish voice, so narration is recorded with
ElevenLabs from a voice in the account's library:

```sh
export ELEVENLABS_API_KEY=...
npm run voice -- --list-voices      # id, name, and accent/gender labels
```

Set `voice` to either the library voice's name (`"Brian"`) or its id. A name
is resolved against the account at run time, so a library voice can be
swapped without editing a scene. ElevenLabs needs `OPENAI_API_KEY` as well:
the word-level timings that place every cue come from forced alignment with
`whisper-1`, whatever produced the audio.

OpenAI `gpt-4o-mini-tts` remains supported as an alternate provider
(`instructions` steers delivery), but audition it first: its accent steering
did not produce an acceptable Irish accent for this series, which is why the
committed clips are not from it.

Each clip is cached on a hash of the spoken text, provider, model, voice,
speed, instructions and voice settings. A visual edit reuses the accepted
audio; a text edit regenerates only the affected scene. `generated/voice.json`
retains the transcript and word timings, so `timing.ts` can run without the
provider.

Narration synthesis is the only network step. The render is offline.

## Nix

- `devShells.default` provides Node 22, Chromium, FFmpeg, Lean 4, git and
  the treefmt wrapper.
- Chromium comes from the store and is passed to Remotion through
  `REMOTION_BROWSER_EXECUTABLE`, so Remotion never downloads a browser.
- `packages.videos` builds with `buildNpmPackage` and runs `npm run render`
  against the committed audio and timing. `npmDepsHash` is pinned; refresh it
  with `nix run nixpkgs#prefetch-npm-deps -- package-lock.json` after changing
  dependencies.
- Commands run as `nix develop -c <command>`. Nothing depends on direnv, and
  a `.direnv/` copied into a worktree must be removed.

## Remotion licence

Remotion may be used free of charge by individuals, non-profit organisations,
and for-profit organisations with up to three employees; other organisations
require a paid company licence (<https://www.remotion.dev/docs/license>).
This repository's use is covered by the free licence. Re-check that before
reusing the kit under a different legal entity.

## Layout

| Path | Purpose |
| --------------------------------- | ------------------------------------------------------ |
| `brief.md` | Audience, argument, terminology and visual constraints |
| `storyboard.yaml` | Episodes, scenes, narration, cues and visual specs |
| `voice.json` | Provider, model, voice, settings and pronunciation |
| `src/theme.ts` | Colours, fonts, spacing, motion durations |
| `src/components/` | Frame chrome, primitives, and the visual kinds |
| `src/Episode.tsx`, `src/Root.tsx` | Composition and episode timeline |
| `scripts/` | validate, voice, timing, stills, render |
| `public/audio/` | Committed narration clips |
| `generated/` | Timing, alignment and caption artefacts |
| `out/review/` | Review stills (not committed) |
| `out/final/` | Films, captions and manifest (not committed) |

## Checks worth running before a release

```sh
nix develop -c npm run validate
nix develop -c npm run timing          # must place every cue
nix develop -c npm run stills
nix develop -c npm run render
ffprobe -v error -show_entries format=duration -of csv=p=0 out/final/01-what-is-vericoding.mp4
```

The renderer compares each film's measured duration with its composition and
fails on a mismatch, and writes the audio hash of every scene into the
manifest. Listening is still required to judge the narration; nothing in the
pipeline can.
