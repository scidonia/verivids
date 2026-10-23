import { bundle } from "@remotion/bundler";
import { join } from "node:path";
import { ROOT } from "./lib";

/**
 * The Chromium comes from the nix shell. Remotion would otherwise download
 * one on first render, which would make a render depend on the network.
 */
export const browserExecutable = process.env.REMOTION_BROWSER_EXECUTABLE;

export const concurrency = Number(process.env.REMOTION_CONCURRENCY ?? 4);

export async function bundleProject(): Promise<string> {
  return bundle({
    entryPoint: join(ROOT, "src", "index.ts"),
    onProgress: (percent) => {
      if (percent === 0 || percent === 100) console.log(`bundle ${percent}%`);
    },
  });
}
