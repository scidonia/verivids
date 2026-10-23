import { Composition } from "remotion";
import { Episode } from "./Episode";
import timingJson from "../generated/timing.json";
import type { Timing } from "./spec";

// Written by `npm run timing`, which validates the storyboard against the
// recorded audio. The JSON cannot carry the discriminated `Visual` union, so
// the boundary type is restored in one place here.
const timing = timingJson as unknown as Timing;

export const RemotionRoot: React.FC = () => (
  <>
    {timing.episodes.map((episode) => (
      <Composition
        key={episode.id}
        id={episode.id}
        component={Episode}
        durationInFrames={episode.durationInFrames}
        fps={timing.fps}
        width={1920}
        height={1080}
        defaultProps={{ episode, series: timing.series }}
      />
    ))}
  </>
);
