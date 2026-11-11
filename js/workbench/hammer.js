export const HAMMER = Object.freeze({ strikes: 5, beatMs: 800, leadMs: 1400, perfectMs: 70, goodMs: 150, catchMs: 400 });

const REFUND_BANDS = Object.freeze([
  { min: 10, rate: 0.3 },
  { min: 8, rate: 0.2 },
  { min: 5, rate: 0.1 },
  { min: 0, rate: 0 },
]);

export function beatTimes(cfg = HAMMER) {
  return Array.from({ length: cfg.strikes }, (_, i) => cfg.leadMs + i * cfg.beatMs);
}

export function judgeOffset(d, cfg = HAMMER) {
  const a = Math.abs(d);
  if (a <= cfg.perfectMs) return 2;
  if (a <= cfg.goodMs) return 1;
  return 0;
}

export function newRun(cfg = HAMMER) {
  return { marks: Array.from({ length: cfg.strikes }, () => null) };
}

export function expireRun(run, t, cfg = HAMMER) {
  const beats = beatTimes(cfg);
  const missed = [];
  const marks = run.marks.map((m, i) => {
    if (m !== null || t <= beats[i] + cfg.goodMs) return m;
    missed.push(i);
    return 0;
  });
  return { run: { ...run, marks }, missed };
}

export function tapRun(run, t, cfg = HAMMER) {
  const { run: live } = expireRun(run, t, cfg);
  const beats = beatTimes(cfg);
  const i = live.marks.findIndex((m, k) => m === null && Math.abs(t - beats[k]) <= cfg.catchMs);
  if (i < 0) return { run: live, hit: null };
  const pts = judgeOffset(t - beats[i], cfg);
  const marks = live.marks.map((m, k) => (k === i ? pts : m));
  return { run: { ...live, marks }, hit: { i, pts } };
}

export function runDone(run) { return run.marks.every(m => m !== null); }

export function struckAny(run) { return run.marks.some(m => m !== null); }

export function canCancel(run) { return !struckAny(run); }

export function runScore(run) { return run.marks.reduce((s, m) => s + (m || 0), 0); }

export function runCounts(run) {
  return {
    perfect: run.marks.filter(m => m === 2).length,
    good: run.marks.filter(m => m === 1).length,
    miss: run.marks.filter(m => m === 0).length,
  };
}

export function refundRate(score) {
  return (REFUND_BANDS.find(b => score >= b.min) || REFUND_BANDS[REFUND_BANDS.length - 1]).rate;
}

export function refundOf(coins, score) {
  return Math.floor((coins || 0) * refundRate(score) + 1e-9);
}

export function refundBand(score) {
  return REFUND_BANDS.length - 1 - REFUND_BANDS.findIndex(b => score >= b.min);
}
