import { useCurrentFrame } from "remotion";
import type { CodeVisual, LineRange } from "../spec";
import { theme } from "../theme";
import type { KindProps } from "./kind";
import { cueFrame, Heading, Reveal, Stage } from "./primitives";

const KEYWORDS: Record<string, true> = Object.fromEntries(
  [
    "def",
    "theorem",
    "lemma",
    "example",
    "inductive",
    "structure",
    "class",
    "instance",
    "where",
    "match",
    "with",
    "by",
    "fun",
    "let",
    "in",
    "if",
    "then",
    "else",
    "do",
    "import",
    "namespace",
    "open",
    "variable",
    "opaque",
    "abbrev",
    "deriving",
    "mutual",
    "partial",
    "unsafe",
    "private",
    "protected",
    "section",
    "end",
    "have",
    "show",
    "from",
  ].map((word) => [word, true as const]),
);

interface Token {
  text: string;
  color: string;
}

function tokenize(line: string): Token[] {
  const commentAt = line.indexOf("--");
  const code = commentAt === -1 ? line : line.slice(0, commentAt);
  const comment = commentAt === -1 ? "" : line.slice(commentAt);
  const tokens: Token[] = [];
  const pattern = /("[^"]*"|'[^']*'|\b[A-Za-z_][A-Za-z0-9_']*\b|\d+)/g;
  let last = 0;
  for (const match of code.matchAll(pattern)) {
    const [text] = match;
    const index = match.index ?? 0;
    if (index > last)
      tokens.push({
        text: code.slice(last, index),
        color: theme.color.codeInk,
      });
    if (text.startsWith('"') || text.startsWith("'")) {
      tokens.push({ text, color: "#f0c48a" });
    } else if (/^\d/.test(text)) {
      tokens.push({ text, color: "#7dd3c0" });
    } else if (KEYWORDS[text]) {
      tokens.push({ text, color: "#c4b5fd" });
    } else {
      tokens.push({ text, color: theme.color.codeInk });
    }
    last = index + text.length;
  }
  if (last < code.length)
    tokens.push({ text: code.slice(last), color: theme.color.codeInk });
  if (comment) tokens.push({ text: comment, color: "#8b93a1" });
  return tokens;
}

function lineCue(
  ranges: LineRange[] | undefined,
  lineNumber: number,
): string | undefined {
  let earliest: string | undefined;
  for (const range of ranges ?? []) {
    const [start, end] = range.lines;
    if (lineNumber >= start && lineNumber <= end) earliest = range.cue;
  }
  return earliest;
}

export const CodeKind: React.FC<KindProps<CodeVisual>> = ({
  visual,
  cues,
  where,
}) => {
  const frame = useCurrentFrame();
  const lines = visual.code.replace(/\n$/, "").split("\n");
  const hasGoals = (visual.goals ?? []).length > 0;

  const activeGoal = (visual.goals ?? [])
    .map((goal) => ({ goal, at: cueFrame(cues, goal.cue, where) ?? 0 }))
    .filter((entry) => frame >= entry.at)
    .at(-1);

  return (
    <Stage>
      <Reveal>
        <Heading size={46}>{visual.heading}</Heading>
      </Reveal>
      <div
        style={{
          display: "flex",
          gap: 28,
          alignItems: "stretch",
          marginTop: 4,
        }}
      >
        <Reveal style={{ flex: hasGoals ? 1.55 : 1 }}>
          <div
            style={{
              background: theme.color.code,
              borderRadius: theme.space.radius,
              padding: "26px 30px",
              minHeight: 200,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                fontFamily: theme.font.code,
                fontSize: 26,
                lineHeight: 1.55,
              }}
            >
              {lines.map((line, index) => {
                const cue = lineCue(visual.reveal, index + 1);
                const visible =
                  cue === undefined ||
                  frame >= (cueFrame(cues, cue, where) ?? 0);
                return (
                  <div
                    key={index}
                    style={{
                      display: "flex",
                      gap: 22,
                      opacity: visible ? 1 : 0,
                      transition: undefined,
                    }}
                  >
                    <span
                      style={{
                        color: "#5c6470",
                        minWidth: 34,
                        textAlign: "right",
                        userSelect: "none",
                      }}
                    >
                      {index + 1}
                    </span>
                    <span style={{ whiteSpace: "pre-wrap" }}>
                      {tokenize(line).map((token, tokenIndex) => (
                        <span key={tokenIndex} style={{ color: token.color }}>
                          {token.text}
                        </span>
                      ))}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </Reveal>

        {hasGoals ? (
          <Reveal style={{ flex: 1 }}>
            <div
              style={{
                height: "100%",
                background: "#fffdf8",
                border: `1px solid ${theme.color.rule}`,
                borderRadius: theme.space.radius,
                padding: "22px 24px",
              }}
            >
              <div
                style={{
                  fontFamily: theme.font.body,
                  fontSize: 18,
                  letterSpacing: "0.13em",
                  textTransform: "uppercase",
                  color: activeGoal ? theme.color.purple : theme.color.muted,
                  marginBottom: 14,
                }}
              >
                {activeGoal ? activeGoal.goal.label : "goal state"}
              </div>
              <div
                style={{
                  fontFamily: theme.font.code,
                  fontSize: 22,
                  lineHeight: 1.6,
                  color: theme.color.code,
                }}
              >
                {activeGoal
                  ? activeGoal.goal.text
                      .replace(/\n$/, "")
                      .split("\n")
                      .map((line, index) => (
                        <div
                          key={index}
                          style={{
                            color: line.startsWith("⊢")
                              ? theme.color.purple
                              : theme.color.code,
                          }}
                        >
                          {line}
                        </div>
                      ))
                  : "…"}
              </div>
            </div>
          </Reveal>
        ) : null}
      </div>
      {visual.caption ? (
        <Reveal at={cueFrame(cues, visual.caption.cue, where)}>
          <div
            style={{
              fontFamily: theme.font.body,
              fontSize: theme.size.small,
              color: theme.color.muted,
            }}
          >
            {visual.caption.text}
          </div>
        </Reveal>
      ) : null}
    </Stage>
  );
};
