import { PESTS, DELVE_HALF, PEST_LURK_DIST, MOLE_HOLE_R, PEST_CATCH_R, PEST_DARK_SEC, PEST_LOST_SEC, SOFT_PERIOD, SOFT_WINDOW, MIMIC_DIST, PEST_GRIT, REGROUP_SEC, TACTICS } from '../data/delve.js';

export const RING_SEC = 3;
export const GRAB_R = 0.45;
export const TAP_R = 1.8;
export const BAIT_R = 3.5;
export const BAIT_EAT_SEC = 6;
export const NOTICE_R = 9;
export const PICK_R = 0.8;
export const DARK_R = 4;
export const PLUG_R = 1.8;
export const DOZE_NEAR = 2.0;
export const PEEK_CYCLE = 2.4;
export const PEEK_OPEN = 0.8;
export const CLAW_SEC = 1.2;
export const FEINT_AFTER = 1.2;
export const FEINT_SEC = 1;
export const FEINT_DIST = 2;

const d2 = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

const restState = p => (p.kind === 'axolotl' ? 'hide' : 'idle');

export function createPest(kind, at, home, { asleep = false, grit = PEST_GRIT } = {}) {
  return { kind, state: asleep ? 'sleep' : restState({ kind }), x: at.x, z: at.z, home: { ...home }, spawn: { x: at.x, z: at.z }, targetId: null, carryId: null, t: 0, grit, round: 0 };
}

export const tacticOf = p => TACTICS[p.kind]?.[Math.min(p.round || 0, 2)] || {};
export const softPeriodFor = p => tacticOf(p).period || SOFT_PERIOD;
export const ringSecFor = p => tacticOf(p).ringSec || RING_SEC;
export const darkSecFor = p => tacticOf(p).darkSec || PEST_DARK_SEC;
export const peekOn = (sec, p) => !!tacticOf(p).peek && sec % PEEK_CYCLE >= PEEK_CYCLE - PEEK_OPEN;
export const clawUp = (lurkSec, p) => !!tacticOf(p).claw && Math.floor(lurkSec / CLAW_SEC) % 2 === 0;

export function shufflePlan(p) {
  const { swaps = 0, swapSec = 0 } = tacticOf(p);
  return { swaps, swapSec };
}

export const SHUFFLE_DELAY = 0.9;
export const LAST_SWAP_SLOW = 1.8;
export const EAR_SEC = 0.3;

export function shuffleStart(p) {
  const { swaps, swapSec } = shufflePlan(p);
  return { left: swaps, sec: swapSec, t: -SHUFFLE_DELAY };
}

export const swapSecFor = s => (s.left === 1 ? s.sec * LAST_SWAP_SLOW : s.sec);

export const earPop = t => (t < 0 || t >= EAR_SEC ? 0 : 1 + 0.3 * Math.abs(Math.sin((t / EAR_SEC) * Math.PI * 2)));

const TIMED = ['eat', 'away', 'lost'];

const regroup = p => ({ ...p, state: restState(p), t: REGROUP_SEC, targetId: null, spot: null, lt: 0 });
const remembers = p => p.round > 0 && p.grit > 0;

export function repelPest(p) {
  if (p.grit <= 0 || p.gaveUp) return { pest: p, events: [] };
  const next = { ...p, grit: p.grit - 1, round: p.round + 1 };
  if (next.grit > 0) return { pest: p.state === 'gone' ? { ...regroup(next), x: p.home.x, z: p.home.z, carryId: null } : next, events: [] };
  const spit = p.carryId ? [{ type: 'spit', chunkId: p.carryId, x: p.x, z: p.z }] : [];
  const left = TIMED.includes(p.state) ? next : { ...next, state: 'flee', targetId: null, spot: null };
  return { pest: { ...left, gaveUp: true, carryId: null }, events: [...spit, { type: 'gift', x: p.x, z: p.z, kind: p.kind }] };
}

function moveToward(p, to, speed, dt) {
  const dx = to.x - p.x, dz = to.z - p.z, len = Math.hypot(dx, dz);
  if (len < 1e-6) return { ...p };
  const s = Math.min(len, speed * dt);
  return { ...p, x: p.x + (dx / len) * s, z: p.z + (dz / len) * s };
}

export function grabChunk(p, chunkId) { return { ...p, state: 'carry', carryId: chunkId, targetId: null, spot: null }; }

const lurkR = p => (p.kind === 'mole' && tacticOf(p).decoys ? MOLE_HOLE_R : PEST_LURK_DIST);

function lurkSpot(p, at, turn = 0) {
  const a = Math.atan2(p.z - at.z, p.x - at.x) + turn, r = lurkR(p);
  return { x: at.x + Math.cos(a) * r, z: at.z + Math.sin(a) * r };
}

const wanted = (p, c) => !(p.kind === 'bat' && c.age < ringSecFor(p)) && d2(p, c) <= NOTICE_R;

