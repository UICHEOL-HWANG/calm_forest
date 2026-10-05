import { BY_ID } from './constellations.js';

const DEFAULT = BY_ID.big_dipper;   // 인자 없이 부르면 첫 별자리(북두칠성) — 옛 호출과 같은 차트
const START_MS = 800;
const PERFECT_MS = 90;
const GOOD_MS = 180;
const EPS = 1e-9;

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function distance(c, a, b) {
  const [ax, ay] = c.stars[a];
  const [bx, by] = c.stars[b];
  return Math.hypot(ax - bx, ay - by);
}

function travelMs(c, from, to, ease) {
  return clamp(650 + distance(c, from, to) * 380, 700, 1300) * (c.tempo ?? 1) * ease;
}

/** c: constellations.js 항목 — 노트 = order 의 인접 쌍. tempo·ease 가 둘 다 이동 시간에 곱해진다 */
export function buildChart(ease = 1, c = DEFAULT) {
  const chart = [];
  let startMs = START_MS;
  for (let i = 0; i < c.order.length - 1; i++) {
    const from = c.order[i];
    const to = c.order[i + 1];
    const hitMs = startMs + travelMs(c, from, to, ease);
    chart.push({ i, from, to, startMs, hitMs });
    startMs = hitMs;
  }
  return chart;
}

export function judgeTap(offsetMs, ease = 1) {
  const perfect = PERFECT_MS * ease;
  const good = GOOD_MS * ease;
  const abs = Math.abs(offsetMs);
  if (abs <= perfect + EPS) return 'perfect';
  if (abs <= good + EPS) return 'good';
  return offsetMs < 0 ? 'early' : 'miss';
}

/** 놓친 이유 — 판정 시각보다 먼저 누르면 early, 늦게 누르거나 안 누르면(offset=null) late.
 *  화면에 '빨랐어요/늦었어요' 로 보여 준다(놓친 이유를 몰라 그만둔 판이 많았다, 2026-10-05). */
export function missWhy(offsetMs) {
  return offsetMs != null && offsetMs < 0 ? 'early' : 'late';
}

/** notes: 그 별자리의 노트 수(포기한 판은 진행한 judges 보다 많다). 허용 miss = ceil(노트 × 0.4) — 7노트는 3 */
export function summarize(judges = [], notes = judges.length) {
  let perfect = 0;
  let good = 0;
  let miss = 0;
  let combo = 0;
  let maxCombo = 0;
  for (const judge of judges) {
    if (judge === 'perfect') {
      perfect += 1;
      combo += 1;
    } else if (judge === 'good') {
      good += 1;
      combo += 1;
    } else if (judge === 'miss') {
      miss += 1;
      combo = 0;
    } else {
      continue;
    }
    maxCombo = Math.max(maxCombo, combo);
  }
  const score = perfect * 2 + good;
  return { perfect, good, miss, maxCombo, score, maxScore: notes * 2, success: miss <= Math.ceil(notes * 0.4) };
}

export function rewardFor(summary, alreadyToday) {
  if (alreadyToday || !summary?.success) return { coins: 0 };
  return { coins: 10 + summary.perfect * 2 };
}
