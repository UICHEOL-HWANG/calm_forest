import { DIVE, DIVE_SPECIES, diveSpeciesPool, pickWeighted } from './logic.js';
import { appendCapped, diveLeg, divePick } from './run.js';

export const DIVE_AREA = { X0: -16, X1: 16, Z0: -29, Z1: -3, START_ITEMS: 34, MIN_ITEMS: 22, GAP: 1.8, SURF_Y: -.75, LIFT: .55, OUT_SPEED: 4.5, VERT: 2.2 };

export function diveDepthAt(x, z) {
  const base = Math.min(11, Math.max(1.8, 1.8 + (6 - z) * .26));
  return base + .45 * Math.sin(x * .55) * Math.cos(z * .45) + .25 * Math.sin(x * 1.3 + z * .7);
}

const swimY = p => -diveDepthAt(p.x, p.z) + DIVE_AREA.LIFT;

function spawnItem(run) {
  for (let k = 0; k < 20; k++) {
    const x = DIVE_AREA.X0 + run.rnd() * (DIVE_AREA.X1 - DIVE_AREA.X0);
    const z = DIVE_AREA.Z0 + run.rnd() * (DIVE_AREA.Z1 - DIVE_AREA.Z0);
    if (run.items.some(i => Math.hypot(i.x - x, i.z - z) < DIVE_AREA.GAP)) continue;
    const d = diveDepthAt(x, z);
    const it = { id: run.nextId++, x, z, d, sp: pickWeighted(diveSpeciesPool(d), run.rnd()), ph: run.rnd() * 6 };
    run.items = [...run.items, it];
    return it;
  }
  return null;
}

export function createDiveRun({ rnd, breath = DIVE.BREATH, reach = DIVE.REACH }) {
  const run = {
    rnd, breath, reach, state: 'surface', y: DIVE_AREA.SURF_Y, air: 1, dives: 0, over: false,
    items: [], nextId: 1, carry: [], bag: {}, good: 0, bad: 0, legs: [], picks: [],
    legStart: 0, legMax: 0, legOut: false,
  };
  for (let tries = 0; run.items.length < DIVE_AREA.START_ITEMS && tries < 400; tries++) spawnItem(run);
  return run;
}

export function nearestDiveItem(run, p, reach = run.reach) {
  let best = null, bd = reach;
  for (const it of run.items) {
    const d = Math.hypot(it.x - p.x, it.z - p.z);
    if (d < bd && Math.abs(-it.d - run.y) < DIVE_AREA.VERT) { bd = d; best = it; }
  }
  return best;
}

export function pressDive(run, p, tMs) {
  if (run.over) return { kind: 'none' };
  if (run.state === 'surface') {
    run.state = 'descend'; run.legStart = tMs; run.legMax = 0; run.legOut = false;
    return { kind: 'dive' };
  }
  if (run.state !== 'swim') return { kind: 'none' };
  const it = nearestDiveItem(run, p);
  if (!it) return { kind: 'none' };
  run.items = run.items.filter(i => i !== it);
  run.carry = [...run.carry, it.sp];
  run.good += 1;
  run.picks = appendCapped(run.picks, divePick(tMs, it.d, DIVE_SPECIES.indexOf(it.sp), run.air));
  while (run.items.length < DIVE_AREA.MIN_ITEMS && spawnItem(run));
  return { kind: 'pick', item: it };
}

export function ascendDive(run) {
  if (run.state === 'swim' || run.state === 'descend') run.state = 'ascend';
}

function surface(run, tMs) {
  run.state = 'surface'; run.y = DIVE_AREA.SURF_Y; run.dives += 1;
  run.carry.forEach(sp => { run.bag = { ...run.bag, [sp.id]: (run.bag[sp.id] || 0) + 1 }; });
  run.legs = appendCapped(run.legs, diveLeg(run.dives, run.legStart, tMs, run.legMax, run.carry.length, run.air, run.legOut));
  if (run.legOut) run.bad += 1;
  run.carry = [];
  run.air = 1;
  if (run.dives >= DIVE.DIVES) run.over = true;
}

export function stepDiveRun(run, dt, p, tMs) {
  const ev = { surfaced: false, outOfAir: false, over: run.over };
  if (run.over || run.state === 'surface') return ev;
  run.air = Math.max(0, run.air - dt / run.breath);
  if (run.state === 'descend') {
    run.y -= DIVE.DESCEND * dt;
    if (run.y <= swimY(p)) { run.y = swimY(p); run.state = 'swim'; }
  } else if (run.state === 'swim') {
    run.y = swimY(p);
  } else if (run.state === 'ascend') {
    run.y += (run.air <= 0 ? DIVE_AREA.OUT_SPEED : DIVE.ASCEND) * dt;
    if (run.y >= DIVE_AREA.SURF_Y) { surface(run, tMs); ev.surfaced = true; ev.over = run.over; return ev; }
  }
  run.legMax = Math.max(run.legMax, -run.y);
  if (run.air <= 0 && run.state !== 'ascend') { run.state = 'ascend'; run.legOut = true; ev.outOfAir = true; }
  return ev;
}
