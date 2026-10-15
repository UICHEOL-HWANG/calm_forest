import { pathToFileURL } from 'node:url';
import { centerX, COURSE } from '../../js/mountain/course.js';
import { createSled, stepSled, tryBoost, finalTimeMs } from '../../js/mountain/sled.js';

function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

function nextObstacle(s, lookahead) {
  return COURSE.obstacles.find((o, i) => !s.hitIds.includes(i) && o.z > s.z - o.r && o.z - s.z < lookahead);
}

export function simulate({ skill, acorns, seed }) {
  const r = rng(seed);
  const reaction = 1 + Math.round((1 - skill) * 20);
  const lookahead = 5 + skill * 15;
  const lead = 1.5 + (1 - skill) * 6;
  const margin = 0.75 + (1 - skill) * 1.2;
  const boostZ = Array.from({ length: acorns }, (_, i) => 20 + i * (280 / Math.max(1, acorns)));
  let s = createSled(acorns);
  let steer = 0;
  let frame = 0;
  let plan = null;
  while (!s.finished && s.t < 120000) {
    if (boostZ.length && s.z >= boostZ[0]) { s = tryBoost(s); boostZ.shift(); }
    if (frame % reaction === 0) {
      const o = nextObstacle(s, lookahead);
      const seen = o && r() < 0.15 + skill * 0.85;
      if (seen) {
        const dir = o.x >= centerX(o.z) ? -1 : 1;
        plan = { z: o.z, off: (o.x - centerX(o.z)) + dir * (o.r + margin) };
      }
      if (plan && s.z > plan.z + 2.5) plan = null;
      const wobble = (r() - 0.5) * (1 - skill) * 3;
      const aim = (centerX(s.z + lead) + (plan ? plan.off : 0)) + wobble;
      steer = Math.abs(aim - s.x) < 0.12 ? 0 : Math.sign(aim - s.x);
    }
    s = stepSled(s, 16, steer);
    frame += 1;
  }
  return { timeMs: finalTimeMs(s), flags: s.flagsPassed, hits: s.hits.length, boosts: s.boostsAt.length };
}

export function profile(skill, acorns, n) {
  const runs = Array.from({ length: n }, (_, i) => simulate({ skill, acorns, seed: i + 1 }));
  const times = runs.map(x => x.timeMs).sort((a, b) => a - b);
  const q = p => times[Math.min(times.length - 1, Math.floor(p * times.length))];
  const mean = f => runs.reduce((a, x) => a + f(x), 0) / n;
  return { p10: q(0.1), p50: q(0.5), p90: q(0.9), meanFlags: mean(x => x.flags), meanHits: mean(x => x.hits) };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  for (const skill of [0.3, 0.6, 0.9]) {
    for (const acorns of [0, 3, 6]) {
      console.log(JSON.stringify({ skill, acorns, ...profile(skill, acorns, 500) }));
    }
  }
}
