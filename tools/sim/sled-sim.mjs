import { pathToFileURL } from 'node:url';
import { centerX, COURSE } from '../../js/mountain/course.js';
import { PHYS, createSled, stepSled, tryBoost, finalTimeMs, hitReach } from '../../js/mountain/sled.js';

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

function steerToward(s, aim, gain = 2.5) {
  return Math.max(-1, Math.min(1, (aim - s.x) * gain));
}

const CHAIN = 2;

function window(c, sides, course) {
  if (c.flag) return [c.flag.x - c.flag.half + 0.4, c.flag.x + c.flag.half - 0.4];
  const o = course.obstacles[c.i], r = hitReach(o), half = course.width / 2, cx = centerX(o.z);
  return sides[c.i] > 0 ? [o.x + r.x + 0.45, cx + half - 0.3] : [cx - half + 0.3, o.x - r.x - 0.45];
}

function chainAhead(s, course) {
  const flags = course.flags.slice(s.flagIdx).map(f => ({ z: f.z, end: f.z, flag: f }));
  const obs = course.obstacles
    .map((o, i) => ({ z: o.z - hitReach(o).z, end: o.z + hitReach(o).z, i }))
    .filter(c => !s.hitIds.includes(c.i) && c.end > s.z);
  return [...flags, ...obs].sort((a, b) => a.z - b.z).slice(0, CHAIN);
}

function lineSteer(s, sides, course) {
  const chain = chainAhead(s, course);
  const need = chain.find(c => !c.flag && sides[c.i] === undefined);
  if (need) return { need: need.i };
  const aim = chain.reduceRight((next, c) => {
    const [lo, hi] = window(c, sides, course);
    return Math.max(lo, Math.min(hi, next ?? (lo + hi) / 2));
  }, null) ?? centerX(s.z + 3);
  return { steer: steerToward(s, aim) };
}

function rideLine(sides, course, acorns, phys) {
  const boostZ = Array.from({ length: acorns }, (_, i) => 20 + i * (280 / Math.max(1, acorns)));
  let s = createSled(acorns, phys);
  while (!s.finished && s.t < 120000) {
    if (boostZ.length && s.z >= boostZ[0]) { s = tryBoost(s); boostZ.shift(); }
    const c = lineSteer(s, sides, course);
    if (c.need !== undefined) return { need: c.need };
    s = stepSled(s, 16, c.steer, course);
    if (s.hits.length || s.splits.some(x => !x[0])) return { fail: true };
  }
  return { sled: s };
}

export function perfectLine(course = COURSE, acorns = 0, sides = [], phys = PHYS) {
  const res = rideLine(sides, course, acorns, phys);
  if (res.sled) return { sides, sled: res.sled };
  if (res.fail) return null;
  return perfectLine(course, acorns, [...sides, 1], phys) || perfectLine(course, acorns, [...sides, -1], phys);
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
      steer = Math.abs(aim - s.x - s.vx * 0.36) < 0.12 ? 0 : Math.sign(aim - s.x - s.vx * 0.36);
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
