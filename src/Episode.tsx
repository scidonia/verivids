import { useEffect, useState } from "react";
import {
  AbsoluteFill,
  Audio,
  continueRender,
  delayRender,
  Series,
  staticFile,
} from "remotion";
import type { EpisodeTiming } from "./spec";
import { Scene } from "./components/scene";

/** Hold the first frame until the bundled fonts are actually ready. */
function useFontsReady(): void {
  const [handle] = useState(() => delayRender("Loading fonts"));
  useEffect(() => {
    document.fonts.ready.then(() => continueRender(handle));
  }, [handle]);
}

export const Episode: React.FC<{ episode: EpisodeTiming; series: string }> = ({
  episode,
  series,
}) => {
  useFontsReady();
  const episodeLabel = episode.standalone
    ? "Companion film"
    : `Episode ${Number.parseInt(episode.id.slice(0, 2), 10)}`;

  return (
    <AbsoluteFill>
      <Series>
        {episode.scenes.map((scene, index) => (
          <Series.Sequence
            key={scene.id}
            durationInFrames={scene.durationInFrames}
          >
            <Scene
              series={series}
              episodeTitle={episode.title}
              episodeLabel={episodeLabel}
              index={index}
              count={episode.scenes.length}
              visual={scene.visual}
              cues={scene.cues}
              durationInFrames={scene.durationInFrames}
              where={`${episode.id}/${scene.id}`}
            />
            {scene.audio ? <Audio src={staticFile(scene.audio)} /> : null}
          </Series.Sequence>
        ))}
      </Series>
    </AbsoluteFill>
  );
};
