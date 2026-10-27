import { RIVER_W, RIVER_LEN, RIVER_OBS, RIVER_PICKS } from './consts.js';
import { placeChest } from '../boat-chest.js';

export const COURSE_V = 2;
export const FORK_X = [-1.0, 3.2];

export const COURSES = {
  calm: {
    first: 70, gapMul: 1, speedMul: 1, starP: 0.78, pickP: 0.22, matMul: 1, fork: null, falls: [],
    kinds: [['rock'], ['rock', 'log', 'whirl', 'rock'], ['rock', 'log', 'whirl', 'pile', 'rock']],
  },
  rapid: {
    first: 40, gapMul: 0.72, speedMul: 1.2, starP: 0.47, pickP: 0.16, matMul: 1.5, fork: [270, 330], falls: [180, 450],
    kinds: [['rock', 'log', 'rock'], ['rock', 'log', 'whirl', 'rock', 'pile'], ['rock', 'log', 'whirl', 'pile', 'pile', 'rock']],
  },
};

export const courseSeedKey = (runNo, course) => `river:${runNo}:${course}`;

export function mulberry32(a) {
  return function () {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function clampW(x, pad = 1.1) { return Math.max(-RIVER_W + pad, Math.min(RIVER_W - pad, x)); }

export function buildCourseData(seed, { night = false, chest = false, course = 'calm' } = {}) {
  const cfg = COURSES[course] || COURSES.calm;
  const rnd = mulberry32(seed);
  const items = [];
  const fork = cfg.fork ? { d0: cfg.fork[0], d1: cfg.fork[1], x0: FORK_X[0], x1: FORK_X[1] } : null;
  const inFork = d => !!fork && d > fork.d0 && d < fork.d1;
  const nearFall = d => cfg.falls.some(f => Math.abs(d - f) < 10);
  const blocked = (dd, x) => nearFall(dd) || (!!fork && dd >= fork.d0 && dd <= fork.d1 && x >= fork.x0 - 1 && x <= fork.x1 + 1);
  const keep = [];
  let d = cfg.first;
  while (d < RIVER_LEN - 24) {
    const p = d / RIVER_LEN;
    const seg = p < 0.34 ? 0 : p < 0.67 ? 1 : 2;
    const gap = ((seg === 0 ? 26 : seg === 1 ? 17 : 12.5) + rnd() * 8) * cfg.gapMul;
    const kinds = cfg.kinds[seg];
    const kind = kinds[Math.floor(rnd() * kinds.length)];
    const gx = rnd() * 2 - 1;
    if (inFork(d)) {
      items.push({ d, kind: 'rock', x: -RIVER_W + 2.2 + (gx + 1) * 0.6 });
    } else if (!nearFall(d)) {
      if (kind === 'pile') {
        const cx = gx * (RIVER_W - 3);
        items.push({ d, kind: 'pile', x: cx - 2.4 }, { d, kind: 'pile', x: cx + 2.4 });
      } else {
        items.push({ d, kind, x: clampW(gx * RIVER_W, RIVER_OBS[kind].r + 0.3), drift: kind === 'log' ? (rnd() * 2 - 1) * 0.7 : 0 });
      }
    }
    if (rnd() < cfg.starP && !inFork(d)) {
      const n = 3 + Math.floor(rnd() * 3);
      const sx = (rnd() * 2 - 1) * (RIVER_W - 1.4), curve = (rnd() * 2 - 1) * 0.9;
      for (let i = 0; i < n; i++) keep.push({ d: d + gap * 0.42 + i * 2.7, kind: 'star', x: clampW(sx + curve * i) });
    }
    if (rnd() < cfg.pickP) {
      const cands = RIVER_PICKS.filter(k => !k.night || night);
      const k = cands[Math.floor(rnd() * cands.length)];
      keep.push({ d: d + gap * 0.68, kind: 'pick', pick: k.id, x: clampW((rnd() * 2 - 1) * RIVER_W, 1.3) });
    }
    d += gap;
  }
  for (const o of keep) if (!blocked(o.d, o.x)) items.push(o);
  if (fork) for (let s = fork.d0 + 4; s < fork.d1 - 4; s += 3.2) items.push({ d: s, kind: 'star', x: RIVER_W - 1.5 });
  if (chest) {
    const c = placeChest(rnd, { len: RIVER_LEN, width: RIVER_W });
    const fall = cfg.falls.find(f => Math.abs(c.d - f) < 10);
    if (fall !== undefined) c.d = c.d < fall ? fall - 10 : fall + 10;
    const near = items.filter(o => RIVER_OBS[o.kind] && Math.abs(o.d - c.d) < 4);
    const clash = x => near.some(o => Math.abs(o.x - x) < RIVER_OBS[o.kind].r + 1.6);
    if (clash(c.x)) c.x = clash(-c.x) ? clampW(c.x + (c.x > 0 ? -3.2 : 3.2), 1.3) : -c.x;
    items.push({ d: c.d, kind: 'chest', x: c.x });
  }
  items.sort((a, b) => a.d - b.d);
  return { items, fork, falls: [...cfg.falls] };
}
