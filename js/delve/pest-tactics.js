import { tacticOf, submerged, arrived, peekOn, moleHoles, shuffleStart, swapSecFor, earPop, bounceSpot, decoyBurrowSpot, createPest } from './pests.js';
import { makeMoleHole, makeBurrow, makeTrail } from './pest-art.js';
import { makeEmojiMark } from './state-badge.js';
import { pestSfx } from './pest-sfx.js';
import { PEST_LINES } from '../data/delve.js';
import { camera, spawnDust, ui } from '../game.js';
import { trackEvent } from '../analytics.js';
import { PEST_SCALE } from './pest-art-kit.js';

const HOP_SEC = 0.35;
const CIRCLE_R = 1;
const BLINK_SEC = 1;
const SWAP_BIG = 1.4;
const SWAP_HOP = 0.85;
const EAR_SIZE = 1.1;
let C = null;

export function bindTactics(ctx) { C = ctx; }

const add = (o, x, z, y = 0) => { o.position.copy(C.W(x, z)); o.position.y = C.Y + y; C.group().add(o); return o; };
const drop = (...objs) => objs.filter(Boolean).forEach(o => { C.group().remove(o); C.dispose(o); });
const trailMesh = (from, to) => add(makeTrail(Array.from({ length: 9 }, (_, k) => [from.x + (to.x - from.x) * k / 8, from.z + (to.z - from.z) * k / 8])), 0, 0);

function tickDive(p, t) {
  const on = submerged(p.sim);
  if (on) p.art.g.visible = false;
  if (on && !p.mark) p.mark = add(makeEmojiMark('🫧', 1.1), p.sim.x, p.sim.z, 0.3);
  if (!on && p.mark) { drop(p.mark); p.mark = null; }
  if (!on) return;
  p.mark.position.copy(p.art.g.position); p.mark.position.y = C.Y + 0.3 + (t * 0.8 % 1) * 0.4;
  if (t - (p.bubbleAt ?? -9) > 0.6) { p.bubbleAt = t; pestSfx('bubble'); }
}

function tickPeek(p, t) {
  if (p.sim.state !== 'doze') { p.dozeAt = null; p.peek = false; return; }
  p.dozeAt ??= t;
  p.peek = peekOn(t - p.dozeAt, p.sim);
}

function tickCircle(p, t) {
  if (!tacticOf(p.sim).circle || !arrived(p.sim)) return;
  const a = t * 2.2 + p.tilt * 20, at = C.W(p.sim.spot.ax + Math.cos(a) * CIRCLE_R, p.sim.spot.az + Math.sin(a) * CIRCLE_R);
  p.art.g.position.x = at.x; p.art.g.position.z = at.z;
}

function tickMole(p, t) {
  const live = arrived(p.sim) && tacticOf(p.sim).decoys;
  if (!live) { if (p.decoys) { drop(...p.decoys); p.decoys = null; } return; }
  p.decoys ??= moleHoles({ x: p.sim.spot.ax, z: p.sim.spot.az }, p.sim).filter(h => !h.real).map(h => add(makeMoleHole(), h.x, h.z));
  if (t - (p.dustAt ?? -9) < 1) return;
  p.dustAt = t;
  spawnDust(p.art.g.position.x, p.art.g.position.z, 3);
  if (t - (p.dustSfxAt ?? -9) >= 2) { p.dustSfxAt = t; pestSfx('dust'); }
}

function tickMoth(p, t) {
  const run = C.run(), at = run.lureAt;
  if (at) {
    const blink = p.sim.state === 'away' && p.sim.t <= BLINK_SEC;
    if (blink && !p.mark) p.mark = add(makeEmojiMark('🔷', 1.3), at.x, at.z, 1.3);
    if (!blink && p.mark) { drop(p.mark); p.mark = null; }
    if (p.mark) p.mark.visible = Math.sin(t * 22) > 0;
  }
  if (!tacticOf(p.sim).pair || p.sim.grit <= 0 || run.paired) return;
  run.paired = true;
  const mate = C.newPest(createPest(p.sim.kind, { x: p.sim.x + 0.8, z: p.sim.z }, p.sim.home, { grit: 1 }), run.pests.length);
  run.pests = [...run.pests, mate];
}

function placeChunk(c) {
  const at = C.W(c.x, c.z);
  c.mesh.position.set(at.x, C.Y + 0.12, at.z);
  c.ring.position.set(at.x, C.Y + 0.02, at.z);
}

function orbit(a, b, k) {
  const mx = (a.x + b.x) / 2, mz = (a.z + b.z) / 2, cs = Math.cos(Math.PI * k), sn = Math.sin(Math.PI * k);
  const at = v => ({ x: mx + (v.x - mx) * cs - (v.z - mz) * sn, z: mz + (v.x - mx) * sn + (v.z - mz) * cs });
  return [at(a), at(b)];
}

function setBig(p, c, k) { p.art.g.scale.setScalar(PEST_SCALE * k); c.mesh.scale.setScalar(k); }

function endShuffle(p) {
  const s = p.shuffle;
  p.shuffle = null;
  drop(s.ear);
  setBig(p, s.c, 1);
  placeChunk(s.c);
}

function tickEar(p) {
  const s = p.shuffle, k = earPop(s.t);
  if (!k) return endShuffle(p);
  const g = p.art.g.position;
  const ear = s.ear || add(makeEmojiMark('👂', EAR_SIZE), 0, 0);
  ear.position.set(g.x, C.Y + p.top + 0.35, g.z);
  ear.scale.setScalar(EAR_SIZE * k);
  p.shuffle = { ...s, ear };
}

