import { Img, staticFile } from "remotion";
import { theme } from "../theme";

/**
 * The company lockup: the wordmark, then the legal suffix at its baseline.
 * Used in the frame chrome on every scene and at full size on the opener, so
 * there is one definition of how the name is set.
 */
export const BrandMark: React.FC<{ height: number; muted?: boolean }> = ({
  height,
  muted = true,
}) => (
  <div style={{ display: "flex", alignItems: "baseline", gap: height * 0.3 }}>
    <Img
      src={staticFile("brand/scidonia-wordmark.svg")}
      style={{ height, width: "auto", display: "block" }}
    />
    <span
      style={{
        fontFamily: theme.font.body,
        fontSize: Math.max(10, Math.round(height * 0.4)),
        fontWeight: 600,
        letterSpacing: "0.24em",
        textTransform: "uppercase",
        color: muted ? theme.color.muted : theme.color.ink,
        lineHeight: 1,
      }}
    >
      Limited
    </span>
  </div>
);
