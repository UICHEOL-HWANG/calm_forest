import React from "react";
import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig, Easing } from "remotion";
import { Video } from "@remotion/media";
import { BODY, DISPLAY } from "./fonts";
import { COLORS, HookWord } from "./timeline";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** Thick outlined display text — reads on any gameplay background */
const outlined = (px: number, stroke = COLORS.ink): React.CSSProperties => ({
  fontFamily: DISPLAY,
  fontSize: px,
  lineHeight: 1,
  color: COLORS.cream,
  WebkitTextStroke: `${Math.round(px * 0.09)}px ${stroke}`,
  paintOrder: "stroke fill",
  textShadow: `0 ${px * 0.06}px 0 ${stroke}, 0 0 ${px * 0.4}px rgba(0,0,0,.35)`,
  letterSpacing: "-0.02em",
  whiteSpace: "nowrap",
});

/** White flash at a cut point */
export const Flash: React.FC<{ frames?: number; max?: number }> = ({ frames = 6, max = 0.85 }) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [0, frames], [max, 0], clamp);
  return <AbsoluteFill style={{ background: "#fff", opacity: o, pointerEvents: "none" }} />;
};

/** Hook beat: diagonal colour wipe + word slams in */
export const HookBeat: React.FC<{ w: HookWord; dir: 1 | -1 }> = ({ w, dir }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const wipe = interpolate(f, [0, 5], [dir * 120, 0], { ...clamp, easing: Easing.out(Easing.cubic) });
  const slam = spring({ frame: f - 2, fps, config: { damping: 11, stiffness: 260, mass: 0.6 } });
  const scale = interpolate(slam, [0, 1], [2.6, 1]);
  const blur = interpolate(slam, [0, 0.7], [18, 0], clamp);
  const stripe = interpolate(f, [0, 17], [-dir * 30, dir * 30]);
  return (
    <AbsoluteFill style={{ background: COLORS.ink, overflow: "hidden" }}>
      <AbsoluteFill style={{ background: w.bg, transform: `translateX(${wipe}%) skewX(${-dir * 14}deg) scaleX(1.4)` }} />
      {[0, 1, 2].map((i) => (
        <div key={i} style={{
          position: "absolute", left: "-20%", width: "140%", height: 26 + i * 14,
          top: `${30 + i * 18}%`, background: w.accent, opacity: 0.35 - i * 0.08,
          transform: `translateX(${stripe * (i + 1)}%) rotate(${-dir * 14}deg)`,
        }} />
      ))}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div style={{ ...outlined(w.text.length > 2 ? 250 : 330), transform: `scale(${scale}) rotate(${-dir * 4}deg)`, filter: `blur(${blur}px)` }}>
          {w.text}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** Gameplay clip with punch-in zoom and a whip-in from the side */
// pan: horizontal object-position keyframes for landscape sources in the 9:16 frame — { frames: [...], x: [% ...] }
export const GameClip: React.FC<{ src: string; startSec: number; dir: 1 | -1; rate?: number; zoom?: number; origin?: string; pan?: { frames: number[]; x: number[] } }> = ({ src, startSec, dir, rate = 1, zoom = 1, origin = "50% 50%", pan }) => {
  const f = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const whip = interpolate(f, [0, 5], [dir * 35, 0], { ...clamp, easing: Easing.out(Easing.cubic) });
  const blur = interpolate(f, [0, 5], [24, 0], clamp);
  const punch = spring({ frame: f, fps, config: { damping: 14, stiffness: 180 } });
  const drift = interpolate(f, [0, durationInFrames], [0, 0.05]);
  const scale = interpolate(punch, [0, 1], [1.28, 1.08]) + drift;
  const panX = pan ? interpolate(f, pan.frames, pan.x, { ...clamp, easing: Easing.inOut(Easing.cubic) }) : 50;
  return (
    <AbsoluteFill style={{ background: COLORS.ink, overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: `translateX(${whip}%) scale(${scale * zoom})`, transformOrigin: origin, filter: `blur(${blur}px)` }}>
        <Video src={staticFile(src)} trimBefore={Math.round(startSec * fps)} playbackRate={rate} muted objectFit="cover"
          style={{ width: "100%", height: "100%", objectPosition: `${panX}% 50%` }} />
      </AbsoluteFill>
      {/* soft vignette keeps captions legible */}
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, transparent 55%, rgba(10,16,12,.45) 100%)" }} />
    </AbsoluteFill>
  );
};

/** Keyword on a tilted colour slab + supporting line */
export const Caption: React.FC<{ word: string; line: string; color: string; dir: 1 | -1; top?: string }> = ({ word, line, color, dir, top = "52%" }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame: f - 3, fps, config: { damping: 9, stiffness: 240, mass: 0.7 } });
  const slab = interpolate(f, [1, 7], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const sub = spring({ frame: f - 8, fps, config: { damping: 16, stiffness: 160 } });
  return (
    <AbsoluteFill style={{ alignItems: "center", top }}>
      <div style={{ position: "relative", display: "flex", justifyContent: "center" }}>
        <div style={{
          position: "absolute", top: "18%", height: "70%", left: -60, right: -60, background: color,
          transform: `rotate(${-dir * 4}deg) scaleX(${slab})`, transformOrigin: dir > 0 ? "left" : "right",
          boxShadow: "0 10px 0 rgba(10,16,12,.35)",
        }} />
        <div style={{ ...outlined(top === "52%" || parseFloat(top) > 30 ? 200 : 160), position: "relative", transform: `scale(${interpolate(pop, [0, 1], [0.2, 1])}) rotate(${-dir * 4}deg)` }}>
          {word}
        </div>
      </div>
      <div style={{
        marginTop: 34, fontFamily: BODY, fontWeight: 900, fontSize: 54, color: COLORS.cream,
        padding: "12px 30px", background: "rgba(16,26,20,.72)", borderRadius: 44, letterSpacing: "-0.03em",
        maxWidth: 920, textAlign: "center", lineHeight: 1.25, wordBreak: "keep-all",   // long lines wrap instead of running off-screen
        opacity: sub, transform: `translateY(${interpolate(sub, [0, 1], [40, 0])}px)`,
      }}>
        {line}
      </div>
    </AbsoluteFill>
  );
};

