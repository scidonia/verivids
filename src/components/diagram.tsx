import { useId } from "react";
import { useVideoConfig } from "remotion";
import type {
  CardsVisual,
  CompareVisual,
  ConvergeVisual,
  PipelineVisual,
  QuantifyVisual,
  StackVisual,
  StaircaseVisual,
} from "../spec";
import { theme } from "../theme";
import type { KindProps } from "./kind";
import {
  Arrow,
  Chip,
  cueFrame,
  Eyebrow,
  Heading,
  NoteBar,
  Panel,
  Reveal,
  Stage,
  SvgReveal,
  useCamera,
  useProgress,
} from "./primitives";

const accentColor = (accent: string | undefined): string =>
  accent === "purple"
    ? theme.color.purple
    : accent === "rust"
      ? theme.color.rust
      : accent === "muted"
        ? theme.color.muted
        : theme.color.teal;

const Connector: React.FC<{ at?: number }> = ({ at }) => {
  const progress = useProgress(at, 12);
  return (
    <svg viewBox="0 0 70 40" style={{ width: 70, height: 40, flexShrink: 0 }}>
      <Arrow
        from={{ x: 8, y: 20 }}
        to={{ x: 62, y: 20 }}
        progress={progress}
        color={theme.color.rule}
        width={2}
      />
    </svg>
  );
};

const ConvergeArrows: React.FC<{ at?: number; count: number }> = ({
  at,
  count,
}) => {
  const progress = useProgress(at, 20);
  const width = 1600;
  const centre = width / 2;
  return (
    <svg viewBox={`0 0 ${width} 70`} style={{ width: "100%", height: 70 }}>
      {Array.from({ length: count }, (_, index) => {
        const x =
          count === 1 ? centre : 80 + (index * (width - 160)) / (count - 1);
        return (
          <Arrow
            key={index}
            from={{ x, y: 2 }}
            to={{ x: centre, y: 62 }}
            progress={progress}
            color={theme.color.teal}
            width={3}
          />
        );
      })}
    </svg>
  );
};

