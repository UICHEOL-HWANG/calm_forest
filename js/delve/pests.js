import { PESTS } from '../data/delve.js';

export const RING_SEC = 3;
export const GRAB_R = 0.45;
export const TAP_R = 1.8;
export const BAIT_R = 3.5;
export const BAIT_EAT_SEC = 6;
export const NOTICE_R = 9;
export const PICK_R = 0.8;

const d2 = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

export function createPest(kind, at, home) {
  return { kind, state: kind === 'axolotl' ? 'hide' : 'idle', x: at.x, z: at.z, home: { ...home }, spawn: { x: at.x, z: at.z }, targetId: null, carryId: null, t: 0 };
}

function moveToward(p, to, speed, dt) {
  const dx = to.x - p.x, dz = to.z - p.z, len = Math.hypot(dx, dz);
  if (len < 1e-6) return { ...p };
  const s = Math.min(len, speed * dt);
  return { ...p, x: p.x + (dx / len) * s, z: p.z + (dz / len) * s };
}

const wanted = (p, c) => !(p.kind === 'bat' && c.age < RING_SEC) && d2(p, c) <= NOTICE_R;

export function stepPest(p, dt, w) {
  const speed = PESTS[p.kind].speed;
  const events = [];
  if (p.state === 'gone') return { pest: p, events };
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
  if (!target) return { pest: p.state === 'approach' ? { ...p, state: p.kind === 'axolotl' ? 'hide' : 'idle', targetId: null } : p, events };
  const q = moveToward({ ...p, state: 'approach', targetId: target.id }, target, speed, dt);
  if (d2(q, target) <= GRAB_R) { events.push({ type: 'grab', chunkId: target.id }); return { pest: { ...q, state: 'carry', carryId: target.id, targetId: null }, events }; }
  return { pest: q, events };
}

export function tapPest(p, player) {
  if (p.kind !== 'axolotl' || p.state === 'gone' || d2(p, player) > TAP_R) return null;
  const events = p.carryId ? [{ type: 'spit', chunkId: p.carryId, x: p.x, z: p.z }] : [];
  return { pest: { ...p, state: 'flee', carryId: null, targetId: null }, events };
}

export function baitPest(p, at) {
  if (p.kind !== 'crab' || p.state === 'gone' || p.state === 'carry' || d2(p, at) > BAIT_R) return null;
  return { ...p, state: 'eat', t: BAIT_EAT_SEC, targetId: null };
}

export function pickableBeforeBat(chunk) { return chunk.age < RING_SEC; }

export function canPick(chunk, player) { return d2(chunk, player) <= PICK_R; }