/** Emoji-only caption — slams in huge, overshoots, settles, then keeps a gentle bob.
 *  A shock ring and a short shake on the hit frame give the cut some impact. */
export const EmojiCaption: React.FC<{ emoji: string; color: string; dir: 1 | -1; top?: string }> = ({ emoji, color, dir, top = "52%" }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const slam = spring({ frame: f - 2, fps, config: { damping: 7, stiffness: 220, mass: 0.7 } });
  const scale = interpolate(slam, [0, 1], [0.1, 1]);
  const spin = interpolate(slam, [0, 1], [dir * -28, -dir * 5]);
  const ring = interpolate(f, [2, 14], [0.4, 2.4], { ...clamp, easing: Easing.out(Easing.cubic) });
  const ringO = interpolate(f, [2, 14], [0.75, 0], clamp);
  const shake = f >= 2 && f < 8 ? Math.sin(f * 4.2) * (8 - f) * 2.2 : 0;
  const bob = f > 10 ? Math.sin((f - 10) / 5) * 10 : 0;
  return (
    <AbsoluteFill style={{ alignItems: "center", top }}>
      <div style={{ position: "relative", width: 420, height: 420, display: "flex", alignItems: "center", justifyContent: "center", transform: `translate(${shake}px, ${bob}px)` }}>
        <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: `22px solid ${color}`, opacity: ringO, transform: `scale(${ring})` }} />
        <div style={{ position: "absolute", width: 360, height: 360, borderRadius: "50%", background: color, opacity: 0.9, transform: `scale(${scale})`, boxShadow: "0 12px 0 rgba(10,16,12,.35)" }} />
        <div style={{ position: "relative", fontSize: 250, lineHeight: 1, transform: `scale(${scale}) rotate(${spin}deg)`, filter: "drop-shadow(0 10px 0 rgba(10,16,12,.35))" }}>
          {emoji}
        </div>
      </div>
    </AbsoluteFill>
  );
};

/** Persistent brand chip, top-left, like a channel bug */
export const BrandBug: React.FC = () => {
  const f = useCurrentFrame();
  const o = interpolate(f, [0, 8], [0, 1], clamp);
  return (
    <div style={{
      position: "absolute", top: 70, left: 56, display: "flex", alignItems: "center", gap: 16,
      padding: "12px 26px 12px 12px", background: "rgba(16,26,20,.62)", borderRadius: 999, opacity: o,
    }}>
      <Img src={staticFile("icon.png")} style={{ width: 64, height: 64, borderRadius: 18 }} />
      <span style={{ fontFamily: BODY, fontWeight: 900, fontSize: 40, color: COLORS.cream, letterSpacing: "-0.02em" }}>calm forest</span>
    </div>
  );
};

/** Title over the village: small line, then big line slams */
export const TitleText: React.FC<{ small: string; big: string }> = ({ small, big }) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const a = spring({ frame: f - 2, fps, config: { damping: 14, stiffness: 200 } });
  const b = spring({ frame: f - 11, fps, config: { damping: 9, stiffness: 260, mass: 0.7 } });
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", top: "-6%" }}>
      <div style={{ ...outlined(96), opacity: a, transform: `translateY(${interpolate(a, [0, 1], [-60, 0])}px)` }}>{small}</div>
      <div style={{ ...outlined(150), marginTop: 26, color: COLORS.sun, transform: `scale(${interpolate(b, [0, 1], [2.4, 1])})`, opacity: interpolate(b, [0, 0.3], [0, 1], clamp) }}>
        {big}
      </div>
    </AbsoluteFill>
  );
};

