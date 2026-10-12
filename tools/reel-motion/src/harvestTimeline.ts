// Beat-grid timeline for the 🌾 harvest-plaza reel (bear · everyone builds the plaza together).
// Same 105 BPM grammar as PlayReel/NightReel; the score is its own, cut to these beats
// (tools/cardnews/music.mjs --style harvest --secs 34 --out ../reel-motion/public/harvest.wav).
//
// Sources (720x1280):
//   clips/harvest_hook.mp4 — Flow, bear ref (shots/_ref_bear.png): walks with a hay bundle, leaf lands, "oh!" (10 s)
//   clips/harvest_pile.mp4 — Flow, ref = last hook frame: sets the bundle down, droops, items rain in, hop (10 s)
//     ⚠️ 7.5–8.25 s the bear is buried and pops out in front of the pile → cut over it (skips 7.0–8.45)
//   clips/plaza_arch.mp4, plaza_s1..4.mp4 — tools/cardnews/record.mjs --scenario plaza-arch|plaza-stage
//     --char 곰 --q "weather=clear&time=0.46&plaza=N" --zoom 0.6 (arch) / 0.85 (stages) — stage pinned with ?plaza=N, network blocked
import { COLORS } from "./timeline";
import snap from "./plazaSnapshot.json";

export const HARVEST = { leaf: "#c8452e", straw: "#e8bf4a", pumpkin: "#e8742a", wood: "#a8683c" }; // js/plaza/decor.js palette

export const HARVEST_HOOK = {
  src: "clips/harvest_hook.mp4",
  startSec: 3.8, // stops → leaf lands → "oh!" (ends ~9.5 s)
  beats: 10,
  small: "우리 마을에",
  big: "광장이 생긴대요!",
  top: "-30%", // title sits above the bear's head
  bigSize: 118, // 8 chars × 150 px overflowed the 1080 frame
};

export type HarvestClip = { src: string; startSec: number; rate?: number; beats: number };
export type HarvestCut = {
  clips: HarvestClip[]; // more than one = hard cuts inside the same caption
  word: string;
  line: string;
  color: string;
  captionTop: string;
  size?: number;
  future?: boolean; // stage pinned ahead of the live one — labelled "완성되면 이런 모습"
};

const PILE = "clips/harvest_pile.mp4";
const STAGE = (n: number, startSec: number, beats: number): HarvestClip => ({ src: `clips/plaza_s${n}.mp4`, startSec, beats });

export const HARVEST_CUTS: HarvestCut[] = [
  { clips: [{ src: PILE, startSec: 0.5, beats: 6 }], word: "요만큼…", line: "혼자 놓으면", color: COLORS.forest, captionTop: "9%" },
  { clips: [{ src: PILE, startSec: 3.93, rate: 1.08, beats: 5 }, { src: PILE, startSec: 8.45, rate: 0.9, beats: 3 }],
    word: "산더미!", line: "다 같이 모으면", color: HARVEST.pumpkin, captionTop: "9%" },
  { clips: [{ src: "clips/plaza_arch.mp4", startSec: 0.2, beats: 4 }], word: "광장으로!", line: "🌾 단풍 아치를 지나 수확제 광장으로", color: HARVEST.leaf, captionTop: "64%" },
  { clips: [STAGE(1, 0, 5)], word: "지금은 1단계", line: "터 다지기 · 다 같이 짓는 중", color: HARVEST.wood, captionTop: "62%", size: 150 },
  { clips: [STAGE(2, 0.5, 2), STAGE(3, 0.5, 2)], word: "다 같이 채우면", line: "돌바닥 깔고 → 수확제 장식 →", color: COLORS.sky, captionTop: "62%", size: 140, future: true },
  { clips: [STAGE(4, 0, 5)], word: "이렇게 완성!", line: "🍁 수확 나무가 서는 광장", color: HARVEST.leaf, captionTop: "62%", size: 150, future: true },
];

// Live progress, frozen by scripts/plaza-snap.mjs (re-run before the final render)
export const PLAZA_SNAP = snap;
export const STAGE_NAMES = ["", "터 다지기", "돌바닥 깔기", "수확제 장식", "완공"]; // js/data/plaza.js PLAZA_STAGE_NAMES
export const PROGRESS = { bg: "clips/plaza_s1.png", beats: 9, until: "10월 22일까지", cta: "재료 하나면 같이 지어요" };

export const HARVEST_END_BEATS = 7;

// Score is cut to this exact beat grid: no intro offset. If a cut's length in beats changes here,
// change the matching section in the HARVEST score too (hook 0–10 · pile 10–24 · plaza 24–42 · progress 42–51 · end 51–58).
export const HARVEST_MUSIC = { src: "harvest.wav", trimSec: 0 };

export const cutBeats = (c: HarvestCut) => c.clips.reduce((s, k) => s + k.beats, 0);
