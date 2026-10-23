# Suggestion: an OMP-driven 2D explainer video kit

## Objective

Create technical explanatory videos using explicitly authored 2D graphics and synthetic narration with a slight Irish accent. The visuals should resemble an animated technical presentation: sharp diagrams, progressive reveals, moving arrows, code fragments, highlights and restrained camera movements.

Use the formal language stack as the first production. Its central visual is a staircase: horizontal transformations optimise a program within a semantic level; vertical transformations lower or implement it at another level. Each edge carries a refinement proof, with bisimulation available where appropriate.

This document proposes an implementation plan. The commands and schemas below are interfaces to build, rather than an existing package. Assume OMP can edit a local project, execute shell commands and inspect rendered images; adapt the integration to its actual capabilities without requiring a special OMP API.

## Recommended stack

| Responsibility | Suggested tool | Reason |
| --- | --- | --- |
| Orchestration | Existing OMP harness | Drive authoring, builds, inspection and revision |
| Video rendering | Remotion with TypeScript and React | Represent scenes as code and render their state at each frame |
| Graphics | SVG and React components | Keep diagrams exact, editable and independently animated |
| Primary narration | ElevenLabs | Audition a suitable Irish-accented voice and retain its identity |
| Alternative narration | Azure Speech, `en-IE-ConnorNeural` | Audition an existing Irish English male voice |
| Media inspection | FFmpeg and ffprobe | Inspect duration, streams and final encoding; extract review frames |
| Delivery | H.264 MP4 plus SRT captions | Produce a broadly usable video and separate subtitles |

Use one rendering framework initially. Motion Canvas is an alternative if generator-based animation authoring proves preferable; Manim is worth considering for a later film dominated by mathematical transformations. Neither is needed for the first staircase explainer.

Review Remotion's current licence against the organisation's intended use before adopting it. Pin package versions and retain the lockfile.

## Production defaults

- Final output: 1920 × 1080, 30 frames per second, landscape.
- Preview output: 960 × 540 at the same frame rate.
- Pilot: 20–30 seconds; complete first film: approximately three minutes.
- Visual style: light background, dark text, teal optimisation arrows and purple lowering arrows.
- Narration: measured, conversational, subtle Irish accent and restrained emphasis.
- Music: omit from the first version.
- Typography: bundle appropriately licensed fonts locally; use generous sizes and a consistent safe margin.

Avoid filling the screen with the entire technical explanation. Let narration carry the detail while the image shows the current relationship. Most frames should remain stable, with one meaningful change at a time.

## Project structure

| Path | Purpose |
| --- | --- |
| `brief.md` | Audience, argument, terminology and visual constraints |
| `storyboard.yaml` | Ordered scenes, narration, visual actions and named cues |
| `voice.json` | Provider, model, voice identity, settings and pronunciation policy |
| `src/theme.ts` | Colours, fonts, spacing and default motion durations |
| `src/components/` | Shared diagram and animation components |
| `src/scenes/` | One React component per scene |
| `src/Root.tsx` | Remotion compositions and video metadata |
| `scripts/` | Validation, narration generation, timing and render wrappers |
| `public/audio/` | Cached audio assets accessible to the renderer |
| `generated/timing.json` | Measured clip durations and resolved frame positions |
| `generated/captions.srt` | Subtitle output |
| `out/review/` | Representative frames and preview videos |
| `out/final/` | Finished MP4, subtitles and build manifest |

Keep provider credentials in environment variables. Store voice identity and non-secret configuration in the project.

## Content and timing model

Separate the narration and intended visual sequence from frame calculations. Scenes refer to named cues such as `show_lowering` or `show_optimisation`. A timing resolver converts these cues into frame positions after audio generation.

An illustrative storyboard entry:

```yaml
id: lowering-and-optimisation
narration: >-
  We can optimise a program within a language.
  We can also lower it into a different representation.
  Each transformation comes with a proof that its behaviour
  is permitted by the specification we started with.
visual:
  scene: staircase-introduction
  initial_focus: lean
cues:
  show_optimisation:
    phrase: "optimise a program within a language"
  show_lowering:
    phrase: "lower it into a different representation"
  show_proof:
    phrase: "Each transformation comes with a proof"
tail_hold_seconds: 1.2
```

Phrase references are authoring intent, not timestamps supplied automatically by the renderer. For the pilot, resolve them manually while listening to the clip and save the result. Later, use provider timestamps or forced alignment to propose positions, allowing explicit overrides. Ambiguous or missing phrase matches should produce a validation error.

Keep spoken text separate from displayed mathematical notation. Speak “the implementation's behaviours are permitted by the specification” while displaying the corresponding inclusion formula.

## Narration workflow

1. Audition two or three short samples using actual technical sentences.
2. Choose one voice and model; retain the settings for subsequent scenes.
3. Generate narration per scene, using natural paragraphs rather than isolated words.
4. Listen for pronunciation, cadence, accent consistency and unnatural pauses.
5. Measure the actual audio duration and resolve the scene's cues.
6. Cache the audio and metadata so visual edits do not incur another generation.

Suggested voice direction:

> An adult narrator speaking clear, conversational English with a subtle Irish accent. Measured technical explanation, natural pauses, restrained emphasis and a calm, thoughtful delivery.

Test “Lean”, “lambda”, “reference counting”, “bisimulation”, “refinement” and “RTL” before generating the full script. Expand abbreviations in spoken text where useful. Use provider-supported pronunciation controls or a separate spoken-text override when necessary.