export const QuantifyKind: React.FC<KindProps<QuantifyVisual>> = ({
  visual,
  cues,
  where,
}) => {
  const columns = 12;
  const rows = 6;
  const cell = 58;
  const dot = (index: number) => ({
    x: (index % columns) * cell + cell / 2,
    y: Math.floor(index / columns) * cell + cell / 2,
  });
  const sampled = new Set(
    Array.from(
      { length: visual.left.dots },
      (_, index) => (index * 7 + 3) % (columns * rows),
    ),
  );
  const leftCue = cueFrame(cues, visual.left.cue, where);
  const rightCue = cueFrame(cues, visual.right.cue, where);
  const region = useProgress(rightCue, 26);
  // Scene-local, so two diagrams on one page cannot capture each other's clip.
  const clipId = `inputs-${useId().replace(/:/g, "")}`;

  return (
    <Stage>
      <Reveal>
        <Heading size={52}>{visual.heading}</Heading>
      </Reveal>
      <div style={{ display: "flex", gap: 40, marginTop: 8 }}>
        <Reveal at={leftCue} style={{ flex: 1 }}>
          <Panel style={{ padding: 26 }}>
            <div
              style={{
                fontFamily: theme.font.body,
                fontWeight: 650,
                fontSize: 32,
              }}
            >
              {visual.left.title}
            </div>
            <svg
              viewBox={`0 0 ${columns * cell} ${rows * cell}`}
              style={{ width: "100%", height: "auto", marginTop: 14 }}
            >
              {Array.from({ length: columns * rows }, (_, index) => {
                const { x, y } = dot(index);
                const on = sampled.has(index);
                return (
                  <circle
                    key={index}
                    cx={x}
                    cy={y}
                    r={on ? 9 : 4}
                    fill={on ? theme.color.teal : theme.color.faint}
                    opacity={on ? 1 : 0.7}
                  />
                );
              })}
            </svg>
            <div
              style={{
                fontFamily: theme.font.body,
                fontSize: theme.size.small,
                color: theme.color.muted,
                marginTop: 8,
              }}
            >
              {visual.left.caption}
            </div>
          </Panel>
        </Reveal>

        <Reveal at={rightCue} style={{ flex: 1 }}>
          <Panel style={{ padding: 26 }}>
            <div
              style={{
                fontFamily: theme.font.body,
                fontWeight: 650,
                fontSize: 32,
              }}
            >
              {visual.right.title}
            </div>
            <svg
              viewBox={`0 0 ${columns * cell} ${rows * cell}`}
              style={{ width: "100%", height: "auto", marginTop: 14 }}
            >
              <defs>
                <clipPath id="all-inputs">
                  <rect
                    x={0}
                    y={0}
                    width={columns * cell * region}
                    height={rows * cell}
                  />
                </clipPath>
              </defs>
              {Array.from({ length: columns * rows }, (_, index) => {
                const { x, y } = dot(index);
                return (
                  <circle
                    key={index}
                    cx={x}
                    cy={y}
                    r={4}
                    fill={theme.color.faint}
                    opacity={0.6}
                  />
                );
              })}
              <g clipPath={`url(#${clipId})`}>
                {Array.from({ length: columns * rows }, (_, index) => {
                  const { x, y } = dot(index);
                  return (
                    <circle
                      key={`in-${index}`}
                      cx={x}
                      cy={y}
                      r={5}
                      fill={theme.color.purple}
                      opacity={0.55}
                    />
                  );
                })}
              </g>
              <rect
                x={1}
                y={1}
                width={Math.max(1, columns * cell * region - 2)}
                height={rows * cell - 2}
                fill="none"
                stroke={theme.color.purple}
                strokeWidth={3}
                rx={10}
              />
            </svg>
            <div
              style={{
                fontFamily: theme.font.body,
                fontSize: theme.size.small,
                color: theme.color.muted,
                marginTop: 8,
              }}
            >
              {visual.right.caption}
            </div>
          </Panel>
        </Reveal>
      </div>
      {visual.conclusion ? (
        <Reveal at={cueFrame(cues, visual.conclusion.cue, where)} fade={20}>
          <div
            style={{
              fontFamily: theme.font.body,
              fontSize: theme.size.body,
              color: theme.color.purple,
            }}
          >
            {visual.conclusion.text}
          </div>
        </Reveal>
      ) : null}
    </Stage>
  );
};

export const ConvergeKind: React.FC<KindProps<ConvergeVisual>> = ({
  visual,
  cues,
  where,
}) => (
  <Stage style={{ justifyContent: "center" }}>
    <Reveal>
      <Heading size={50}>{visual.heading}</Heading>
    </Reveal>
    <div style={{ display: "flex", gap: 26 }}>
      {visual.items.map((item) => (
        <Reveal
          key={item.label}
          at={cueFrame(cues, item.cue, where)}
          style={{ flex: 1 }}
        >
          <Panel style={{ padding: "24px 28px", minHeight: 124 }}>
            <div
              style={{
                fontFamily: theme.font.body,
                fontWeight: 650,
                fontSize: 34,
              }}
            >
              {item.label}
            </div>
            <div
              style={{
                fontFamily: theme.font.body,
                fontSize: theme.size.small,
                color: theme.color.muted,
                marginTop: 8,
              }}
            >
              {item.detail}
            </div>
          </Panel>
        </Reveal>
      ))}
    </div>
    <ConvergeArrows
      at={cueFrame(cues, visual.result.cue, where)}
      count={visual.items.length}
    />
    <Reveal at={cueFrame(cues, visual.result.cue, where)} fade={20}>
      <Panel tone="teal" style={{ padding: "24px 30px" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 22 }}>
          <span
            style={{
              fontFamily: theme.font.body,
              fontWeight: 700,
              fontSize: 36,
            }}
          >
            {visual.result.label}
          </span>
          <span
            style={{
              fontFamily: theme.font.body,
              fontSize: theme.size.small,
              color: theme.color.muted,
            }}
          >
            {visual.result.detail}
          </span>
        </div>
      </Panel>
    </Reveal>
  </Stage>
);

