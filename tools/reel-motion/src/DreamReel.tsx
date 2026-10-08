import React from "react";
import { AbsoluteFill, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Audio } from "@remotion/media";
import { BrandBug, Caption, EndCard, Flash, GameClip } from "./parts";
import { DREAM_CUTS, DREAM_END_BEATS, DREAM_HOOK, DREAM_HOOK_COPY, DREAM_MUSIC } from "./dreamTimeline";
import { beats } from "./timeline";

type Block = { from: number; len: number; node: React.ReactNode; bug?: boolean };
export type DreamReelProps = { variant: "A" | "B" };

/** Teaser veil: the mirror village is a mock-up, so it only shows through a dark, slowly clearing vignette */
const Veil: React.FC = () => {
  const f = useCurrentFrame();
  const clear = interpolate(f, [0, 40], [0.85, 0.35], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{
      background: `radial-gradient(ellipse at 50% 42%, rgba(8,14,34,${clear * 0.4}) 0%, rgba(8,14,34,${clear}) 62%, rgba(4,8,20,.95) 100%)`,
    }} />
  );
};

/** Hook (Flow bear + moon carriage) → moon ride → island → shards → wake → mirror teaser → end */
function buildBlocks(variant: DreamReelProps["variant"]): Block[] {
  const blocks: Block[] = [];
  let t = 0;
  const push = (len: number, node: React.ReactNode, bug = false) => {
    blocks.push({ from: t, len, node, bug });
    t += len;
  };

  // The hook clip runs continuously under both captions — only the caption changes on the beat
  const [h1, h2] = DREAM_HOOK_COPY[variant];
  const hookLen = DREAM_HOOK.beats.reduce((s, b) => s + beats(b), 0);
  const firstLen = beats(DREAM_HOOK.beats[0]);
  push(hookLen, (
    <>
      {/* Flow returned 16:9 — sleeping bear sits left, the carriage drifts in on the right: pan across on the caption change */}
      <GameClip src={DREAM_HOOK.src} startSec={DREAM_HOOK.startSec} rate={DREAM_HOOK.rate} dir={1}
        pan={{ frames: [0, firstLen - 8, firstLen + 14, hookLen], x: DREAM_HOOK.panX }} />
      <Sequence durationInFrames={firstLen}>
        <Caption word={h1.word} line={h1.line} color={DREAM_HOOK.color} dir={1} top={DREAM_HOOK.captionTop} />
      </Sequence>
      <Sequence from={firstLen}>
        <Caption word={h2.word} line={h2.line} color={DREAM_HOOK.color} dir={-1} top={DREAM_HOOK.captionTop} />
      </Sequence>
      <Flash frames={8} max={1} />
    </>
  ), true);

  DREAM_CUTS.forEach((c, i) => {
    const dir = i % 2 ? 1 : -1;
    push(beats(c.beats), (
      <>
        <GameClip src={c.src} startSec={c.startSec} dir={dir} rate={c.rate} zoom={c.zoom} origin={c.origin} />
        {c.dim && <Veil />}
        <Caption word={c.word} line={c.line} color={c.color} dir={dir} top={c.captionTop} />
        <Flash />
      </>
    ), true);
  });

  push(beats(DREAM_END_BEATS), (<><EndCard /><Flash frames={8} max={1} /></>));
  return blocks;
}

export const DreamReel: React.FC<DreamReelProps> = ({ variant }) => {
  const { durationInFrames, fps } = useVideoConfig();
  const blocks = buildBlocks(variant);
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
        src={staticFile(DREAM_MUSIC.src)}
        trimBefore={Math.round(DREAM_MUSIC.trimSec * fps)}
        volume={(f) => interpolate(f, [0, 3, durationInFrames - 30, durationInFrames], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}
      />
    </AbsoluteFill>
  );
};
