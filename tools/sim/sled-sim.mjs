import { pathToFileURL } from 'node:url';
import { centerX, COURSE } from '../../js/mountain/course.js';
import { createSled, stepSled, tryBoost, finalTimeMs, hitReach } from '../../js/mountain/sled.js';

function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

function nextObstacle(s, lookahead, course = COURSE) {
  return course.obstacles.find((o, i) => {
    const r = hitReach(o);
    return !s.hitIds.includes(i) && o.z + r.z > s.z && o.z - s.z < lookahead;
  });
}

function gateAim(s, plan, aim, course = COURSE) {
  const f = course.flags[s.flagIdx];
  if (!plan || !f || f.z >= plan.front) return aim;
  return Math.max(f.x - f.half + 0.4, Math.min(f.x + f.half - 0.4, aim));
}

function lineSteer(s, sides, course) {
  const i = course.obstacles.findIndex((o, k) => !s.hitIds.includes(k) && o.z + hitReach(o).z > s.z);
  const o = course.obstacles[i];
  const r = o ? hitReach(o) : null;
  const near = o && s.z > o.z - r.z - 4;
  if (near && sides[i] === undefined) return { need: i };
  const f = course.flags[s.flagIdx];
  const want = near ? o.x + sides[i] * (r.x + 0.45) : (f ? f.x : centerX(s.z + 3));
  const aim = gateAim(s, o ? { front: o.z - r.z } : null, want, course);
  return { steer: Math.abs(aim - s.x) < 0.05 ? 0 : Math.sign(aim - s.x) };
}

function rideLine(sides, course, acorns) {
  const boostZ = Array.from({ length: acorns }, (_, i) => 20 + i * (280 / Math.max(1, acorns)));
  let s = createSled(acorns);
  while (!s.finished && s.t < 120000) {
    if (boostZ.length && s.z >= boostZ[0]) { s = tryBoost(s); boostZ.shift(); }
    const c = lineSteer(s, sides, course);
    if (c.need !== undefined) return { need: c.need };
    s = stepSled(s, 16, c.steer, course);
    if (s.hits.length || s.splits.some(x => !x[0])) return { fail: true };
  }
  return { sled: s };
}

export function perfectLine(course = COURSE, acorns = 0, sides = []) {
  const res = rideLine(sides, course, acorns);
  if (res.sled) return { sides, sled: res.sled };
  if (res.fail) return null;
  return perfectLine(course, acorns, [...sides, 1]) || perfectLine(course, acorns, [...sides, -1]);
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
        plan = { z: o.z + hitReach(o).z, front: o.z - hitReach(o).z, x: o.x + dir * (hitReach(o).x + margin) };
      }
      if (plan && s.z > plan.z) plan = null;
      const wobble = (r() - 0.5) * (1 - skill) * 3;
      const aim = gateAim(s, plan, plan ? plan.x : centerX(s.z + lead)) + wobble;
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
