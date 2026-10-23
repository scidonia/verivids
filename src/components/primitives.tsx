import type { CSSProperties, PropsWithChildren, ReactNode } from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { theme } from "../theme";

/**
 * A cue frame, or a loud failure. A scene that names a cue the storyboard did
 * not resolve is an authoring error, and it must stop the render rather than
 * silently animate at frame zero.
 */
export function cueFrame(
  cues: Record<string, number>,
  name: string | undefined,
  where: string,
): number | undefined {
  if (name === undefined) return undefined;
  const frame = cues[name];
  if (frame === undefined) {
    throw new Error(
      `${where}: no resolved frame for cue ${JSON.stringify(name)}. ` +
        `Declared cues: ${Object.keys(cues).join(", ") || "(none)"}`,
    );
  }
  return frame;
}

export const Reveal: React.FC<
  PropsWithChildren<{
    at?: number;
    fade?: number;
    rise?: number;
    style?: CSSProperties;
  }>
> = ({ at, fade = theme.motion.reveal, rise = 14, style, children }) => {
  const frame = useCurrentFrame();
  if (at === undefined) return <div style={style}>{children}</div>;
  const progress = interpolate(frame, [at, at + fade], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  return (
    <div
      style={{
        ...style,
        opacity: progress,
        transform: `translateY(${(1 - progress) * rise}px)`,
      }}
    >
      {children}
    </div>
  );
};

/** The SVG counterpart of `Reveal`: a group, not a box. */
export const SvgReveal: React.FC<
  PropsWithChildren<{
    at?: number;
    fade?: number;
    rise?: number;
  }>
> = ({ at, fade = theme.motion.reveal, rise = 0, children }) => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [at ?? 0, (at ?? 0) + fade], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  return (
    <g
      opacity={progress}
      transform={
        rise === 0 ? undefined : `translate(0 ${(1 - progress) * rise})`
      }
    >
      {children}
    </g>
  );
};

/** A frame-derived push-in, applied to a drawing rather than the whole scene. */
export function useCamera(
  from: { scale: number; x: number; y: number },
  to: { scale: number; x: number; y: number },
  durationInFrames: number,
): string {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [0, durationInFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });
  const scale = from.scale + (to.scale - from.scale) * progress;
  const x = from.x + (to.x - from.x) * progress;
  const y = from.y + (to.y - from.y) * progress;
  return `translate(${x} ${y}) scale(${scale})`;
}

export const Eyebrow: React.FC<{ children: ReactNode; color?: string }> = ({
  children,
  color = theme.color.muted,
}) => (
  <div
    style={{
      fontFamily: theme.font.body,
      fontSize: theme.size.small,
      letterSpacing: "0.14em",
      textTransform: "uppercase",
      color,
      marginBottom: 18,
    }}
  >
    {children}
  </div>
);

export const Heading: React.FC<{ children: ReactNode; size?: number }> = ({
  children,
  size = theme.size.heading,
}) => (
  <div
    style={{
      fontFamily: theme.font.body,
      fontWeight: 650,
      fontSize: size,
      lineHeight: 1.16,
      letterSpacing: "-0.01em",
      color: theme.color.ink,
    }}
  >
    {children}
  </div>
);

export const Panel: React.FC<
  PropsWithChildren<{
    style?: CSSProperties;
    tone?: "paper" | "ink" | "teal" | "purple";
  }>
> = ({ style, tone = "paper", children }) => {
  const background =
    tone === "ink"
      ? theme.color.code
      : tone === "teal"
        ? theme.color.tealSoft
        : tone === "purple"
          ? theme.color.purpleSoft
          : "#fffdf8";
  const border = tone === "ink" ? theme.color.code : theme.color.rule;
  return (
    <div
      style={{
        background,
        border: `1px solid ${border}`,
        borderRadius: theme.space.radius,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

export const Chip: React.FC<{
  children: ReactNode;
  color?: string;
  background?: string;
}> = ({
  children,
  color = theme.color.ink,
  background = theme.color.faint,
}) => (
  <span
    style={{
      display: "inline-block",
      fontFamily: theme.font.body,
      fontSize: theme.size.fine,
      fontWeight: 600,
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      color,
      background,
      borderRadius: 999,
      padding: "6px 16px",
    }}
  >
    {children}
  </span>
);

export const NoteBar: React.FC<{
  children: ReactNode;
  at?: number;
  color?: string;
  rule?: string;
}> = ({ children, at, color = theme.color.muted, rule = theme.color.rule }) => (
  <Reveal at={at}>
    <div
      style={{
        fontFamily: theme.font.body,
        fontSize: theme.size.small,
        lineHeight: 1.45,
        color,
        borderLeft: `3px solid ${rule}`,
        paddingLeft: 18,
        maxWidth: 1100,
      }}
    >
      {children}
    </div>
  </Reveal>
);

export const Stage: React.FC<PropsWithChildren<{ style?: CSSProperties }>> = ({
  style,
  children,
}) => (
  <AbsoluteFill
    style={{
      padding: theme.space.margin,
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      gap: theme.space.gap,
      ...style,
    }}
  >
    {children}
  </AbsoluteFill>
);

/** An SVG arrow whose shaft draws itself as `progress` goes from 0 to 1. */
export const Arrow: React.FC<{
  from: { x: number; y: number };
  to: { x: number; y: number };
  progress: number;
  color?: string;
  width?: number;
  dashed?: boolean;
  head?: number;
}> = ({
  from,
  to,
  progress,
  color = theme.color.rule,
  width = 3,
  dashed = false,
  head = 14,
}) => {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy);
  const ux = dx / (length || 1);
  const uy = dy / (length || 1);
  const tip = { x: from.x + dx * progress, y: from.y + dy * progress };
  const left = {
    x: tip.x - ux * head - uy * head * 0.55,
    y: tip.y - uy * head + ux * head * 0.55,
  };
  const right = {
    x: tip.x - ux * head + uy * head * 0.55,
    y: tip.y - uy * head - ux * head * 0.55,
  };
  return (
    <g>
      <line
        x1={from.x}
        y1={from.y}
        x2={from.x + dx * progress}
        y2={from.y + dy * progress}
        stroke={color}
        strokeWidth={width}
        strokeLinecap="round"
        strokeDasharray={dashed ? "10 10" : undefined}
      />
      {progress > 0.02 ? (
        <polygon
          points={`${tip.x},${tip.y} ${left.x},${left.y} ${right.x},${right.y}`}
          fill={color}
        />
      ) : null}
    </g>
  );
};

/** Frame-derived progress of a cue-driven animation, clamped. */
export function useProgress(
  at: number | undefined,
  duration: number = theme.motion.reveal,
): number {
  const frame = useCurrentFrame();
  if (at === undefined) return 1;
  return interpolate(frame, [at, at + duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
}
