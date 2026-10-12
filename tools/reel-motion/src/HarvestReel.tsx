import React from "react";
import { AbsoluteFill, Img, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig, Easing } from "remotion";
import { Audio } from "@remotion/media";
import { BrandBug, Caption, EndCard, Flash, GameClip, TitleText } from "./parts";
import { BODY, DISPLAY } from "./fonts";
import { COLORS, beats } from "./timeline";
import { HARVEST, HARVEST_CUTS, HARVEST_END_BEATS, HARVEST_HOOK, HARVEST_MUSIC, PLAZA_SNAP, PROGRESS, STAGE_NAMES, cutBeats } from "./harvestTimeline";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** Honesty tag on stages that aren't built yet (pinned with ?plaza=N) */
const FutureTag: React.FC = () => {
  const f = useCurrentFrame();
  const o = interpolate(f, [2, 8], [0, 1], clamp);
  return (
    <div style={{
      position: "absolute", top: 82, right: 56, padding: "12px 26px", borderRadius: 999, opacity: o,
      background: "rgba(16,26,20,.62)", fontFamily: BODY, fontWeight: 900, fontSize: 36, color: COLORS.cream, letterSpacing: "-0.02em",
    }}>
      완성되면 이런 모습
    </div>
  );
};

/** Real progress from /api/plaza (frozen with its date): bar fills to the live % */
const ProgressCard: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = PLAZA_SNAP;
  const card = spring({ frame: f, fps, config: { damping: 14, stiffness: 200 } });
  const fill = interpolate(f, [8, 30], [0, s.pct], { ...clamp, easing: Easing.out(Easing.cubic) });
  const cta = spring({ frame: f - 30, fps, config: { damping: 12, stiffness: 220 } });
  const [, mm, dd] = s.asOf.split("-").map(Number);
  return (
    <AbsoluteFill style={{ background: COLORS.ink, overflow: "hidden" }}>
      <Img src={staticFile(PROGRESS.bg)} style={{ width: "100%", height: "100%", objectFit: "cover", filter: "blur(16px) brightness(.55)", transform: "scale(1.1)" }} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div style={{
          width: 900, padding: "56px 60px 60px", borderRadius: 48, background: COLORS.cream, boxShadow: "0 30px 80px rgba(0,0,0,.45)",
          transform: `scale(${interpolate(card, [0, 1], [0.85, 1])})`, opacity: interpolate(card, [0, 0.4], [0, 1], clamp),
        }}>
          <div style={{ fontFamily: BODY, fontWeight: 900, fontSize: 48, color: COLORS.forest, letterSpacing: "-0.03em" }}>🌾 수확제 광장</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 22, marginTop: 18 }}>
            <span style={{ fontFamily: DISPLAY, fontSize: 150, lineHeight: 1, color: HARVEST.leaf }}>{Math.round(fill)}%</span>
            <span style={{ fontFamily: BODY, fontWeight: 900, fontSize: 46, color: COLORS.ink }}>{s.stage}단계 · {STAGE_NAMES[s.stage]}</span>
          </div>
          <div style={{ marginTop: 30, height: 46, borderRadius: 999, background: "#e9dfcc", overflow: "hidden" }}>
            <div style={{ width: `${fill}%`, height: "100%", borderRadius: 999, background: `linear-gradient(90deg, ${HARVEST.straw}, ${HARVEST.pumpkin})` }} />
          </div>
          <div style={{ marginTop: 22, display: "flex", justifyContent: "space-between", fontFamily: BODY, fontWeight: 700, fontSize: 36, color: "#6b6152" }}>
            <span>{PROGRESS.until}</span>
            <span>{mm}월 {dd}일 기준</span>
          </div>
        </div>
        <div style={{
          marginTop: 60, padding: "22px 48px", borderRadius: 999, background: HARVEST.leaf, fontFamily: BODY, fontWeight: 900, fontSize: 58,
          color: COLORS.cream, letterSpacing: "-0.03em", boxShadow: "0 10px 0 rgba(10,16,12,.35)",
          transform: `scale(${interpolate(cta, [0, 1], [0.3, 1])})`, opacity: interpolate(cta, [0, 0.3], [0, 1], clamp),
        }}>
          {PROGRESS.cta}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

type Block = { from: number; len: number; node: React.ReactNode; bug?: boolean };

/** Flow hook → Flow pile → arch → plaza now (stage 1) → stages 2·3·4 (future) → live progress → end */
function buildBlocks(): Block[] {
  const blocks: Block[] = [];
  let t = 0;
  const push = (len: number, node: React.ReactNode, bug = false) => { blocks.push({ from: t, len, node, bug }); t += len; };

  push(beats(HARVEST_HOOK.beats), (
    <>
      <GameClip src={HARVEST_HOOK.src} startSec={HARVEST_HOOK.startSec} dir={1} />
      <TitleText small={HARVEST_HOOK.small} big={HARVEST_HOOK.big} top={HARVEST_HOOK.top} bigSize={HARVEST_HOOK.bigSize} />
      <Flash frames={8} max={1} />
    </>
  ), true);

  HARVEST_CUTS.forEach((c, i) => {
    const dir = i % 2 ? 1 : -1;
    let at = 0;
    push(beats(cutBeats(c)), (
      <>
        {c.clips.map((k, j) => {
          const from = at;
          at += beats(k.beats);
          return (
            <Sequence key={j} from={from} durationInFrames={beats(k.beats)}>
              <GameClip src={k.src} startSec={k.startSec} rate={k.rate} dir={(j % 2 ? -dir : dir) as 1 | -1} />
              {j > 0 && <Flash />}
            </Sequence>
          );
        })}
        {c.future && <FutureTag />}
        <Caption word={c.word} line={c.line} color={c.color} dir={dir} top={c.captionTop} size={c.size} />
        <Flash />
      </>
    ), true);
  });

  push(beats(PROGRESS.beats), (<><ProgressCard /><Flash /></>), true);
  push(beats(HARVEST_END_BEATS), (<><EndCard /><Flash frames={8} max={1} /></>));
  return blocks;
}

export const harvestTotalFrames = () => buildBlocks().reduce((s, b) => s + b.len, 0);

export const HarvestReel: React.FC = () => {
  const { durationInFrames, fps } = useVideoConfig();
  const blocks = buildBlocks();
  const bugBlocks = blocks.filter((b) => b.bug);
  const bugEnd = bugBlocks[bugBlocks.length - 1].from + bugBlocks[bugBlocks.length - 1].len;
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {blocks.map((b, i) => (
        <Sequence key={i} from={b.from} durationInFrames={b.len} premountFor={fps}>
          {b.node}
        </Sequence>
      ))}
      <Sequence from={bugBlocks[0].from} durationInFrames={bugEnd - bugBlocks[0].from}>
        <BrandBug />
      </Sequence>
      <Audio
        src={staticFile(HARVEST_MUSIC.src)}
        trimBefore={Math.round(HARVEST_MUSIC.trimSec * fps)}
        volume={(f) => interpolate(f, [0, 3, durationInFrames - 30, durationInFrames], [0, 1, 1, 0], clamp)}
      />
    </AbsoluteFill>
  );
};
