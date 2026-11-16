import { POND_STAGE_R, POND_BIG_SPOT, POND_ACT_PAD, POND_VIEW_PAD } from '../data/pond.js';

export const POND_STAGES = Object.freeze([
  Object.freeze({ stage: 1, name: '연못', ico: '🐟', book: 0, cost: null }),
  Object.freeze({ stage: 2, name: '넓은 연못', ico: '🌊', book: 4, cost: Object.freeze({ stone: 20, wood: 20, coins: 200 }) }),
  Object.freeze({ stage: 3, name: '큰 연못', ico: '🏝️', book: 8, cost: Object.freeze({ stone: 60, wood: 40, coins: 500 }) }),
]);
export const MAX_POND_STAGE = POND_STAGES.length;

const DECOR_PAD = 0.6;

function clampStage(v) {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) ? Math.min(MAX_POND_STAGE, Math.max(1, n)) : 1;
}

export function pondStageOf(hintsSeen) {
  return clampStage(hintsSeen?.pondStage);
}

export function pondRadius(stage) {
  return POND_STAGE_R[clampStage(stage) - 1];
}

export function pondSpotFor(stage, smallSpot) {
  return clampStage(stage) >= 2 ? POND_BIG_SPOT : smallSpot;
}

export function pondActR(stage) {
  return pondRadius(stage) + POND_ACT_PAD;
}

export function pondViewR(stage) {
  return pondRadius(stage) + POND_VIEW_PAD;
}

export function pondStageInfo(stage, inventory, bookGot) {
  const cur = POND_STAGES[clampStage(stage) - 1];
  const next = POND_STAGES[cur.stage] || null;
  if (!next) return { maxed: true, cur, next: null, book: null, items: [], affordable: false };
  const inv = inventory || {};
  const have = Number.isFinite(bookGot) ? bookGot : 0;
  const items = Object.entries(next.cost).map(([k, need]) => ({ k, need, have: inv[k] || 0 }));
  const book = { need: next.book, have, ok: have >= next.book };
  return { maxed: false, cur, next, book, items, affordable: book.ok && items.every(i => i.have >= i.need) };
}

export function pondDecorInWay(outdoorRel, stage) {
  if (clampStage(stage) < 2) return 0;
  const reach = pondRadius(stage) + DECOR_PAD;
  return (Array.isArray(outdoorRel) ? outdoorRel : [])
    .filter(o => Math.hypot(o.dx - POND_BIG_SPOT.dx, o.dz - POND_BIG_SPOT.dz) < reach).length;
}

export function pondFishLimits(stage) {
  const s = clampStage(stage);
  return { seaMax: s >= 2 ? 4 : 1, riverDup: s >= 3 ? 2 : 1 };
}
