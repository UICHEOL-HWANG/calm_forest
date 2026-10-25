import { pathToFileURL } from 'node:url';
import { centerX, COURSE, moverPos } from '../../js/mountain/course.js';
import { SLOPE_M_PER_UNIT } from '../../js/mountain/terrain.js';
import { SHIELD_PER_RUN } from '../../js/mountain/sled-moves.js';
import { PHYS, createSled, stepSled, tryBoost, finalTimeMs, hitReach } from '../../js/mountain/sled.js';

function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

function nextObstacle(s, lookahead, course = COURSE) {
  const fixed = course.obstacles
    .filter((o, i) => !s.hitIds.includes(i))
    .map(o => ({ z: o.z, x: o.x, rz: hitReach(o).z, rx: hitReach(o).x, cz: o.z }));
  const moving = (course.movers || []).map((m, mi) => moverAhead(s, m, mi, course)).filter(Boolean)
    .map(c => ({ z: (c.z + c.end) / 2, x: c.x, rz: (c.end - c.z) / 2, rx: c.r + SLED_W, cz: (c.z + c.end) / 2 }));
  return [...fixed, ...moving]
    .filter(o => o.z + o.rz > s.z && o.z - s.z < lookahead)
    .sort((a, b) => a.z - b.z)[0];
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

const SLED_W = 0.43, SLED_L = 0.75, PAD = 0.45;

function window(c, sides, course) {
  if (c.flag) return [c.flag.x - c.flag.half + 0.4, c.flag.x + c.flag.half - 0.4];
  const half = course.width / 2, cx = centerX(c.z);
  if (c.mover) {
    const gap = c.r + SLED_W + PAD;
    return sides[c.i] > 0 ? [c.x + gap, cx + half - 0.3] : [cx - half + 0.3, c.x - gap];
  }
  const o = course.obstacles[c.i], r = hitReach(o);
  return sides[c.i] > 0 ? [o.x + r.x + PAD, cx + half - 0.3] : [cx - half + 0.3, o.x - r.x - PAD];
}

function moverAhead(s, m, mi, course) {
  if (s.moverHitIds.includes(mi)) return null;
  const reach = (m.r + SLED_L) / SLOPE_M_PER_UNIT, sp = Math.max(s.speed, 1);
  const now = moverPos(m, s.t);
  if (now.z + reach < s.z) return null;
  const dt = m.kind === 'ball' ? (now.z - s.z) / Math.max(0.5, sp - m.v) : (m.z - s.z) / sp;
  const p = moverPos(m, s.t + Math.max(0, dt) * 1000);
  return { z: p.z - reach, end: p.z + reach, i: course.obstacles.length + mi, mover: true, x: p.x, r: m.r };
}

function chainAhead(s, course) {
  const flags = course.flags.slice(s.flagIdx).map(f => ({ z: f.z, end: f.z, flag: f }));
  const obs = course.obstacles
    .map((o, i) => ({ z: o.z - hitReach(o).z, end: o.z + hitReach(o).z, i }))
    .filter(c => !s.hitIds.includes(c.i) && c.end > s.z);
  const movers = (course.movers || []).map((m, mi) => moverAhead(s, m, mi, course)).filter(Boolean);
  return [...flags, ...obs, ...movers].sort((a, b) => a.z - b.z).slice(0, CHAIN);
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
  const pick = side => Object.assign([...sides], { [res.need]: side });
  return perfectLine(course, acorns, pick(1), phys) || perfectLine(course, acorns, pick(-1), phys);
}

const TIME_SCALE = PHYS.baseSpeed / 8.6;

export function simulate({ skill, acorns, seed }) {
  const r = rng(seed);
  const reaction = 1 + Math.round(((1 - skill) * 20) / TIME_SCALE);
  const lookSec = (5 + skill * 15) / 8.6;
  const lead = 1.5 + (1 - skill) * 6;
  const margin = 0.75 + (1 - skill) * 1.2;
  const boostZ = Array.from({ length: acorns }, (_, i) => 20 + i * (280 / Math.max(1, acorns)));
  let s = createSled(acorns, PHYS, { shield: SHIELD_PER_RUN });
  let steer = 0;
  let frame = 0;
  let plan = null;
  while (!s.finished && s.t < 120000) {
    if (boostZ.length && s.z >= boostZ[0]) { s = tryBoost(s); boostZ.shift(); }
    if (frame % reaction === 0) {
      const o = nextObstacle(s, s.speed * lookSec);
      const seen = o && r() < 0.15 + skill * 0.85;
      if (seen) {
        const dir = o.x >= centerX(o.cz) ? -1 : 1;
        plan = { z: o.z + o.rz, front: o.z - o.rz, x: o.x + dir * (o.rx + margin) };
      }
      if (plan && s.z > plan.z) plan = null;
      const wobble = (r() - 0.5) * (1 - skill) * 3;
      const aim = gateAim(s, plan, plan ? plan.x : centerX(s.z + lead)) + wobble;
      const glide = s.vx / PHYS.steerGlide;
      steer = Math.abs(aim - s.x - glide) < 0.12 ? 0 : Math.sign(aim - s.x - glide);
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
