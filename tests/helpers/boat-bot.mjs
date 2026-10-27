import { buildCourseData, COURSES } from '../../js/boat/course.js';
import * as A from '../../js/boat/abilities.js';
import { BOATS } from '../../js/boat/boats.js';
import { BOAT_BASE_SPEED, RIVER_LEN, RIVER_W, RIVER_OBS } from '../../js/boat/consts.js';

const DT = 1 / 30, LOOK = 20, REACT = 0.35;
const LANES = [-5, -3.5, -2, -0.5, 0.5, 2, 3.5, 5];

export function runBot(boatId, seed, course = 'calm') {
  const cfg = COURSES[course];
  const live = buildCourseData(seed, { night: false, course }).items.map(i => ({ ...i, done: false }));
  const b = BOATS[boatId], sp = A.steerParams(boatId);
  let x = 0, vx = 0, dist = 0, t = 0, lamps = b.lamps, stars = 0, hits = 0, stunUntil = 0, invUntil = 0;
  let skillUntil = 0, skillReadyAt = 0, rideBoostUntil = 0, decideAt = 0, target = 0;
  while (dist < RIVER_LEN && lamps > 0 && t < 200) {
    t += DT;
    let speed = BOAT_BASE_SPEED * (1 + (dist / RIVER_LEN) * 0.55) * cfg.speedMul;
    if (t < rideBoostUntil) speed *= A.RIDE.boost;
    if (t < stunUntil) speed = 0;
    dist += speed * DT;
    for (const o of live) if (o.drift) o.x = Math.max(-RIVER_W + 2, Math.min(RIVER_W - 2, o.x + o.drift * DT));
    if (t >= decideAt) {
      decideAt = t + REACT;
      const ahead = live.filter(o => !o.done && RIVER_OBS[o.kind]?.hit && o.d - dist > 0 && o.d - dist < LOOK);
      const score = lx => Math.min(9, ...ahead.map(o => Math.abs(o.x - lx) - A.hitRadius(boatId, o.kind))) - Math.abs(lx - x) * 0.05;
      target = LANES.reduce((best, lx) => (score(lx) > score(best) ? lx : best), x);
      if (A.skillReady(b.skill, t, skillReadyAt) && ahead.some(o => o.d - dist < 6 && Math.abs(o.x - x) < 2)) {
        const s = A.startSkill(b.skill, t); skillUntil = s.until; skillReadyAt = s.readyAt;
      }
    }
    if (t >= stunUntil) vx += Math.max(-1, Math.min(1, (target - x) * 0.8)) * sp.acc * DT;
    vx *= Math.pow(0.06, DT);
    vx = Math.max(-sp.maxVx, Math.min(sp.maxVx, vx));
    x = Math.max(-RIVER_W + 0.7, Math.min(RIVER_W - 0.7, x + vx * DT));
    for (const o of live) {
      if (o.done || Math.abs(o.d - dist) > 1.0) continue;
      const dx = Math.abs(o.x - x);
      if (o.kind === 'star') { if (dx < 1.5 && t >= skillUntil) { o.done = true; stars++; } continue; }
      if (o.kind === 'whirl') {
        if (dx < RIVER_OBS.whirl.r + 1) { o.done = true; if (A.whirlMode(boatId) === 'ride') rideBoostUntil = t + A.RIDE.spin + A.RIDE.boostDur; }
        continue;
      }
      if (!RIVER_OBS[o.kind]?.hit || !A.isHit(dx, boatId, o.kind)) continue;
      o.done = true;
      if (t < invUntil) continue;
      if (A.obstacleOutcome(boatId, o.kind, { diving: t < skillUntil, ramLeft: 0 }) === 'hit') {
        lamps--; hits++; stunUntil = t + 1.15; invUntil = stunUntil + 1.0;
      }
    }
  }
  return { result: lamps > 0 && dist >= RIVER_LEN ? 'clear' : 'wreck', stars, hits };
}
