import { PESTS, DELVE_HALF, PEST_LURK_DIST, PEST_CATCH_R, PEST_DARK_SEC, PEST_LOST_SEC, SOFT_PERIOD, SOFT_WINDOW, MIMIC_DIST } from '../data/delve.js';

export const RING_SEC = 3;
export const GRAB_R = 0.45;
export const TAP_R = 1.8;
export const BAIT_R = 3.5;
export const BAIT_EAT_SEC = 6;
export const NOTICE_R = 9;
export const PICK_R = 0.8;
export const DARK_R = 4;
export const PLUG_R = 1.8;

const d2 = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

const restState = p => (p.kind === 'axolotl' ? 'hide' : 'idle');

export function createPest(kind, at, home, { asleep = false } = {}) {
  return { kind, state: asleep ? 'sleep' : restState({ kind }), x: at.x, z: at.z, home: { ...home }, spawn: { x: at.x, z: at.z }, targetId: null, carryId: null, t: 0 };
}

function moveToward(p, to, speed, dt) {
  const dx = to.x - p.x, dz = to.z - p.z, len = Math.hypot(dx, dz);
  if (len < 1e-6) return { ...p };
  const s = Math.min(len, speed * dt);
  return { ...p, x: p.x + (dx / len) * s, z: p.z + (dz / len) * s };
}

export function grabChunk(p, chunkId) { return { ...p, state: 'carry', carryId: chunkId, targetId: null, spot: null }; }

function lurkSpot(p, at, turn = 0) {
  const a = Math.atan2(p.z - at.z, p.x - at.x) + turn;
  return { x: at.x + Math.cos(a) * PEST_LURK_DIST, z: at.z + Math.sin(a) * PEST_LURK_DIST };
}

const wanted = (p, c) => !(p.kind === 'bat' && c.age < RING_SEC) && d2(p, c) <= NOTICE_R;

export function stepPest(p, dt, w) {
  const speed = PESTS[p.kind].speed;
  const events = [];
  if (['gone', 'sleep', 'mimic'].includes(p.state)) return { pest: p, events };
  if (['eat', 'away', 'lost'].includes(p.state)) {
    const t = p.t - dt;
    const q = p.state === 'away' && w.lureAt ? moveToward(p, w.lureAt, speed, dt) : p;
    return { pest: t <= 0 ? { ...q, state: restState(q), t: 0 } : { ...q, t }, events };
  }
  if (p.state === 'flee') {
    const q = moveToward(p, p.home, speed * 1.5, dt);
    return { pest: d2(q, p.home) < 0.3 ? { ...q, state: 'gone' } : q, events };
  }
  if (p.state === 'carry') {
    const q = moveToward(p, w.burrowAt, speed, dt);
    if (d2(q, w.burrowAt) < 0.3) { events.push({ type: 'stash', chunkId: p.carryId }); return { pest: { ...q, state: 'gone', carryId: null }, events }; }
    return { pest: q, events };
  }
  const target = w.chunks.filter(c => wanted(p, c)).sort((a, b) => d2(p, a) - d2(p, b))[0];
  if (!target) {
    if (w.rest) {
      const q = moveToward({ ...p, state: restState(p), targetId: null }, p.home, speed, dt);
      return { pest: d2(q, p.home) < 0.3 ? { ...q, state: 'sleep' } : q, events };
    }
    if (w.lurkAt && d2(p, w.lurkAt) <= NOTICE_R) {
      const same = ['lurk', 'doze'].includes(p.state) && p.spot && p.spot.ax === w.lurkAt.x && p.spot.az === w.lurkAt.z;
      if (same && p.state === 'doze') return { pest: p, events };
      const spot = same ? p.spot : { ...lurkSpot(p, w.lurkAt, w.lurkTurn || 0), ax: w.lurkAt.x, az: w.lurkAt.z };
      const q = moveToward({ ...p, state: 'lurk', targetId: null, spot }, spot, speed, dt);
      return { pest: p.kind === 'dormouse' && d2(q, spot) < 0.05 ? { ...q, state: 'doze' } : q, events };
    }
    return { pest: ['approach', 'lurk', 'doze'].includes(p.state) ? { ...p, state: restState(p), targetId: null, spot: null } : p, events };
  }
  const q = moveToward({ ...p, state: 'approach', targetId: target.id }, target, speed, dt);
  if (d2(q, target) <= GRAB_R) { events.push({ type: 'grab', chunkId: target.id }); return { pest: grabChunk(q, target.id), events }; }
  return { pest: q, events };
}

