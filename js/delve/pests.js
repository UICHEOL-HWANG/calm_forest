import { PESTS, DELVE_HALF, PEST_LURK_DIST, PEST_CATCH_R } from '../data/delve.js';

export const RING_SEC = 3;
export const GRAB_R = 0.45;
export const TAP_R = 1.8;
export const BAIT_R = 3.5;
export const BAIT_EAT_SEC = 6;
export const NOTICE_R = 9;
export const PICK_R = 0.8;

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
  if (p.state === 'gone' || p.state === 'sleep') return { pest: p, events };
  if (p.state === 'eat') {
    const t = p.t - dt;
    return { pest: t <= 0 ? { ...p, state: 'idle', t: 0 } : { ...p, t }, events };
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
      const same = p.state === 'lurk' && p.spot && p.spot.ax === w.lurkAt.x && p.spot.az === w.lurkAt.z;
      const spot = same ? p.spot : { ...lurkSpot(p, w.lurkAt, w.lurkTurn || 0), ax: w.lurkAt.x, az: w.lurkAt.z };
      return { pest: moveToward({ ...p, state: 'lurk', targetId: null, spot }, spot, speed, dt), events };
    }
    return { pest: ['approach', 'lurk'].includes(p.state) ? { ...p, state: restState(p), targetId: null, spot: null } : p, events };
  }
  const q = moveToward({ ...p, state: 'approach', targetId: target.id }, target, speed, dt);
  if (d2(q, target) <= GRAB_R) { events.push({ type: 'grab', chunkId: target.id }); return { pest: grabChunk(q, target.id), events }; }
  return { pest: q, events };
}

export function counterFor(p) {
  if (p.kind === 'axolotl' && ['lurk', 'approach', 'carry'].includes(p.state)) return 'tap';
  if (p.kind === 'crab' && ['lurk', 'approach'].includes(p.state)) return 'bait';
  return null;
}

export function catchAtBreak(pests, at) {
  let best = -1, bd = PEST_CATCH_R;
  pests.forEach((p, i) => {
    const d = d2(p, at);
    if (p.state === 'lurk' && p.kind !== 'bat' && d <= bd) { best = i; bd = d; }
  });
  return best;
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
  if (['gone', 'hide', 'sleep'].includes(p.state)) return p;
  if (p.state === 'carry' && d2(p, p.home) < 1) return p;
  const dx = p.x - player.x, dz = p.z - player.z, d = Math.hypot(dx, dz);
  if (d >= PUSH_R) return p;
  const [ux, uz] = d > 1e-6 ? [dx / d, dz / d] : [1, 0];
  return { ...p, x: clampRoom(player.x + ux * PUSH_R), z: clampRoom(player.z + uz * PUSH_R) };
}
