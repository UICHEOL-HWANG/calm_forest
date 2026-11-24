import { tacticOf, submerged, arrived, peekOn, moleHoles, shufflePlan, bounceSpot, decoyBurrowSpot, createPest } from './pests.js';
import { makeMoleHole, makeBurrow, makeTrail } from './pest-art.js';
import { makeEmojiMark } from './state-badge.js';
import { pestSfx } from './pest-sfx.js';
import { PEST_LINES } from '../data/delve.js';
import { spawnDust, ui } from '../game.js';
import { trackEvent } from '../analytics.js';

const HOP_SEC = 0.35;
const CIRCLE_R = 1;
const BLINK_SEC = 1;
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

function tickShuffle(p, dt) {
  const s = p.shuffle;
  if (!s) return;
  const c = s.c;
  if (p.sim.state !== 'mimic' || !C.run().chunks.includes(c)) { p.shuffle = null; placeChunk(c); return; }
  p.shuffle = { ...s, t: s.t + dt };
  if (p.shuffle.t < 0) return;
  const k = Math.min(1, p.shuffle.t / s.sec), hop = Math.sin(k * Math.PI) * 0.4;
  const r = C.W(s.a.x + (s.b.x - s.a.x) * k, s.a.z + (s.b.z - s.a.z) * k), q = C.W(s.b.x + (s.a.x - s.b.x) * k, s.b.z + (s.a.z - s.b.z) * k);
  p.art.g.position.set(r.x, p.art.g.position.y + hop, r.z);
  c.mesh.position.set(q.x, C.Y + 0.12 + hop, q.z);
  c.ring.position.set(q.x, C.Y + 0.02, q.z);
  if (k < 1) return;
  c.x = s.a.x; c.z = s.a.z;
  p.sim = { ...p.sim, x: s.b.x, z: s.b.z };
  placeChunk(c);
  p.shuffle = s.left > 1 ? { ...s, left: s.left - 1, t: 0, a: s.b, b: s.a } : null;
  if (p.shuffle) pestSfx('shuffle');
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
  const { swaps, swapSec } = shufflePlan(p.sim);
  if (!swaps) return;
  p.shuffle = { c, left: swaps, sec: swapSec, t: -0.3, a: { x: p.sim.x, z: p.sim.z }, b: { x: c.x, z: c.z } };
  sfxLater(300, 'shuffle');
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
