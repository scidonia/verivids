# Repository conventions

## Toolchain

All Node, Lean and FFmpeg commands run through the nix dev shell:

```sh
nix develop -c <command>
```

Do not assume an activated shell. Each command brings its own environment,
and Chromium comes from the store via `REMOTION_BROWSER_EXECUTABLE`.

## Content

- `storyboard.yaml` is the single source of narration, cues and visual specs.
  A script under edit carries `draft: true`: it is validated, but `timing`
  leaves it out and a default `voice` run skips it. Record it with
  `npm run voice -- --episode <id>`, then remove the flag.
  Do not add timestamps by hand when a cue phrase will do; `at:` is for a
  phrase the aligner cannot place, and its use is printed by `npm run timing`.
- A cue name appears once, in the scene's `cues:` map. Visuals refer to the
  name through a `cue`/`*Cue` field. `npm run validate` fails on an unused or
  undeclared cue, so the YAML and the components cannot drift.
- Every `language: lean` snippet is compiled by `npm run validate`. The goal
  panel text is Lean's own `trace_state` output; if a proof changes, capture
  the new state from Lean rather than editing the panel by hand.
- The staircase is labelled "proposed architecture" on screen. Do not remove
  that label, and do not present refinement as equivalence.
- Functional correctness and performance are kept separate. The one timing
  figure is the tutorial's own measurement and is attributed to it on screen.

## Generated artefacts

`generated/timing.json`, `generated/voice.json`, `generated/captions/*.srt`
and `public/audio/**` are committed. They are what makes a render offline and
reproducible. Regenerate them with `npm run voice` and `npm run timing`, and
commit the result with the storyboard change that caused it.

`out/` is never committed.

## Narration

- Synthesis is a network step: `ELEVENLABS_API_KEY` for the voice and
  `OPENAI_API_KEY` for forced alignment. Rendering must never need either.
- The accent is carried by the voice, not by the text. Do not switch to a
  provider whose accent has not been auditioned; OpenAI's instruction-based
  accent steering was auditioned for this series and rejected.
- `voice` may be a library voice name or an id; a name is resolved against
  the account when `voice` runs, so nothing is pinned to an id that the
  account does not have.
- The cache key covers spoken text, provider, model, voice, speed,
  instructions and voice settings. Do not bypass the cache to "refresh" a
  clip whose inputs did not change; `--force` is for a rejected take.
- `pronunciation` in `voice.json` rewrites spoken text only. Displayed
  narration is never rewritten.
- A clip is accepted by a human listening to it. The pipeline can check that
  the words are intelligible and that a cue phrase occurs, and cannot check
  that the accent or delivery is acceptable.

## Verification

- `npm run validate` — schema, cue hygiene, and every Lean snippet.
- `npm run timing` — every cue resolves uniquely; scene durations come from
  the recorded audio.
- `npm run stills` — review every cue boundary, not only scene endpoints.
- `npm run render` — fails if a rendered duration differs from its
  composition by more than 0.25 s, and records audio hashes in the manifest.

## Style

- TypeScript is strict; `npx tsc --noEmit` must pass.
- Prettier, nixfmt, mdformat and the rest are configured in `flake.nix`.
- Components take their content from the visual spec. A component that
  hard-codes storyboard text is a bug: the YAML is the edit surface.
- No animation reads the wall clock or `Math.random`. The frame is the only
  input to motion.
