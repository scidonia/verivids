import { Config } from "@remotion/cli/config";

// The Chromium is supplied by the nix dev shell rather than downloaded by
// Remotion, so a render never reaches the network for a browser.
if (process.env.REMOTION_BROWSER_EXECUTABLE) {
  Config.setBrowserExecutable(process.env.REMOTION_BROWSER_EXECUTABLE);
}

Config.setEntryPoint("src/index.ts");
Config.setVideoImageFormat("png");
Config.setStillImageFormat("png");
Config.setConcurrency(Number(process.env.REMOTION_CONCURRENCY ?? 4));
Config.setChromiumOpenGlRenderer("swangle");
Config.setLogLevel("info");