function tickSwap(p) {
  const s = p.shuffle, c = s.c;
  const k = Math.min(1, s.t / swapSecFor(s)), hop = Math.sin(k * Math.PI) * SWAP_HOP;
  const [r, q] = orbit(s.a, s.b, k).map(v => C.W(v.x, v.z));
  p.art.g.position.set(r.x, p.art.g.position.y + hop, r.z);
  c.mesh.position.set(q.x, C.Y + 0.12 + hop, q.z);
  c.ring.position.set(q.x, C.Y + 0.02, q.z);
  if (k < 1) return;
  c.x = s.a.x; c.z = s.a.z;
  p.sim = { ...p.sim, x: s.b.x, z: s.b.z };
  placeChunk(c);
  p.shuffle = { ...s, left: s.left - 1, t: 0, a: s.b, b: s.a };
  if (p.shuffle.left) pestSfx('shuffle');
  else setBig(p, c, 1);
}

function tickShuffle(p, dt) {
  const s = p.shuffle;
  if (!s) return;
  if (p.sim.state !== 'mimic' || !C.run().chunks.includes(s.c)) return endShuffle(p);
  p.shuffle = { ...s, t: s.t + dt };
  if (s.left && s.t < 0 && p.shuffle.t >= 0) pestSfx('shuffle');
  if (p.shuffle.t < 0) return;
  if (s.left) tickSwap(p);
  else tickEar(p);
}

export function tickTactic(p, dt, t) {
  tickDive(p, t);
  tickPeek(p, t);
  tickCircle(p, t);
  tickShuffle(p, dt);
  if (p.sim.kind === 'mole') tickMole(p, t);
  if (p.sim.kind === 'moth') tickMoth(p, t);
}

function clearDecoy() {
  const run = C.run();
  if (!run.decoy) return;
  drop(run.decoy.trail, run.decoy.burrow, run.decoy.mark);
  run.decoy = null;
}

export function sfxLater(ms, key) {
  const here = C.run();
  setTimeout(() => { if (C.run() === here) pestSfx(key); }, ms);
}

export function tickFloorTactics(dt) {
  const run = C.run();
  for (const c of run.chunks) {
    if (!c.hop) continue;
    c.hop = { ...c.hop, t: c.hop.t + dt };
    const k = Math.min(1, c.hop.t / HOP_SEC), at = C.W(c.hop.from.x + (c.x - c.hop.from.x) * k, c.hop.from.z + (c.z - c.hop.from.z) * k);
    c.mesh.position.set(at.x, C.Y + 0.12 + Math.sin(k * Math.PI) * 0.6, at.z);
    c.ring.position.set(at.x, C.Y + 0.02, at.z);
    if (k >= 1) c.hop = null;
  }
  if (run.decoy && !run.stash.length) clearDecoy();
  const f = run.trailFade;
  if (!f || !run.trail) return;
  run.trailFade = { ...f, t: f.t + dt };
  const k = Math.max(0, 1 - run.trailFade.t / f.sec);
  run.trail.children.forEach(m => { m.userData.base ??= m.material.opacity; m.material.opacity = m.userData.base * k; });
  if (k <= 0) { drop(run.trail); run.trail = null; run.trailFade = null; }
}

export function bounceChunk(c, bat) {
  const d = bat && tacticOf(bat).bounce;
  if (!d) return;
  const from = { x: c.x, z: c.z }, to = bounceSpot(from, Math.random() * Math.PI * 2, d);
  c.x = to.x; c.z = to.z; c.hop = { from, t: 0 };
}

export function startShuffle(p, c) {
  const s = { ...shuffleStart(p.sim), c, ear: null, a: { x: p.sim.x, z: p.sim.z }, b: { x: c.x, z: c.z } };
  p.shuffle = s;
  if (s.left) setBig(p, c, SWAP_BIG);
}

export function screenRight() {
  const e = camera.matrixWorld.elements, d = Math.hypot(e[0], e[2]);
  return d > 1e-6 ? { x: e[0] / d, z: e[2] / d } : { x: 1, z: 0 };
}

export function layTrail(p, c) {
  const run = C.run(), from = p.grabAt || { x: c.x, z: c.z }, home = p.sim.home, tac = tacticOf(p.sim);
  drop(run.trail); clearDecoy();
  run.trail = trailMesh(from, home);
  run.trailFade = tac.trailFadeSec ? { t: 0, sec: tac.trailFadeSec } : null;
  if (!tac.twoTrails) return;
  const at = decoyBurrowSpot(from, home);
  run.decoy = { at, trail: trailMesh(from, at), burrow: add(makeBurrow(), at.x, at.z), mark: add(makeEmojiMark('✨', 1.1), home.x, home.z, 0.6) };
}

export const decoyNear = (lp, r) => { const d = C.run().decoy; return !!d && Math.hypot(lp.x - d.at.x, lp.z - d.at.z) < r; };

export function digDecoy() {
  const run = C.run(), grub = run.pests.find(p => p.sim.kind === 'grub');
  clearDecoy();
  ui.toast?.(PEST_LINES.empty, 2400);
  pestSfx('dig'); sfxLater(300, 'confused');
  const streak = C.scoreStreak(false);
  trackEvent('pest_counter', { pest: 'grub', method: 'reclaim', ok: 0, state: 'decoy', round: grub?.sim.round || 0, streak });
  return true;
}