/** End card: icon pops, wordmark slams, CTA slides up */
export const EndCard: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const icon = spring({ frame: f, fps, config: { damping: 10, stiffness: 200 } });
  const word = spring({ frame: f - 6, fps, config: { damping: 10, stiffness: 260, mass: 0.7 } });
  const cta = spring({ frame: f - 14, fps, config: { damping: 16, stiffness: 160 } });
  const plat = spring({ frame: f - 20, fps, config: { damping: 16, stiffness: 160 } });
  const ray = f * 0.6;
  return (
    <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 40%, ${COLORS.forest} 0%, ${COLORS.ink} 70%)`, alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
      <AbsoluteFill style={{
        background: `repeating-conic-gradient(from ${ray}deg at 50% 38%, rgba(124,196,127,.10) 0deg 10deg, transparent 10deg 20deg)`,
      }} />
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: -160 }}>
        <Img src={staticFile("icon.png")} style={{ width: 300, height: 300, borderRadius: 70, transform: `scale(${icon}) rotate(${interpolate(icon, [0, 1], [-20, 0])}deg)`, boxShadow: "0 24px 60px rgba(0,0,0,.45)" }} />
        <div style={{ ...outlined(140), marginTop: 50, transform: `scale(${interpolate(word, [0, 1], [2.2, 1])})`, opacity: interpolate(word, [0, 0.3], [0, 1], clamp) }}>
          calm forest
        </div>
        <div style={{ marginTop: 40, fontFamily: BODY, fontWeight: 900, fontSize: 58, color: COLORS.cream, opacity: cta, transform: `translateY(${interpolate(cta, [0, 1], [50, 0])}px)`, letterSpacing: "-0.03em" }}>
          설치 없이, 지금 바로 무료로
        </div>
        <div style={{ marginTop: 34, display: "flex", gap: 18, opacity: plat, transform: `translateY(${interpolate(plat, [0, 1], [50, 0])}px)` }}>
          {["웹", "토스", "Google Play"].map((p) => (
            <span key={p} style={{ fontFamily: BODY, fontWeight: 900, fontSize: 40, color: COLORS.ink, background: COLORS.sun, padding: "12px 30px", borderRadius: 999 }}>{p}</span>
          ))}
        </div>
        <div style={{ marginTop: 40, fontFamily: BODY, fontWeight: 700, fontSize: 46, color: COLORS.leaf, opacity: plat }}>calmforest.cloud</div>
      </div>
    </AbsoluteFill>
  );
};

export type Crop = { x0: number; x1: number; y0: number; y1: number }; // fractions of the still

/** Real in-game UI stills (DOM screenshots). The panel is cropped out and shown as an
 *  enlarged card over a blurred copy of the same frame, so dialog text stays legible on a phone. */
export const StillSteps: React.FC<{ srcs: string[]; crops: Crop[]; stepFrames: number; cardScale: number; cardTop: string }> = ({ srcs, crops, stepFrames, cardScale, cardTop }) => {
  const f = useCurrentFrame();
  const { fps, width: W, height: H } = useVideoConfig();
  const i = Math.min(srcs.length - 1, Math.floor(f / stepFrames));
  const local = f - i * stepFrames;
  const c = crops[i];
  const pop = spring({ frame: local, fps, config: { damping: 13, stiffness: 220 } });
  const flash = interpolate(local, [0, 5], [i === 0 ? 0 : 0.5, 0], clamp);
  const s = cardScale;
  return (
    <AbsoluteFill style={{ background: COLORS.ink, overflow: "hidden" }}>
      <Img src={staticFile(srcs[i])} style={{ width: "100%", height: "100%", objectFit: "cover", filter: "blur(14px) brightness(.7)", transform: "scale(1.08)" }} />
      <div style={{
        position: "absolute", top: cardTop, left: (W - (c.x1 - c.x0) * W * s) / 2,
        width: (c.x1 - c.x0) * W * s, height: (c.y1 - c.y0) * H * s, overflow: "hidden", borderRadius: 34,
        boxShadow: "0 30px 80px rgba(0,0,0,.5)", transform: `scale(${interpolate(pop, [0, 1], [0.9, 1])})`, transformOrigin: "50% 0%",
      }}>
        <Img src={staticFile(srcs[i])} style={{ position: "absolute", width: W * s, height: H * s, left: -c.x0 * W * s, top: -c.y0 * H * s, maxWidth: "none" }} />
      </div>
      <AbsoluteFill style={{ background: "#fff", opacity: flash }} />
    </AbsoluteFill>
  );
};
