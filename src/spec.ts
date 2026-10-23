/**
 * The authoring model. `storyboard.yaml` is parsed into these shapes by
 * `scripts/lib.ts`, and the same shapes reach the React scenes through
 * `generated/timing.json`, so a scene component never reads YAML.
 */

export type Accent = "teal" | "purple" | "rust" | "muted";

export type Language = "lean" | "python" | "text";

export interface CueSpec {
  /** The spoken phrase that places this cue, matched against the transcript. */
  phrase?: string;
  /** Manual override in seconds from the start of the scene's audio. */
  at?: number;
}

/** A cue value in the YAML: the phrase alone, or a phrase with an override. */
export type CueDeclaration = string | CueSpec;

export interface TitleVisual {
  kind: "title";
  kicker?: string;
  title: string;
  subtitle?: string;
  subtitleCue?: string;
}

export interface BrandVisual {
  kind: "brand";
  /** Wordmark height in pixels. */
  wordmark: number;
  title: string;
  subtitle?: string;
  titleCue?: string;
  subtitleCue?: string;
}

export interface ClosingVisual {
  kind: "closing";
  text: string;
  next?: string;
  cue?: string;
}

export interface Point {
  text: string;
  cue?: string;
  accent?: Accent;
}

export interface ClaimVisual {
  kind: "claim";
  eyebrow?: string;
  heading: string;
  points?: Point[];
  emphasis?: { text: string; cue?: string };
}

export interface QuantifyVisual {
  kind: "quantify";
  heading: string;
  left: { title: string; caption?: string; dots: number; cue?: string };
  right: { title: string; caption?: string; cue?: string };
  conclusion?: { text: string; cue?: string };
}

export interface ConvergeItem {
  label: string;
  detail?: string;
  cue?: string;
}

export interface ConvergeVisual {
  kind: "converge";
  heading: string;
  items: ConvergeItem[];
  result: ConvergeItem;
}

export interface CompareSide {
  title: string;
  lines?: string[];
  code?: { language: Language; code: string };
}

export interface CompareVisual {
  kind: "compare";
  heading: string;
  left: CompareSide;
  right: CompareSide;
  leftCue?: string;
  rightCue?: string;
  note?: string;
  noteCue?: string;
}

export interface CardSpec {
  title: string;
  body: string;
  verdict?: string;
  accent?: Accent;
  cue?: string;
}

export interface CardsVisual {
  kind: "cards";
  heading: string;
  cards: CardSpec[];
  note?: string;
  noteCue?: string;
}

export interface TableVisual {
  kind: "table";
  heading: string;
  columns: [string, string];
  rows: { left: string; right: string; cue?: string }[];
}

export interface PipelineStage {
  label: string;
  detail?: string;
  cue?: string;
}

export interface PipelineVisual {
  kind: "pipeline";
  heading: string;
  stages: PipelineStage[];
  verdict?: { accept: string; reject: string; cue?: string };
  note?: string;
  noteCue?: string;
  afterword?: string;
  afterwordCue?: string;
}

export interface LineRange {
  cue: string;
  lines: [number, number];
}

export interface GoalSpec {
  cue?: string;
  label: string;
  text: string;
}

export interface CodeVisual {
  kind: "code";
  heading: string;
  language: Language;
  code: string;
  /** Line ranges (1-based, inclusive) that appear at the given cue. */
  reveal?: LineRange[];
  /** Goal panel contents, shown from the given cue onward. */
  goals?: GoalSpec[];
  caption?: { text: string; cue?: string };
}

export interface StaircaseVisual {
  kind: "staircase";
  heading: string;
  levels: { name: string; detail?: string }[];
  levelsCue?: string;
  optimiseCue?: string;
  lowerCue?: string;
  refineCue?: string;
  proposed?: { text: string; cue?: string };
}

export interface ShapesVisual {
  kind: "shapes";
  heading: string;
  left: { label: string; rows: number; cols: number; cue?: string };
  right: { label: string; left: number; right: number; cue?: string };
  note?: string;
  noteCue?: string;
}

export interface StackVisual {
  kind: "stack";
  heading: string;
  layers: { label: string; detail?: string; cue?: string; accent?: Accent }[];
  bottom: { label: string; detail?: string; cue?: string };
  note?: string;
  noteCue?: string;
}

export type Visual =
  | TitleVisual
  | BrandVisual
  | ClosingVisual
  | ClaimVisual
  | QuantifyVisual
  | ConvergeVisual
  | CompareVisual
  | CardsVisual
  | TableVisual
  | PipelineVisual
  | CodeVisual
  | StaircaseVisual
  | ShapesVisual
  | StackVisual;

export type VisualKind = Visual["kind"];

export interface SceneSpec {
  id: string;
  narration: string;
  /** Spoken text when it must differ from the displayed narration. */
  spoken?: string;
  /** A scene with no narration: `seconds` is then required. */
  silent?: boolean;
  seconds?: number;
  /** Frames of stillness after the audio ends. */
  tailHold?: number;
  cues?: Record<string, CueDeclaration>;
  visual: Visual;
}

export interface EpisodeSpec {
  id: string;
  title: string;
  scenes: SceneSpec[];
  /**
   * A script under edit: validated, but kept out of timing and the default
   * voice run until its narration is recorded.
   */
  draft?: boolean;
}

export interface Storyboard {
  fps: number;
  series: string;
  subtitle?: string;
  episodes: EpisodeSpec[];
}

// ---- generated timing -----------------------------------------------------

export interface SceneTiming {
  id: string;
  from: number;
  durationInFrames: number;
  audio: string | null;
  cues: Record<string, number>;
  visual: Visual;
  narration: string;
}

export interface EpisodeTiming {
  id: string;
  title: string;
  durationInFrames: number;
  scenes: SceneTiming[];
}

export interface Timing {
  fps: number;
  series: string;
  subtitle?: string;
  generatedFrom: { storyboard: string; voice: string };
  episodes: EpisodeTiming[];
}
