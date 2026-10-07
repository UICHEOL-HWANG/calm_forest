import React from "react";
import { Composition } from "remotion";
import { PlayReel } from "./PlayReel";
import { NightReel } from "./NightReel";
import { nightTotalFrames } from "./nightTimeline";
import { FPS, totalFrames } from "./timeline";

export const Root: React.FC = () => (
  <>
    <Composition id="PlayReel" component={PlayReel} durationInFrames={totalFrames()} fps={FPS} width={1080} height={1920} />
    <Composition id="NightReel" component={NightReel} durationInFrames={nightTotalFrames()} fps={FPS} width={1080} height={1920} />
  </>
);
