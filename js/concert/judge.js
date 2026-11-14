import { JUDGE_MS } from '../data/concert.js';

const GAP_CAP = 0.45;

export function windowsFor(ease = 1, minGapMs = Infinity) {
  const good = Math.min(JUDGE_MS.good * ease, minGapMs * GAP_CAP);
  return { perfect: Math.min(JUDGE_MS.perfect * ease, good / 2), good };
}

export function makeJudge(chart, win) {
  const marks = chart.map(() => null);
  let cursor = 0;
  let combo = 0;
  let maxCombo = 0;

  const mark = (i, kind) => {
    marks[i] = kind;
    combo = kind === 'miss' ? 0 : combo + 1;
    maxCombo = Math.max(maxCombo, combo);
  };

  const tap = (lane, tMs) => {
    let best = -1;
    let bestOff = Infinity;
    for (let i = cursor; i < chart.length && chart[i].t - tMs <= win.good; i++) {
      if (marks[i] || chart[i].lane !== lane) continue;
      const off = Math.abs(chart[i].t - tMs);
      if (off <= win.good && off < bestOff) { best = i; bestOff = off; }
    }
    if (best < 0) return null;
    const kind = bestOff <= win.perfect ? 'perfect' : 'good';
    mark(best, kind);
    return { index: best, kind, offset: tMs - chart[best].t };
  };

  const sweep = (tMs) => {
    const missed = [];
    while (cursor < chart.length && (marks[cursor] || tMs - chart[cursor].t > win.good)) {
      if (!marks[cursor]) { mark(cursor, 'miss'); missed.push(cursor); }
      cursor += 1;
    }
    return missed;
  };

  const summary = () => {
    const n = { perfect: 0, good: 0, miss: 0 };
    for (const k of marks) if (k) n[k] += 1;
    const score = n.perfect * 2 + n.good;
    const max = chart.length * 2;
    return { ...n, score, max, ratio: max ? score / max : 0, maxCombo };
  };

  return { tap, sweep, summary, done: () => cursor >= chart.length };
}
