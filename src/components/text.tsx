import type {
  BrandVisual,
  ClaimVisual,
  ClosingVisual,
  TableVisual,
  TitleVisual,
} from "../spec";
import { theme } from "../theme";
import type { KindProps } from "./kind";
import { BrandMark } from "./brand";
import { cueFrame, Eyebrow, Heading, Reveal, Stage } from "./primitives";

const SERIF = '"Inter", system-ui, sans-serif';

export const TitleKind: React.FC<KindProps<TitleVisual>> = ({
  visual,
  cues,
  where,
}) => (
  <Stage style={{ justifyContent: "center", gap: 26 }}>
    {visual.kicker ? (
      <Reveal>
        <Eyebrow color={theme.color.teal}>{visual.kicker}</Eyebrow>
      </Reveal>
    ) : null}
    <Reveal>
      <div
        style={{
          fontFamily: SERIF,
          fontWeight: 700,
          fontSize: theme.size.title,
          lineHeight: 1.02,
          letterSpacing: "-0.035em",
        }}
      >
        {visual.title}
      </div>
    </Reveal>
    <Reveal at={cueFrame(cues, visual.subtitleCue, where)} fade={20}>
      <div
        style={{
          fontFamily: theme.font.body,
          fontSize: theme.size.subtitle,
          lineHeight: 1.3,
          color: theme.color.muted,
          maxWidth: 1250,
        }}
      >
        {visual.subtitle}
      </div>
    </Reveal>
    <Reveal at={cueFrame(cues, visual.subtitleCue, where)} fade={30} rise={0}>
      <div
        style={{
          height: 6,
          width: 180,
          background: theme.color.teal,
          marginTop: 18,
        }}
      />
    </Reveal>
  </Stage>
);

export const BrandKind: React.FC<KindProps<BrandVisual>> = ({
  visual,
  cues,
  where,
}) => (
  <Stage style={{ justifyContent: "center", gap: 30 }}>
    <Reveal>
      <BrandMark height={visual.wordmark} muted={false} />
    </Reveal>
    <Reveal fade={24} rise={0}>
      <div
        style={{
          height: 5,
          width: 190,
          background: theme.color.teal,
          margin: "10px 0 6px",
        }}
      />
    </Reveal>
    <Reveal at={cueFrame(cues, visual.titleCue, where)} fade={20}>
      <div
        style={{
          fontFamily: theme.font.body,
          fontWeight: 650,
          fontSize: 88,
          lineHeight: 1.02,
          letterSpacing: "-0.03em",
        }}
      >
        {visual.title}
      </div>
    </Reveal>
    {visual.subtitle ? (
      <Reveal at={cueFrame(cues, visual.subtitleCue, where)} fade={20}>
        <div
          style={{
            fontFamily: theme.font.body,
            fontSize: theme.size.subtitle,
            color: theme.color.muted,
          }}
        >
          {visual.subtitle}
        </div>
      </Reveal>
    ) : null}
  </Stage>
);

export const ClosingKind: React.FC<KindProps<ClosingVisual>> = ({
  visual,
  cues,
  where,
}) => (
  <Stage style={{ justifyContent: "center", gap: 40 }}>
    <Reveal at={cueFrame(cues, visual.cue, where)} fade={18}>
      <div
        style={{
          fontFamily: theme.font.body,
          fontWeight: 650,
          fontSize: 76,
          lineHeight: 1.1,
          letterSpacing: "-0.025em",
          maxWidth: 1400,
        }}
      >
        {visual.text}
      </div>
    </Reveal>
    {visual.next ? (
      <Reveal at={(cueFrame(cues, visual.cue, where) ?? 0) + 14} fade={18}>
        <div
          style={{
            fontFamily: theme.font.body,
            fontSize: theme.size.body,
            color: theme.color.purple,
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          <span style={{ fontSize: 28 }}>→</span>
          {visual.next}
        </div>
      </Reveal>
    ) : null}
  </Stage>
);

export const ClaimKind: React.FC<KindProps<ClaimVisual>> = ({
  visual,
  cues,
  where,
}) => (
  <Stage style={{ justifyContent: "center" }}>
    {visual.eyebrow ? (
      <Reveal>
        <Eyebrow color={theme.color.teal}>{visual.eyebrow}</Eyebrow>
      </Reveal>
    ) : null}
    <Reveal>
      <Heading size={54}>{visual.heading}</Heading>
    </Reveal>
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 20,
        marginTop: 10,
      }}
    >
      {(visual.points ?? []).map((point, index) => (
        <Reveal key={point.text} at={cueFrame(cues, point.cue, where)}>
          <div
            style={{
              display: "flex",
              gap: 26,
              alignItems: "flex-start",
              fontFamily: theme.font.body,
              fontSize: theme.size.body,
              lineHeight: 1.35,
              color:
                point.accent === "rust" ? theme.color.rust : theme.color.ink,
            }}
          >
            <span
              style={{
                fontFamily: theme.font.code,
                fontSize: 22,
                color:
                  point.accent === "rust" ? theme.color.rust : theme.color.teal,
                paddingTop: 8,
                minWidth: 42,
              }}
            >
              {String(index + 1).padStart(2, "0")}
            </span>
            <span style={{ maxWidth: 1300 }}>{point.text}</span>
          </div>
        </Reveal>
      ))}
    </div>
    {visual.emphasis ? (
      <Reveal at={cueFrame(cues, visual.emphasis.cue, where)} fade={20}>
        <div
          style={{
            marginTop: 18,
            background: theme.color.ink,
            color: theme.color.paper,
            padding: "22px 28px",
            borderRadius: theme.space.radius,
            fontFamily: theme.font.body,
            fontSize: 32,
            fontWeight: 550,
            maxWidth: 1420,
          }}
        >
          {visual.emphasis.text}
        </div>
      </Reveal>
    ) : null}
  </Stage>
);

export const TableKind: React.FC<KindProps<TableVisual>> = ({
  visual,
  cues,
  where,
}) => (
  <Stage style={{ justifyContent: "center" }}>
    <Reveal>
      <Heading size={50}>{visual.heading}</Heading>
    </Reveal>
    <div style={{ marginTop: 16, maxWidth: 1420 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 24,
          paddingBottom: 12,
          borderBottom: `2px solid ${theme.color.ink}`,
        }}
      >
        {visual.columns.map((column) => (
          <div
            key={column}
            style={{
              fontFamily: theme.font.body,
              fontSize: theme.size.fine,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: theme.color.muted,
            }}
          >
            {column}
          </div>
        ))}
      </div>
      {visual.rows.map((row) => (
        <Reveal key={row.left} at={cueFrame(cues, row.cue, where)}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 24,
              padding: "16px 0",
              borderBottom: `1px solid ${theme.color.faint}`,
              fontFamily: theme.font.body,
              fontSize: 31,
              alignItems: "baseline",
            }}
          >
            <div style={{ fontFamily: theme.font.code, fontSize: 29 }}>
              {row.left}
            </div>
            <div style={{ color: theme.color.muted }}>{row.right}</div>
          </div>
        </Reveal>
      ))}
    </div>
  </Stage>
);
