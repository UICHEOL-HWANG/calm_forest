// Beat-grid timeline for the play reel. Music is the lo-fi house track from
// tools/cardnews/music.mjs --style lofi (105 BPM), so every cut lands on a beat.
import type { Crop } from "./parts";

export const FPS = 30;
export const BPM = 105;
export const BEAT = (FPS * 60) / BPM; // 17.14 frames
export const beats = (n: number) => Math.round(n * BEAT);

// Skip the muffled 2-bar intro so drums hit on frame 0
export const MUSIC_OFFSET_SEC = (8 * 60) / BPM;

export const COLORS = {
  cream: "#fdf6ea",
  ink: "#16241c",
  forest: "#2f6b4f",
  leaf: "#7cc47f",
  orange: "#e8793a",
  sky: "#3d8bd9",
  berry: "#c9506b",
  sun: "#f2b632",
};

export type HookWord = { text: string; bg: string; accent: string };

// Opening: one word per beat on a diagonal colour wipe
export const HOOK: HookWord[] = [
  { text: "심고", bg: COLORS.forest, accent: COLORS.leaf },
  { text: "낚고", bg: COLORS.sky, accent: "#9fd0ff" },
  { text: "요리하고", bg: COLORS.orange, accent: COLORS.sun },
];

type CutBase = {
  word: string; // big kinetic keyword
  line: string; // supporting caption
  color: string; // slab colour behind the keyword
  beats: number;
  captionTop?: string; // default sits mid-lower; UI stills push it up
};
export type ClipCut = CutBase & { kind: "clip"; src: string; startSec: number; rate?: number };
// Real in-game UI (DOM) screenshots — canvas recording can't capture dialogs
export type StillCut = CutBase & { kind: "stills"; srcs: string[]; crops: Crop[]; cardScale: number; cardTop: string };
export type Cut = ClipCut | StillCut;

export const TITLE = {
  src: "clips/01.mp4",
  startSec: 0,
  small: "숲속 한가운데,",
  big: "나만의 마을 하나!",
  beats: 6,
};

export const CUTS: Cut[] = [
  { kind: "clip", src: "clips/02.mp4", startSec: 2.4, word: "심고", line: "밭을 갈고 씨앗을 심는다", color: COLORS.forest, beats: 3 },
  { kind: "clip", src: "clips/03.mp4", startSec: 0.8, word: "거두고", line: "때가 되면 수확을 한다", color: COLORS.sun, beats: 3 },
  { kind: "clip", src: "clips/04.mp4", startSec: 2.3, word: "낚고", line: "바다에서 낚시를 해서 물고기를 낚는다", color: COLORS.sky, beats: 4 },
  { kind: "clip", src: "clips/05.mp4", startSec: 1.0, word: "요리하고", line: "잡은 것으로 한 상 차리고", color: COLORS.orange, beats: 3 },
  { kind: "clip", src: "clips/05.mp4", startSec: 3.1, word: "깎고", line: "직접 조각해 내다 판다", color: COLORS.berry, beats: 3 },
  { kind: "stills", srcs: ["talk/t0.png"], crops: [{ x0: 0.214, x1: 0.786, y0: 0.382, y1: 0.618 }], cardScale: 1.45, cardTop: "30%", captionTop: "9%", word: "돕고", line: "주민의 부탁을 들어주고", color: COLORS.leaf, beats: 3 },
  { kind: "stills", srcs: ["talk/t2.png", "talk/t3.png", "talk/t4.png"],
    crops: [{ x0: 0.2, x1: 0.8, y0: 0.34, y1: 0.66 }, { x0: 0.2, x1: 0.8, y0: 0.3, y1: 0.7 }, { x0: 0.2, x1: 0.8, y0: 0.29, y1: 0.708 }],
    cardScale: 1.3, cardTop: "25%", captionTop: "9%", word: "수다 떨고", line: "주민과 오늘 하루를 나눈다", color: COLORS.sky, beats: 6 },
  { kind: "clip", src: "clips/house.mp4", startSec: 0.8, rate: 2, captionTop: "60%", word: "넓히고", line: "집을 한 층씩 넓혀 간다", color: COLORS.forest, beats: 6 },
];

export const END_BEATS = 7;

export const totalFrames = () =>
  beats(HOOK.length + 1) + beats(TITLE.beats) + CUTS.reduce((s, c) => s + beats(c.beats), 0) + beats(END_BEATS);