The cache key should include the spoken text, provider, model, voice identity, pronunciation configuration and synthesis settings. Regenerate only affected scenes. Retain accepted audio files even if provider behaviour changes later.

## Reusable visual components

Build only the components required for the first film:

| Component | Behaviour |
| --- | --- |
| `Layer` | Label a semantic level and its program representation |
| `ProgramCard` | Present a short code fragment, expression or state |
| `RefinementArrow` | Draw an edge and reveal its proof label |
| `Highlight` | Emphasise one object and optionally dim surrounding objects |
| `BehaviourTrace` | Display observable events across different representations |
| `Camera` | Pan and zoom over the staircase while retaining legibility |

Reconstruct the staircase using these objects. The existing static diagram is a visual reference; separate objects are needed to move arrows, change labels and expose individual layers.

Use frame-derived animation state. Avoid wall-clock timers, external network dependencies during rendering and unseeded randomness. Load fonts and assets explicitly before capturing frames.

## First-film storyboard

| Scene | Approximate time | Visual action | Point |
| --- | --- | --- | --- |
| Meaning before compilation | 0–20 s | Show a Lean program beside an observable result | The source specifies behaviour |
| Lowering | 20–50 s | Reveal LambdaPure, LambdaRC, C and ISA levels progressively | Representations change through proved refinements |
| Optimising sideways | 50–80 s | Transform a program card horizontally; preserve its visible trace | Optimisation also happens within each level |
| Why multiple levels help | 80–115 s | Show an immutable value implemented using uniquely owned storage | Ownership and RC expose reuse opportunities |
| Composing the path | 115–145 s | Pull back to the staircase and illuminate the travelled edges | Local refinement theorems compose |
| Reaching hardware | 145–180 s | Relate architectural state to pipeline state, then return to the overview | Hardware execution implements the ISA under stated assumptions |

Treat these times as targets. The recorded delivery determines the final durations.

Technical constraints for the explanation:

- Label the complete stack as a proposed architecture; distinguish it from already-established results.
- Use refinement as the default relationship. Explain equivalence only where useful.
- Describe “up-to” as a sound technique for establishing a relation.
- Explain that a processor executing the loaded code implements ISA semantics.
- Keep functional correctness separate from claims about performance improvement.
- Avoid implying that arbitrary liveness or security properties follow from trace inclusion without further conditions.

## OMP build interface

Implement a small set of project commands:

```bash
npm run validate
npm run voice -- --scene lowering-and-optimisation
npm run timing
npm run stills
npm run preview
npm run render
```

| Command | Required outcome |
| --- | --- |
| `validate` | Validate schema, unique IDs, cue references, assets and available configuration |
| `voice` | Generate or reuse cached narration; emit audio metadata |
| `timing` | Resolve scene durations and cues to integer frame positions |
| `stills` | Render review images at cue boundaries and representative transition midpoints |
| `preview` | Produce the complete low-resolution video with narration |
| `render` | Produce the final MP4, captions and build manifest |

Keep unresolved timings explicit. Do not silently substitute missing narration or invented timestamps in a final render. A silent visual preview may be supported as an explicitly selected mode.

OMP should work in this order: edit content, validate, obtain narration, resolve timing, inspect stills, render preview, inspect motion and sound, revise affected scenes, and render final output. If the harness cannot directly review audio or video, produce a review package for a human and report that limitation.

## Implementation milestones

### Milestone 1: complete pilot

Implement one 20–30 second scene with two semantic levels, a horizontal optimisation, a vertical lowering and narration. Establish the theme and command wrappers with this scene.

Accept the pilot when:

- It renders unattended from the command line.
- The Irish accent and technical pronunciation are acceptable on listening.
- The two visual actions follow the corresponding spoken phrases.
- Text is readable at 1080p and does not clip or collide during movement.
- Audio is not cut off and the final image has time to settle.
- A visual-only edit reuses the accepted narration.

### Milestone 2: full storyboard and animatic

Write all narration, settle technical claims and build simple versions of the six scenes. Render the whole film with limited motion to judge pacing before polishing.

### Milestone 3: finished film

Improve transitions, demonstrate the RC/reuse example, refine camera movement and generate phrase-level captions. Inspect the complete preview, then render and verify final streams, duration and representative frames.

### Milestone 4: reusable kit

Extract the components and production conventions proven useful by the finished film. Document how to replace the topic, script and diagram while preserving the build workflow. Add automated alignment only if manual cue placement has become a bottleneck.

## Verification and delivery

Use lightweight checks for schema validity, frame calculations, missing assets and stale narration metadata. Visual inspection must cover intermediate animation frames as well as static scene endpoints. Listening is required to evaluate narration quality.

Deliver the project source, lockfile, accepted narration clips, final MP4, SRT captions and a manifest recording source revision, render settings and audio hashes. Preserve explicit cue overrides so a rebuild does not require rediscovering editorial choices.

The first objective is one convincing film. Let that production determine how much of a general video system is worth building.

## Reference documentation

- [Remotion: core rendering model](https://www.remotion.dev/docs/idea)
- [Remotion: captions](https://www.remotion.dev/docs/captions/)
- [Remotion: licence and pricing](https://www.remotion.dev/docs/license/pricing)
- [ElevenLabs: voice design](https://elevenlabs.io/docs/eleven-creative/voices/voice-design)
- [Azure Speech: language and voice support](https://learn.microsoft.com/azure/ai-services/speech-service/language-support)
- [Motion Canvas: introduction](https://motioncanvas.io/docs/)