export function counterFor(p) {
  if (p.kind === 'axolotl' && ['lurk', 'approach', 'carry'].includes(p.state)) return 'tap';
  if (p.kind === 'crab' && ['lurk', 'approach'].includes(p.state)) return 'bait';
  if (p.kind === 'moth' && ['lurk', 'approach'].includes(p.state)) return 'dark';
  if (p.kind === 'mole' && p.state === 'lurk') return 'plug';
  return null;
}

const NO_CATCH = ['bat', 'roller'];

export function catchAtBreak(pests, at, { soft = false } = {}) {
  let best = -1, bd = PEST_CATCH_R;
  pests.forEach((p, i) => {
    const d = d2(p, at);
    const ready = (p.state === 'lurk' && !NO_CATCH.includes(p.kind)) || (p.state === 'doze' && !soft);
    if (ready && d <= bd) { best = i; bd = d; }
  });
  return best;
}

export function rollerAtBreak(pests, at) {
  return pests.findIndex(p => p.kind === 'roller' && p.state === 'lurk' && d2(p, at) <= PEST_CATCH_R * 1.5);
}

export function mimicSpot(chunk, player) {
  const a = Math.atan2(chunk.z - player.z, chunk.x - player.x) + Math.PI / 2;
  return { x: chunk.x + Math.cos(a) * MIMIC_DIST, z: chunk.z + Math.sin(a) * MIMIC_DIST };
}

export function softOk(sec) {
  const ph = (sec % SOFT_PERIOD) / SOFT_PERIOD;
  return ph >= SOFT_WINDOW[0] && ph <= SOFT_WINDOW[1];
}

export function darkPest(p, player) {
  if (counterFor(p) !== 'dark' || d2(p, player) > DARK_R) return null;
  return { ...p, state: 'away', t: PEST_DARK_SEC, targetId: null, spot: null };
}

export function plugPest(p, player, to) {
  if (counterFor(p) !== 'plug' || d2(p, player) > PLUG_R) return null;
  return { ...p, state: 'lost', t: PEST_LOST_SEC, x: to.x, z: to.z, targetId: null, spot: null };
}

export function floorTally({ kept, lost, pending }) {
  return { kept, lost: lost + pending, any: kept + lost + pending > 0 };
}

export function tapPest(p, player) {
  if (counterFor(p) !== 'tap' || d2(p, player) > TAP_R) return null;
  const events = p.carryId ? [{ type: 'spit', chunkId: p.carryId, x: p.x, z: p.z }] : [];
  return { pest: { ...p, state: 'flee', carryId: null, targetId: null }, events };
}

export function baitPest(p, at) {
  if (counterFor(p) !== 'bait' || d2(p, at) > BAIT_R) return null;
  return { ...p, state: 'eat', t: BAIT_EAT_SEC, targetId: null };
}

export function pickableBeforeBat(chunk) { return chunk.age < RING_SEC; }

export function canPick(chunk, player) { return d2(chunk, player) <= PICK_R; }

export const PUSH_R = 0.75;

const ROOM_LIM = DELVE_HALF - 0.3;
const clampRoom = v => Math.max(-ROOM_LIM, Math.min(ROOM_LIM, v));

export function pushOffPlayer(p, player) {
  if (['gone', 'hide', 'sleep', 'mimic', 'doze'].includes(p.state)) return p;
  if (p.state === 'carry' && d2(p, p.home) < 1) return p;
  const dx = p.x - player.x, dz = p.z - player.z, d = Math.hypot(dx, dz);
  if (d >= PUSH_R) return p;
  const [ux, uz] = d > 1e-6 ? [dx / d, dz / d] : [1, 0];
  return { ...p, x: clampRoom(player.x + ux * PUSH_R), z: clampRoom(player.z + uz * PUSH_R) };
}
