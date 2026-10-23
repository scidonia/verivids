import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import type { Visual } from "../spec";
import { theme } from "../theme";
import { BrandMark } from "./brand";
import { CodeKind } from "./code";
import {
  CardsKind,
  CompareKind,
  ConvergeKind,
  PipelineKind,
  QuantifyKind,
  ShapesKind,
  StackKind,
  StaircaseKind,
} from "./diagram";
import type { KindProps } from "./kind";
import {
  BrandKind,
  ClaimKind,
  ClosingKind,
  TableKind,
  TitleKind,
} from "./text";

function SceneView({
  visual,
  cues,
  where,
}: {
  visual: Visual;
  cues: Record<string, number>;
  where: string;
}): React.ReactElement {
  switch (visual.kind) {
    case "title":
      return <TitleKind visual={visual} cues={cues} where={where} />;
    case "brand":
      return <BrandKind visual={visual} cues={cues} where={where} />;
    case "closing":
      return <ClosingKind visual={visual} cues={cues} where={where} />;
    case "claim":
      return <ClaimKind visual={visual} cues={cues} where={where} />;
    case "quantify":
      return <QuantifyKind visual={visual} cues={cues} where={where} />;
    case "converge":
      return <ConvergeKind visual={visual} cues={cues} where={where} />;
    case "compare":
      return <CompareKind visual={visual} cues={cues} where={where} />;
    case "cards":
      return <CardsKind visual={visual} cues={cues} where={where} />;
    case "table":
      return <TableKind visual={visual} cues={cues} where={where} />;
    case "pipeline":
      return <PipelineKind visual={visual} cues={cues} where={where} />;
    case "code":
      return <CodeKind visual={visual} cues={cues} where={where} />;
    case "staircase":
      return <StaircaseKind visual={visual} cues={cues} where={where} />;
    case "shapes":
      return <ShapesKind visual={visual} cues={cues} where={where} />;
    case "stack":
      return <StackKind visual={visual} cues={cues} where={where} />;
    default: {
      const unreachable: never = visual;
      throw new Error(`unknown visual kind: ${JSON.stringify(unreachable)}`);
    }
  }
}

export const Scene: React.FC<{
  series: string;
  episodeTitle: string;
  episodeLabel: string;
  index: number;
  count: number;
  visual: Visual;
  cues: Record<string, number>;
  durationInFrames: number;
  where: string;
}> = ({
  series,
  episodeTitle,
  episodeLabel,
  index,
  count,
  visual,
  cues,
  durationInFrames,
  where,
}) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(
    frame,
    [0, 6, Math.max(6, durationInFrames - 6), durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  return (
    <AbsoluteFill style={{ opacity }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(1200px 700px at 18% 12%, #fffefa 0%, ${theme.color.paper} 60%)`,
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 54,
            left: theme.space.margin,
            right: theme.space.margin,
            display: "flex",
            justifyContent: "space-between",
            fontFamily: theme.font.body,
            fontSize: 19,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: theme.color.muted,
          }}
        >
          {visual.kind === "brand" ? <span /> : <BrandMark height={30} />}
          <span>{episodeTitle}</span>
        </div>
        <SceneView visual={visual} cues={cues} where={where} />
        <div
          style={{
            position: "absolute",
            bottom: 50,
            left: theme.space.margin,
            right: theme.space.margin,
            display: "flex",
            justifyContent: "space-between",
            fontFamily: theme.font.body,
            fontSize: 19,
            letterSpacing: "0.12em",
            color: theme.color.muted,
          }}
        >
          <span>{episodeLabel}</span>
          <span>
            {String(index + 1).padStart(2, "0")} /{" "}
            {String(count).padStart(2, "0")}
          </span>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
