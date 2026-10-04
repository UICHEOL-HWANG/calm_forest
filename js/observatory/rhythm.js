export const DIPPER = [
  [0, 0],
  [1.05, -0.15],
  [1.25, -0.95],
  [0.15, -0.8],
  [-0.75, 0.15],
  [-1.55, 0.45],
  [-2.45, 0.35],
];

export const ORDER = [6, 5, 4, 0, 1, 2, 3, 0];

const START_MS = 800;
const PERFECT_MS = 90;
const GOOD_MS = 180;
const EPS = 1e-9;

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function distance(a, b) {
  const ax = DIPPER[a][0];
  const ay = DIPPER[a][1];
  const bx = DIPPER[b][0];
  const by = DIPPER[b][1];
  return Math.hypot(ax - bx, ay - by);
}

function travelMs(from, to, ease) {
  return clamp(650 + distance(from, to) * 380, 700, 1300) * ease;
}

export function buildChart(ease = 1) {
  const chart = [];
  let startMs = START_MS;
  for (let i = 0; i < ORDER.length - 1; i++) {
    const from = ORDER[i];
    const to = ORDER[i + 1];
    const hitMs = startMs + travelMs(from, to, ease);
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

export function summarize(judges = []) {
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
  return { perfect, good, miss, maxCombo, score, success: miss <= 3 };
}

export function rewardFor(summary, alreadyToday) {
  if (alreadyToday || !summary?.success) return { coins: 0 };
  return { coins: 10 + summary.perfect * 2 };
}