export function moleHoles(at, p) {
  const real = p.spot ? { x: p.spot.x, z: p.spot.z } : lurkSpot(p, at);
  const a = Math.atan2(real.z - at.z, real.x - at.x);
  const decoys = Array.from({ length: tacticOf(p).decoys || 0 }, (_, i) => {
    const b = a + (i % 2 ? -1 : 1) * (2 * Math.PI / 3);
    return { x: at.x + Math.cos(b) * MOLE_HOLE_R, z: at.z + Math.sin(b) * MOLE_HOLE_R, real: false };
  });
  return [{ ...real, real: true }, ...decoys];
}

function feintFrom(p, lt) {
  if (!tacticOf(p).feint || p.feinted === p.round || lt < FEINT_AFTER) return null;
  const a = Math.atan2(p.spot.z - p.spot.az, p.spot.x - p.spot.ax);
  const feintTo = { x: p.spot.x + Math.cos(a) * FEINT_DIST, z: p.spot.z + Math.sin(a) * FEINT_DIST };
  return { ...p, state: 'feint', t: FEINT_SEC, lt: 0, feinted: p.round, feintTo };
}

export function stepPest(p, dt, w) {
  const speed = PESTS[p.kind].speed * (tacticOf(p).speedMul || 1);
  const events = [];
  const wakes = p.state === 'sleep' && remembers(p) && !!w.lurkAt && !w.rest;
  if (['gone', 'sleep', 'mimic'].includes(p.state) && !wakes) return { pest: p, events };
  if (p.state === restState(p) && p.t > 0) return { pest: { ...p, t: Math.max(0, p.t - dt) }, events };
  if (p.state === 'feint') {
    const q = moveToward(p, p.feintTo, FEINT_DIST / FEINT_SEC, dt), t = p.t - dt;
    return { pest: t <= 0 ? { ...q, state: 'lurk', t: 0, feintTo: null } : { ...q, t }, events };
  }
  if (p.state === 'doze' && !w.lurkAt) return { pest: { ...p, state: 'sleep', spot: null }, events };
  if (['eat', 'away', 'lost'].includes(p.state)) {
    const t = p.t - dt;
    const q = p.state === 'away' && w.lureAt ? moveToward(p, w.lureAt, speed, dt) : p;
    if (t > 0) return { pest: { ...q, t }, events };
    return { pest: q.gaveUp ? { ...q, state: 'flee', t: 0, targetId: null, spot: null } : { ...q, state: restState(q), t: 0 }, events };
  }
  if (p.state === 'flee') {
    const q = moveToward(p, p.home, speed * 1.5, dt);
    if (d2(q, p.home) >= 0.3) return { pest: q, events };
    return { pest: p.grit > 0 ? regroup(q) : { ...q, state: 'gone' }, events };
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
    if (w.lurkAt && (d2(p, w.lurkAt) <= NOTICE_R || remembers(p))) {
      const same = ['lurk', 'doze'].includes(p.state) && p.spot && p.spot.ax === w.lurkAt.x && p.spot.az === w.lurkAt.z;
      if (same && p.state === 'doze') return { pest: moveToward(p, p.spot, speed * 0.3, dt), events };
      const spot = same ? p.spot : { ...lurkSpot(p, w.lurkAt, w.lurkTurn || 0), ax: w.lurkAt.x, az: w.lurkAt.z };
      const lt = same && p.state === 'lurk' ? (p.lt || 0) + dt : 0;
      const woke = same ? !!p.woke : false;
      const feint = feintFrom({ ...p, spot }, lt);
      if (feint) return { pest: feint, events };
      const q0 = moveToward({ ...p, state: 'lurk', targetId: null, spot, lt, woke }, spot, speed, dt);
      const q = { ...q0, arrived: (same && !!p.arrived) || d2(q0, spot) <= PUSH_R + 0.05 };
      return { pest: p.kind === 'dormouse' && !woke && d2(q, w.lurkAt) <= DOZE_NEAR ? { ...q, state: 'doze' } : q, events };
    }
    return { pest: ['approach', 'lurk', 'doze'].includes(p.state) ? { ...p, state: restState(p), targetId: null, spot: null } : p, events };
  }
  const q = moveToward({ ...p, state: 'approach', targetId: target.id }, target, speed, dt);
  if (d2(q, target) <= GRAB_R) { events.push({ type: 'grab', chunkId: target.id }); return { pest: grabChunk(q, target.id), events }; }
  return { pest: q, events };
}

export const arrived = p => p.state === 'lurk' && !!p.arrived;
export const submerged = p => !!tacticOf(p).dive && (p.state === 'approach' || (p.state === 'lurk' && !p.arrived));

export function peekWake(p, peeking) {
  if (!peeking || p.state !== 'doze' || !tacticOf(p).peek) return null;
  return { ...p, state: 'lurk', woke: true, lt: 0 };
}

export function counterFor(p) {
  if (p.kind === 'axolotl' && ['lurk', 'approach', 'carry'].includes(p.state) && !submerged(p)) return 'tap';
  if (p.kind === 'crab' && p.state === 'lurk' && clawUp(p.lt || 0, p)) return 'tap';
  if (p.kind === 'crab' && ['lurk', 'approach'].includes(p.state)) return 'bait';
  if (p.kind === 'moth' && ['lurk', 'approach'].includes(p.state)) return 'dark';
  if (p.kind === 'mole' && p.state === 'lurk') return 'plug';
  return null;
}

