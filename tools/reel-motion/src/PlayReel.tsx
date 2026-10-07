import React from "react";
import { AbsoluteFill, Sequence, interpolate, staticFile, useVideoConfig } from "remotion";
import { Audio } from "@remotion/media";
import { BrandBug, Caption, EndCard, Flash, GameClip, HookBeat, StillSteps, TitleText } from "./parts";
import { CUTS, END_BEATS, HOOK, MUSIC_OFFSET_SEC, TITLE, beats } from "./timeline";

type Block = { from: number; len: number; node: React.ReactNode; bug?: boolean };

/** Lay every block back-to-back on the beat grid */
function buildBlocks(): Block[] {
  const blocks: Block[] = [];
  let t = 0;
  const push = (len: number, node: React.ReactNode, bug = false) => {
    blocks.push({ from: t, len, node, bug });
    t += len;
  };

  HOOK.forEach((w, i) => push(beats(1), <HookBeat w={w} dir={i % 2 ? -1 : 1} />));
  // one extra beat before the title lands
  push(beats(1), <HookBeat w={{ text: "그리고", bg: "#fff", accent: "#e8e0d0" }} dir={1} />);

  push(beats(TITLE.beats), (
    <>
      <GameClip src={TITLE.src} startSec={TITLE.startSec} dir={1} />
      <TitleText small={TITLE.small} big={TITLE.big} />
      <Flash frames={8} max={1} />
    </>
  ));

  CUTS.forEach((c, i) => {
    const dir = i % 2 ? -1 : 1;
    const len = beats(c.beats);
    push(len, (
      <>
        {c.kind === "clip"
          ? <GameClip src={c.src} startSec={c.startSec} dir={dir} rate={c.rate} />
          : <StillSteps srcs={c.srcs} crops={c.crops} stepFrames={Math.ceil(len / c.srcs.length)} cardScale={c.cardScale} cardTop={c.cardTop} />}
        <Caption word={c.word} line={c.line} color={c.color} dir={dir} top={c.captionTop} />
        <Flash />
      </>
    ), true);
  });

  push(beats(END_BEATS), (<><EndCard /><Flash frames={8} max={1} /></>));
  return blocks;
}

export const PlayReel: React.FC = () => {
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
        src={staticFile("lofi.wav")}
        trimBefore={Math.round(MUSIC_OFFSET_SEC * fps)}
        volume={(f) => interpolate(f, [0, 3, durationInFrames - 30, durationInFrames], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}
      />
    </AbsoluteFill>
  );
};
