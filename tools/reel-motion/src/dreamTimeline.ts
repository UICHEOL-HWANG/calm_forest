// Beat-grid timeline for the dream-forest reel (bear · 꿈의 숲 + 🪞 거울 마을 teaser).
// Same 105 BPM grammar as NightReel (whip cuts, slab captions); the score is its own (music.mjs --style dream).
//
// Sources:
//   clips/dream_hook.mp4    — Flow, bear + moon-carriage reference (shots/_ref_dream.png), 10 s, came back 16:9 (panned)
//   clips/dream_tour.mp4    — tools/cardnews/record.mjs --scenario dream --char 곰 (720x1280 canvas capture)
//     markers (s): bed 0 · cut_start 2.12 · arrive 8.01 · shard_1..4 12.52/14.91/17.56/20.65 · wake 21.88 · end 25
//   clips/mirror_teaser.mp4 — tools/cardnews/record-page.mjs on dev/active/reel-dream/mirror-teaser.html?c=b
//     (B mock-up from the dimension-maps comparison — the map isn't in the game yet, so it's framed as "곧")
import { COLORS, beats } from "./timeline";

export type HookCopy = { word: string; line: string };

// A/B: the video is identical, only the opening caption changes. A → Instagram, B → Threads.
export const DREAM_HOOK_COPY: Record<"A" | "B", [HookCopy, HookCopy]> = {
  A: [
    { word: "어느 날…", line: "침대에 누워 잠을 자고 있었는데" },
    { word: "이게 뭐지?!", line: "초승달 마차가 날 데리러 왔어요!" },
  ],
  B: [
    { word: "오늘 밤 어디 가?", line: "이 게임은 잠들면 새 맵이 열려요" },
    { word: "꿈의 숲으로!", line: "초승달 마차가 침대 앞까지 데리러 와요" },
  ],
};

export const DREAM_HOOK = {
  src: "clips/dream_hook.mp4",
  startSec: 1.4,
  rate: 1.3, // 10 beats cover 1.4→8.8 s of the clip: asleep → carriage drifts in (~3.6 s) → bear wakes
  panX: [18, 18, 78, 72], // % object-position: bear (left) → carriage (right) → settle as the bear sits up
  beats: [4, 6] as const, // first caption over the sleeping bear, second as the carriage arrives
  color: COLORS.berry,
  captionTop: "60%",
};

export type DreamCut = {
  src: string;
  startSec: number;
  rate: number;
  beats: number;
  word: string;
  line: string;
  color: string;
  zoom: number;
  origin: string;
  captionTop?: string;
  dim?: boolean; // teaser: darken + vignette so the rough mock-up reads as a glimpse, not a finished map
};

const TOUR = { src: "clips/dream_tour.mp4", zoom: 1, origin: "50% 50%" };
const LILAC = "#8f6fd1";

export const DREAM_CUTS: DreamCut[] = [
  { ...TOUR, startSec: 4.0, rate: 1, beats: 6, word: "꿈길", line: "초승달 마차를 타고 구름 위로", color: LILAC, captionTop: "62%" },
  { ...TOUR, startSec: 7.4, rate: 1, beats: 4, word: "꿈의 숲", line: "밤에만 열리는, 구름 위에 떠 있는 섬", color: COLORS.sky, captionTop: "64%" },
  { ...TOUR, startSec: 10.6, rate: 1.8, beats: 6, word: "꿈 조각", line: "하루 7개, 반짝이는 조각을 모아 꿈 장식으로", color: COLORS.sun, captionTop: "64%" },
  { ...TOUR, startSec: 23.0, rate: 1, beats: 4, word: "아침!", line: "깨어나면 다시 내 방, 오늘 밤에 또 만나요", color: COLORS.leaf, captionTop: "58%" },
  { src: "clips/mirror_teaser.mp4", startSec: 0.3, rate: 1, beats: 7, word: "다음 꿈은…", line: "🪞 연못 너머, 밤낮이 뒤집힌 거울 마을 · 곧 열려요", color: "#3b5f8f", zoom: 1, origin: "50% 50%", captionTop: "60%", dim: true },
];

export const DREAM_END_BEATS = 7;

// Score is cut to this exact beat grid (tools/cardnews/music.mjs --style dream): no intro offset.
// If a cut's length in beats changes here, change the matching section in the DREAM score too.
export const DREAM_MUSIC = { src: "dream.wav", trimSec: 0 };

export const dreamTotalFrames = () =>
  DREAM_HOOK.beats.reduce((s, b) => s + beats(b), 0) + DREAM_CUTS.reduce((s, c) => s + beats(c.beats), 0) + beats(DREAM_END_BEATS);