const NO_CATCH = ['bat', 'roller'];

export function catchAtBreak(pests, at, { soft = false } = {}) {
  let best = -1, bd = Math.max(PEST_CATCH_R, DOZE_NEAR);
  pests.forEach((p, i) => {
    const d = d2(p, at);
    const reach = p.state === 'doze' ? DOZE_NEAR : PEST_CATCH_R + lurkR(p) - PEST_LURK_DIST;
    const ready = (p.state === 'lurk' && !NO_CATCH.includes(p.kind)) || (p.state === 'doze' && !soft);
    if (ready && d <= Math.min(bd, reach)) { best = i; bd = d; }
  });
  return best;
}

export function rollerAtBreak(pests, at) {
  return pests.findIndex(p => p.kind === 'roller' && p.state === 'lurk' && d2(p, at) <= PEST_CATCH_R * 1.5);
}

export function mimicSpot(chunk, dir, blocked = () => false) {
  const at = k => ({ x: chunk.x + dir.x * MIMIC_DIST * k, z: chunk.z + dir.z * MIMIC_DIST * k });
  const side = k => ({ x: chunk.x - dir.z * MIMIC_DIST * k, z: chunk.z + dir.x * MIMIC_DIST * k });
  const ok = q => Math.abs(q.x) <= ROOM_LIM && Math.abs(q.z) <= ROOM_LIM && !blocked(q);
  const s = [at(1), at(-1), side(1), side(-1)].find(ok) || at(-1);
  return { x: clampRoom(s.x), z: clampRoom(s.z) };
}

export const GIFT_NEAR = 1.2;
export const GIFT_AWAY = 1.2;

export function giftSpot(at, player, right, blocked = () => false) {
  if (d2(at, player) >= GIFT_NEAR) return at;
  const side = (at.x - player.x) * right.x + (at.z - player.z) * right.z < 0 ? -1 : 1;
  const a0 = Math.atan2(right.z * side, right.x * side);
  const ok = q => Math.abs(q.x) <= ROOM_LIM && Math.abs(q.z) <= ROOM_LIM && !blocked(q);
  const spots = [0, 4, 1, -1, 3, -3, 2, -2].map(k => a0 + (k * Math.PI) / 4).map(a => ({ x: player.x + Math.cos(a) * GIFT_AWAY, z: player.z + Math.sin(a) * GIFT_AWAY }));
  const s = spots.find(ok);
  return s ? { x: clampRoom(s.x), z: clampRoom(s.z) } : at;
}

export function softOk(sec, period = SOFT_PERIOD) {
  const ph = (sec % period) / period;
  return ph >= SOFT_WINDOW[0] && ph <= SOFT_WINDOW[1];
}

export function darkPest(p, player) {
  if (counterFor(p) !== 'dark' || d2(p, player) > DARK_R) return null;
  return { ...p, state: 'away', t: darkSecFor(p), targetId: null, spot: null };
}

export function plugReady(p, player) {
  if (counterFor(p) !== 'plug' || d2(p, player) > PLUG_R) return false;
  if (!p.spot) return true;
  const holes = moleHoles({ x: p.spot.ax, z: p.spot.az }, p);
  return holes.reduce((a, b) => (d2(b, player) < d2(a, player) ? b : a)).real;
}

export function plugPest(p, player, to) {
  if (!plugReady(p, player)) return null;
  return { ...p, state: 'lost', t: PEST_LOST_SEC, x: to.x, z: to.z, targetId: null, spot: null };
}

export function floorTally({ kept, lost, pending, best = 0 }) {
  return { kept, lost: lost + pending, any: kept + lost + pending > 0 || best >= 2 };
}

export function tapPest(p, player) {
  if (counterFor(p) !== 'tap' || d2(p, player) > TAP_R) return null;
  const events = p.carryId ? [{ type: 'spit', chunkId: p.carryId, x: p.x, z: p.z }] : [];
  return { pest: { ...p, state: 'flee', carryId: null, targetId: null }, events };
}

export function baitPest(p, at) {
  if (counterFor(p) !== 'bait' || d2(p, at) > BAIT_R) return null;
  return { ...p, state: 'eat', t: tacticOf(p).eatSec || BAIT_EAT_SEC, targetId: null };
}

export function bounceSpot(at, angle, dist) {
  return { x: clampRoom(at.x + Math.cos(angle) * dist), z: clampRoom(at.z + Math.sin(angle) * dist) };
}

export function decoyBurrowSpot(from, home) {
  const dx = home.x - from.x, dz = home.z - from.z, a = Math.atan2(dz, dx) + Math.PI * 0.6, len = Math.max(2.5, Math.hypot(dx, dz));
  return { x: clampRoom(from.x + Math.cos(a) * len), z: clampRoom(from.z + Math.sin(a) * len) };
}

export function pickableBeforeBat(chunk, sec = RING_SEC) { return chunk.age < sec; }

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