export const CompareKind: React.FC<KindProps<CompareVisual>> = ({
  visual,
  cues,
  where,
}) => {
  const side = (value: CompareVisual["left"], at: number | undefined) => (
    <Reveal at={at} style={{ flex: 1 }}>
      <Panel style={{ padding: "26px 30px", height: "100%" }}>
        <div
          style={{
            fontFamily: theme.font.body,
            fontWeight: 650,
            fontSize: 32,
            marginBottom: 14,
          }}
        >
          {value.title}
        </div>
        {value.code ? (
          <pre
            style={{
              fontFamily: theme.font.code,
              fontSize: 22,
              lineHeight: 1.5,
              margin: 0,
              whiteSpace: "pre-wrap",
              color: theme.color.code,
            }}
          >
            {value.code.code}
          </pre>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {(value.lines ?? []).map((line) => (
              <div
                key={line}
                style={{
                  fontFamily: theme.font.body,
                  fontSize: 29,
                  lineHeight: 1.35,
                  color: theme.color.ink,
                  display: "flex",
                  gap: 12,
                }}
              >
                <span style={{ color: theme.color.rule }}>—</span>
                <span>{line}</span>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </Reveal>
  );
  return (
    <Stage>
      <Reveal>
        <Heading size={50}>{visual.heading}</Heading>
      </Reveal>
      <div style={{ display: "flex", gap: 36, alignItems: "stretch" }}>
        {side(visual.left, cueFrame(cues, visual.leftCue, where))}
        {side(visual.right, cueFrame(cues, visual.rightCue, where))}
      </div>
      {visual.note ? (
        <NoteBar at={cueFrame(cues, visual.noteCue, where)}>
          {visual.note}
        </NoteBar>
      ) : null}
    </Stage>
  );
};

export const CardsKind: React.FC<KindProps<CardsVisual>> = ({
  visual,
  cues,
  where,
}) => (
  <Stage>
    <Reveal>
      <Heading size={50}>{visual.heading}</Heading>
    </Reveal>
    <div
      style={{ display: "flex", gap: 28, alignItems: "stretch", marginTop: 6 }}
    >
      {visual.cards.map((card) => (
        <Reveal
          key={card.title}
          at={cueFrame(cues, card.cue, where)}
          style={{ flex: 1 }}
        >
          <Panel
            style={{
              padding: "28px 30px",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <div
              style={{
                fontFamily: theme.font.body,
                fontWeight: 700,
                fontSize: 34,
              }}
            >
              {card.title}
            </div>
            <div
              style={{
                fontFamily: theme.font.body,
                fontSize: 27,
                lineHeight: 1.45,
                color: theme.color.ink,
                flex: 1,
              }}
            >
              {card.body}
            </div>
            {card.verdict ? (
              <div>
                <Chip
                  color={accentColor(card.accent)}
                  background={theme.color.paper}
                >
                  {card.verdict}
                </Chip>
              </div>
            ) : null}
          </Panel>
        </Reveal>
      ))}
    </div>
    {visual.note ? (
      <NoteBar at={cueFrame(cues, visual.noteCue, where)}>
        {visual.note}
      </NoteBar>
    ) : null}
  </Stage>
);

export const PipelineKind: React.FC<KindProps<PipelineVisual>> = ({
  visual,
  cues,
  where,
}) => (
  <Stage>
    <Reveal>
      <Heading size={50}>{visual.heading}</Heading>
    </Reveal>
    <div style={{ display: "flex", alignItems: "stretch" }}>
      {visual.stages.map((stage, index) => (
        <div
          key={`${stage.label}-${index}`}
          style={{ display: "flex", alignItems: "center" }}
        >
          <Reveal at={cueFrame(cues, stage.cue, where)}>
            <Panel style={{ padding: "22px 24px", width: 286, height: "100%" }}>
              <div
                style={{
                  fontFamily: theme.font.code,
                  fontSize: 26,
                  fontWeight: 600,
                }}
              >
                {stage.label}
              </div>
              <div
                style={{
                  fontFamily: theme.font.body,
                  fontSize: 21,
                  color: theme.color.muted,
                  marginTop: 6,
                }}
              >
                {stage.detail}
              </div>
            </Panel>
          </Reveal>
          {index < visual.stages.length - 1 ? (
            <Connector
              at={cueFrame(cues, visual.stages[index + 1]!.cue, where)}
            />
          ) : null}
        </div>
      ))}
    </div>
    {visual.verdict ? (
      <Reveal at={cueFrame(cues, visual.verdict.cue, where)}>
        <div style={{ display: "flex", gap: 16 }}>
          <Chip color={theme.color.teal} background={theme.color.tealSoft}>
            {visual.verdict.accept}
          </Chip>
          <Chip color={theme.color.rust} background={theme.color.rustSoft}>
            {visual.verdict.reject}
          </Chip>
        </div>
      </Reveal>
    ) : null}
    {visual.note ? (
      <NoteBar at={cueFrame(cues, visual.noteCue, where)}>
        {visual.note}
      </NoteBar>
    ) : null}
    {visual.afterword ? (
      <NoteBar at={cueFrame(cues, visual.afterwordCue, where)}>
        {visual.afterword}
      </NoteBar>
    ) : null}
  </Stage>
);

const Lowering: React.FC<{
  at?: number;
  from: { x: number; y: number };
  to: { x: number; y: number };
}> = ({ at, from, to }) => {
  const progress = useProgress(at, 18);
  return (
    <Arrow
      from={from}
      to={to}
      progress={progress}
      color={theme.color.purple}
      width={3}
    />
  );
};

const Optimise: React.FC<{
  at?: number;
  from: { x: number; y: number };
  to: { x: number; y: number };
}> = ({ at, from, to }) => {
  const progress = useProgress(at, 20);
  return (
    <Arrow
      from={from}
      to={to}
      progress={progress}
      color={theme.color.teal}
      width={4}
    />
  );
};

export const StaircaseKind: React.FC<KindProps<StaircaseVisual>> = ({
  visual,
  cues,
  where,
}) => {
  const { durationInFrames } = useVideoConfig();
  const camera = useCamera(
    { scale: 1, x: 0, y: 0 },
    { scale: 1.045, x: -40, y: -22 },
    durationInFrames,
  );
  const levels = visual.levels;
  const baseX = 120;
  const stepX = 74;
  const topY = 88;
  const stepY = 96;
  const width = 1080;
  const levelsAt = cueFrame(cues, visual.levelsCue, where) ?? 0;

  return (
    <Stage style={{ justifyContent: "flex-start", paddingTop: 128 }}>
      <Reveal>
        <Heading size={48}>{visual.heading}</Heading>
      </Reveal>
      <svg viewBox="0 0 1700 700" style={{ width: "100%", marginTop: 10 }}>
        <g transform={camera}>
          {levels.map((level, index) => {
            const x = baseX + index * stepX;
            const y = topY + index * stepY;
            return (
              <SvgReveal key={level.name} at={levelsAt + index * 6}>
                <g>
                  <rect
                    x={x}
                    y={y}
                    width={width}
                    height={64}
                    rx={8}
                    fill="#fffdf8"
                    stroke={theme.color.rule}
                  />
                  <text
                    x={x + 24}
                    y={y + 40}
                    fontFamily={theme.font.body}
                    fontSize={30}
                    fontWeight={650}
                    fill={theme.color.ink}
                  >
                    {level.name}
                  </text>
                  <text
                    x={x + 300}
                    y={y + 40}
                    fontFamily={theme.font.body}
                    fontSize={21}
                    fill={theme.color.muted}
                  >
                    {level.detail}
                  </text>
                </g>
              </SvgReveal>
            );
          })}
          {levels.slice(0, -1).map((level, index) => {
            const x = baseX + index * stepX;
            const y = topY + index * stepY;
            const lowerAt = cueFrame(cues, visual.lowerCue, where);
            return (
              <g key={`lower-${level.name}`}>
                <Lowering
                  at={lowerAt === undefined ? undefined : lowerAt + index * 8}
                  from={{ x: x + width - 30, y: y + 66 }}
                  to={{ x: x + width + stepX - 30, y: y + stepY - 4 }}
                />
                <SvgReveal at={cueFrame(cues, visual.refineCue, where)}>
                  <text
                    x={x + width - 96}
                    y={y + stepY / 2 + 32}
                    fontFamily={theme.font.body}
                    fontSize={18}
                    fill={theme.color.purple}
                    letterSpacing="0.08em"
                  >
                    refine
                  </text>
                </SvgReveal>
              </g>
            );
          })}
          <Optimise
            at={cueFrame(cues, visual.optimiseCue, where)}
            from={{ x: baseX + 250, y: topY - 22 }}
            to={{ x: baseX + 560, y: topY - 22 }}
          />
          <SvgReveal at={cueFrame(cues, visual.optimiseCue, where)}>
            <text
              x={baseX + 250}
              y={topY - 36}
              fontFamily={theme.font.body}
              fontSize={20}
              fill={theme.color.teal}
              letterSpacing="0.1em"
            >
              optimise within a level
            </text>
          </SvgReveal>
        </g>
      </svg>
      {visual.proposed ? (
        <div
          style={{
            position: "absolute",
            right: theme.space.margin,
            bottom: 118,
          }}
        >
          <Reveal at={cueFrame(cues, visual.proposed.cue, where)}>
            <Chip color={theme.color.rust} background={theme.color.rustSoft}>
              {visual.proposed.text}
            </Chip>
          </Reveal>
        </div>
      ) : null}
    </Stage>
  );
};

export const StackKind: React.FC<KindProps<StackVisual>> = ({
  visual,
  cues,
  where,
}) => (
  <Stage>
    <Reveal>
      <Heading size={48}>{visual.heading}</Heading>
    </Reveal>
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 10,
        marginTop: 6,
      }}
    >
      {visual.layers.map((layer, index) => {
        const accent = accentColor(layer.accent);
        return (
          <Reveal
            key={`${layer.label}-${index}`}
            at={cueFrame(cues, layer.cue, where)}
          >
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 20,
                background:
                  layer.accent === "rust" ? theme.color.rustSoft : "#fffdf8",
                border: `1px solid ${layer.accent === "rust" ? accent : theme.color.rule}`,
                borderLeft: `5px solid ${accent}`,
                borderRadius: 8,
                padding: "16px 22px",
              }}
            >
              <span
                style={{
                  fontFamily: theme.font.body,
                  fontSize: 29,
                  fontWeight: 600,
                  minWidth: 380,
                }}
              >
                {layer.label}
              </span>
              <span
                style={{
                  fontFamily: theme.font.body,
                  fontSize: 23,
                  color:
                    layer.accent === "rust"
                      ? theme.color.rust
                      : theme.color.muted,
                }}
              >
                {layer.detail}
              </span>
            </div>
          </Reveal>
        );
      })}
    </div>
    <Reveal at={cueFrame(cues, visual.bottom.cue, where)} fade={20}>
      <div
        style={{
          marginTop: 8,
          border: `2px dashed ${theme.color.rust}`,
          borderRadius: 8,
          padding: "18px 22px",
          display: "flex",
          alignItems: "center",
          gap: 20,
        }}
      >
        <Eyebrow color={theme.color.rust}>{visual.bottom.label}</Eyebrow>
        <span
          style={{
            fontFamily: theme.font.body,
            fontSize: 26,
            color: theme.color.rust,
          }}
        >
          {visual.bottom.detail}
        </span>
      </div>
    </Reveal>
    {visual.note ? (
      <NoteBar at={cueFrame(cues, visual.noteCue, where)}>
        {visual.note}
      </NoteBar>
    ) : null}
  </Stage>
);
