import { MUDFLAT, MUD_SPECIES, tideFront, pickWeighted, inBreathWindow } from './logic.js';
import { mudAct, appendCapped } from './run.js';

export const MUD_AREA = { X0: -11, X1: 11, Z1: 11, START_HOLES: 16, GAP: 1.6, PLAYER_GAP: 1.2, SPAWN_EVERY: .9, MARGIN: 1.5 };

const holeTarget = front => 6 + Math.round(10 * Math.min(1, Math.max(0, (MUD_AREA.Z1 - front) / (MUD_AREA.Z1 - MUDFLAT.FRONT0))));

const removeHole = (run, h) => { run.holes = run.holes.filter(x => x !== h); };

function trySpawn(run, player) {
  const zMin = tideFront(run.t, run.tide) + MUD_AREA.MARGIN;
  if (zMin >= MUD_AREA.Z1) return null;
  for (let k = 0; k < 12; k++) {
    const x = MUD_AREA.X0 + run.rnd() * (MUD_AREA.X1 - MUD_AREA.X0);
    const z = zMin + run.rnd() * (MUD_AREA.Z1 - zMin);
    if (run.holes.some(h => Math.hypot(h.x - x, h.z - z) < MUD_AREA.GAP)) continue;
    if (player && Math.hypot(player.x - x, player.z - z) < MUD_AREA.PLAYER_GAP) continue;
    const h = { id: run.nextId++, x, z, sp: pickWeighted(MUD_SPECIES, run.rnd()), period: 2.2 + run.rnd() * 1.2, phase: run.rnd(), miss: 0 };
    run.holes = [...run.holes, h];
    return h;
  }
  return null;
}

export function createMudRun({ rnd, win, tide = MUDFLAT.TIDE, player = null, reach = MUDFLAT.REACH, missLimit = MUDFLAT.MISS_LIMIT }) {
  const run = { t: 0, tide, win, rnd, reach, missLimit, holes: [], nextId: 1, spawnT: 0, good: 0, bad: 0, lostTide: 0, lostMiss: 0, bag: {}, acts: [], over: false };
  for (let tries = 0; run.holes.length < MUD_AREA.START_HOLES && tries < 200; tries++) trySpawn(run, player);
  return run;
}

export function stepMudRun(run, dt, player) {
  if (run.over) return { spawned: [], gone: [], over: true };
  run.t += dt;
  const front = tideFront(run.t, run.tide);
  const gone = [];
  for (const h of run.holes) {
    h.phase += dt / h.period;
    if (h.z < front + .2) gone.push({ id: h.id, why: 'tide', hole: h });
  }
  if (gone.length) {
    run.holes = run.holes.filter(h => !gone.some(g => g.hole === h));
    run.lostTide += gone.length;
  }
  const spawned = [];
  run.spawnT += dt;
  if (run.spawnT >= MUD_AREA.SPAWN_EVERY) {
    run.spawnT = 0;
    if (run.holes.length < holeTarget(front)) { const h = trySpawn(run, player); if (h) spawned.push(h); }
  }
  if (run.t >= run.tide) run.over = true;
  return { spawned, gone, over: run.over };
}

export function nearestHole(run, p, reach = run.reach ?? MUDFLAT.REACH) {
  let best = null, bd = reach;
  for (const h of run.holes) { const d = Math.hypot(h.x - p.x, h.z - p.z); if (d < bd) { bd = d; best = h; } }
  return best;
}

export function digMudRun(run, player, tMs) {
  if (run.over) return { kind: 'none' };
  const h = nearestHole(run, player);
  if (!h) return { kind: 'none' };
  const hit = inBreathWindow(h.phase, run.win);
  run.acts = appendCapped(run.acts, mudAct(tMs, h.phase, hit, h.sp.depth, MUD_SPECIES.indexOf(h.sp)));
  if (hit) {
    removeHole(run, h);
    run.good += 1;
    run.bag = { ...run.bag, [h.sp.id]: (run.bag[h.sp.id] || 0) + 1 };
    return { kind: 'hit', hole: h, species: h.sp };
  }
  run.bad += 1;
  h.miss += 1;
  h.phase = Math.floor(h.phase) + .45;
  if (h.miss >= (run.missLimit ?? MUDFLAT.MISS_LIMIT)) {
    removeHole(run, h);
    run.lostMiss += 1;
    return { kind: 'miss', hole: h, gone: true };
  }
  return { kind: 'miss', hole: h, gone: false };
}
