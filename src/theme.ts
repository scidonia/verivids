/**
 * Design tokens for every film in the series.
 *
 * The palette is deliberately small: one paper colour, one ink, two accent
 * hues that carry meaning (teal = a transformation inside a level, purple =
 * a lowering between levels), and a muted grey for everything that is
 * present but not the subject.
 *
 * Sizes are in CSS pixels at the 1920x1080 composition size. The safe area
 * keeps titles and diagrams clear of the frame edge.
 */
export const theme = {
  color: {
    paper: "#f7f5ef",
    ink: "#171a1f",
    muted: "#5f6673",
    faint: "#d7d3c9",
    rule: "#b9b4a7",
    teal: "#0f766e",
    tealSoft: "#d6ece8",
    purple: "#6d28d9",
    purpleSoft: "#e6dcf8",
    rust: "#b4451f",
    rustSoft: "#f6e2d8",
    code: "#1d2229",
    codeInk: "#e9e6dc",
  },
  font: {
    body: '"Inter", system-ui, sans-serif',
    code: '"JetBrains Mono", ui-monospace, monospace',
  },
  size: {
    title: 108,
    subtitle: 46,
    heading: 40,
    body: 34,
    small: 26,
    code: 27,
    fine: 21,
  },
  space: {
    margin: 96,
    gap: 32,
    radius: 10,
  },
  motion: {
    /** One reveal, from hidden to settled. */
    reveal: 14,
    /** The tail a scene keeps still after its last cue. */
    settle: 24,
  },
} as const;

export type Theme = typeof theme;
