import React from "react";
import { Composition } from "remotion";
import { PlayReel } from "./PlayReel";
import { NightReel } from "./NightReel";
import { nightTotalFrames } from "./nightTimeline";
import { DreamReel } from "./DreamReel";
import { dreamTotalFrames } from "./dreamTimeline";
import { FPS, totalFrames } from "./timeline";

export const Root: React.FC = () => (
  <>
    <Composition id="PlayReel" component={PlayReel} durationInFrames={totalFrames()} fps={FPS} width={1080} height={1920} />
    <Composition id="NightReel" component={NightReel} durationInFrames={nightTotalFrames()} fps={FPS} width={1080} height={1920} />
    {/* A/B: same cut, only the hook caption differs — A → Instagram, B → Threads */}
    <Composition id="DreamReelA" component={DreamReel} defaultProps={{ variant: "A" as const }} durationInFrames={dreamTotalFrames()} fps={FPS} width={1080} height={1920} />
    <Composition id="DreamReelB" component={DreamReel} defaultProps={{ variant: "B" as const }} durationInFrames={dreamTotalFrames()} fps={FPS} width={1080} height={1920} />
  </>
);
