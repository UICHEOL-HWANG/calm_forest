import { centerX } from '../../js/mountain/course.js';
import { createSled, stepSled, tryBoost, finalTimeMs } from '../../js/mountain/sled.js';

function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

export function simulate({ skill, acorns, seed }) {
  const r = rng(seed);
  const reaction = 1 + Math.round((1 - skill) * 14);
  const boostZ = Array.from({ length: acorns }, (_, i) => 20 + i * (280 / Math.max(1, acorns)));
  let s = createSled(acorns);
  let steer = 0;
  let frame = 0;
  while (!s.finished && s.t < 120000) {
    if (boostZ.length && s.z >= boostZ[0]) { s = tryBoost(s); boostZ.shift(); }
    if (frame % reaction === 0) {
      const aim = centerX(s.z + 5) + (r() - 0.5) * (1 - skill) * 10;
      steer = Math.abs(aim - s.x) < 0.4 ? 0 : Math.sign(aim - s.x);
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
  return { p10: q(0.1), p50: q(0.5), p90: q(0.9), meanFlags: runs.reduce((a, x) => a + x.flags, 0) / n };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  for (const skill of [0.3, 0.6, 0.9]) {
    for (const acorns of [0, 3, 6]) {
      console.log(JSON.stringify({ skill, acorns, ...profile(skill, acorns, 500) }));
    }
  }
}
