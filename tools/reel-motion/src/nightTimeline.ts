// Beat-grid timeline for the night-visitor reel (bear · 밤손님).
// Same 105 BPM lo-fi track as PlayReel so the grammar (whip cuts, slab captions) matches.
//
// Sources:
//   clips/night_hook.mp4  — Flow, bear reference, 6 beats (~3.4 s) out of the 8 s generation
//   clips/night_duel.mp4  — tools/cardnews/record.mjs --scenario night-duel (720x1280 canvas capture)
//     markers (s): investigate 1.82 · duel_open 3.59 · duel_end 17.22 · end 19.72
import { COLORS, beats } from "./timeline";

export const NIGHT_HOOK = {
  src: "clips/night_hook.mp4",
  startSec: 3.4, // 3.4s: bear walks up to the dug mound, leaf starts to fall → ~6.8s: it lands on its head
  beats: 6,
  word: "털렸다",
  line: "자고 일어났더니 밭이 텅 비어 있었다",
  color: COLORS.berry,
  captionTop: "60%",
};

export type NightCut = {
  src: string;
  startSec: number;
  rate: number;
  beats: number;
  word: string;
  line: string;
  color: string;
  zoom: number;
  origin: string; // transform-origin — keeps the fighters in frame when punched in
  captionTop?: string;
};

// The duel canvas shows the fighters in a thin band at ~45% height; zoom in on it.
// Fighters span ~20%..90% of the frame width, so the punch-in origin sits right of centre (1.45 @ 42% cropped the boar)
const DUEL = { src: "clips/night_duel.mp4", zoom: 1.1, origin: "58% 47%" };

const RACC = { src: "clips/night_raccoon.mp4", zoom: 1, origin: "50% 50%" };

export const NIGHT_CUTS: NightCut[] = [
  { src: "clips/night_duel.mp4", startSec: 0.2, rate: 1, beats: 4, word: "범인은?", line: "흙에 남은 커다란 발자국, 밤새 누가 다녀간 걸까", color: COLORS.orange, zoom: 1, origin: "50% 50%", captionTop: "58%" },
  { ...DUEL, startSec: 3.6, rate: 2, beats: 6, word: "찾았다!", line: "범인은 바로 멧돼지! 멧돼지랑 가위바위보 한판승부!", color: COLORS.sky, captionTop: "62%" },
  { ...DUEL, startSec: 10.4, rate: 2, beats: 6, word: "승부!", line: "가위바위보 2선승, 이기면 작물을 되찾아요", color: COLORS.sun, captionTop: "62%" },
  { src: "clips/night_duel.mp4", startSec: 17.2, rate: 1, beats: 4, word: "지켰다!", line: "나의 소중한 작물들을 모두 지켜냈고, 멧돼지는 당분간 오지 않을 거예요", color: COLORS.leaf, zoom: 1, origin: "50% 50%", captionTop: "58%" },
  // 🦝 twist: the second thief. night_raccoon.mp4 markers (s): investigate 1.81 · duel_open 3.63 · pick_1 6.45 · pick_2 12.73 · pick_3 19.27 · duel_end 24.09
  { ...RACC, startSec: 0.2, rate: 1, beats: 3, word: "그런데!", line: "밭에 발자국이 또 있다! 이번엔 너구리다", color: COLORS.orange, captionTop: "58%" },
  { ...RACC, startSec: 3.63, rate: 2, beats: 8, word: "내기!", line: "너구리가 훔친 작물을 그릇 속에 숨기고 내기를 걸어왔다", color: COLORS.berry, captionTop: "64%" },
  { ...RACC, startSec: 13.7, rate: 1.6, beats: 6, word: "집중!", line: "그릇이 점점 빨라진다! 작물이 든 그릇만 끝까지 눈으로 따라가자", color: COLORS.sky, captionTop: "64%" },
  { ...RACC, startSec: 19.3, rate: 1.2, beats: 4, word: "전승!", line: "3판 연속 정답! 너구리도 당분간 오지 않을 거예요", color: COLORS.leaf, zoom: 1.1, origin: "58% 47%", captionTop: "58%" },
];

export const NIGHT_END_BEATS = 7;

// Score is cut to this exact beat grid (tools/cardnews/music.mjs --style night --secs 31): no intro offset.
// If a cut's length in beats changes here, change the matching section in the NIGHT score too.
export const NIGHT_MUSIC = { src: "night.wav", trimSec: 0 };

export const nightTotalFrames = () =>
  beats(NIGHT_HOOK.beats) + NIGHT_CUTS.reduce((s, c) => s + beats(c.beats), 0) + beats(NIGHT_END_BEATS);
