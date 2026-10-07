import React from "react";
import { AbsoluteFill, Sequence, interpolate, staticFile, useVideoConfig } from "remotion";
import { Audio } from "@remotion/media";
import { BrandBug, Caption, EndCard, Flash, GameClip } from "./parts";
import { NIGHT_CUTS, NIGHT_END_BEATS, NIGHT_HOOK, NIGHT_MUSIC } from "./nightTimeline";
import { beats } from "./timeline";

type Block = { from: number; len: number; node: React.ReactNode; bug?: boolean };

/** Hook (Flow bear) → field → duel → win, back-to-back on the beat grid */
function buildBlocks(): Block[] {
  const blocks: Block[] = [];
  let t = 0;
  const push = (len: number, node: React.ReactNode, bug = false) => {
    blocks.push({ from: t, len, node, bug });
    t += len;
  };

  push(beats(NIGHT_HOOK.beats), (
    <>
      <GameClip src={NIGHT_HOOK.src} startSec={NIGHT_HOOK.startSec} dir={1} />
      <Caption word={NIGHT_HOOK.word} line={NIGHT_HOOK.line} color={NIGHT_HOOK.color} dir={1} top={NIGHT_HOOK.captionTop} />
      <Flash frames={8} max={1} />
    </>
  ), true);

  NIGHT_CUTS.forEach((c, i) => {
    const dir = i % 2 ? 1 : -1; // hook went right, so the first cut whips back from the left
    push(beats(c.beats), (
      <>
        <GameClip src={c.src} startSec={c.startSec} dir={dir} rate={c.rate} zoom={c.zoom} origin={c.origin} />
        <Caption word={c.word} line={c.line} color={c.color} dir={dir} top={c.captionTop} />
        <Flash />
      </>
    ), true);
  });

  push(beats(NIGHT_END_BEATS), (<><EndCard /><Flash frames={8} max={1} /></>));
  return blocks;
}

export const NightReel: React.FC = () => {
  const { durationInFrames, fps } = useVideoConfig();
  const blocks = buildBlocks();
  const bugBlocks = blocks.filter((b) => b.bug);
  const bugFrom = bugBlocks[0].from;
  const bugEnd = bugBlocks[bugBlocks.length - 1].from + bugBlocks[bugBlocks.length - 1].len;
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {blocks.map((b, i) => (
        <Sequence key={i} from={b.from} durationInFrames={b.len} premountFor={fps}>
          {b.node}
        </Sequence>
      ))}
      <Sequence from={bugFrom} durationInFrames={bugEnd - bugFrom}>
        <BrandBug />
      </Sequence>
      <Audio
        src={staticFile(NIGHT_MUSIC.src)}
        trimBefore={Math.round(NIGHT_MUSIC.trimSec * fps)}
        volume={(f) => interpolate(f, [0, 3, durationInFrames - 30, durationInFrames], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}
      />
    </AbsoluteFill>
  );
};
