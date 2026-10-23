import { AbsoluteFill } from "remotion";
import { theme } from "./theme";

export const Probe: React.FC = () => (
  <AbsoluteFill
    style={{
      background: theme.color.paper,
      color: theme.color.ink,
      fontFamily: theme.font.body,
      alignItems: "center",
      justifyContent: "center",
      fontSize: 96,
    }}
  >
    <div>
      verivids <span style={{ color: theme.color.teal }}>probe</span>
    </div>
    <div style={{ fontFamily: theme.font.code, fontSize: 48 }}>
      theorem le_maxOf_left
    </div>
  </AbsoluteFill>
);
