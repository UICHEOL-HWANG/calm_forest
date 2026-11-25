import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPest, stepPest, counterFor, submerged, peekWake, plugReady, plugPest, moleHoles, bounceSpot, decoyBurrowSpot, tapPest, catchAtBreak, PLUG_R, PEEK_CYCLE } from '../js/delve/pests.js';
import { tacticCues, badgeFor, BADGE_CLAW, BADGE_BAIT, BADGE_PEEK } from '../js/delve/pest-rounds.js';
import { PEST_BADGE } from '../js/delve/badge-math.js';
import { DELVE_HALF } from '../js/data/delve.js';

const home = { x: 6, z: 0 };
const vein = { x: 0, z: 0 };
const mk = (kind, extra = {}) => ({ ...createPest(kind, { x: 1, z: 0 }, home), ...extra });

test('도롱뇽 잠수: round 1 대기 자리에 닿기 전까지 잠수, 그때는 톡 안 됨', () => {
  assert.equal(submerged(mk('axolotl', { state: 'approach', round: 1 })), true);
  assert.equal(submerged(mk('axolotl', { state: 'lurk', round: 1 })), true);
  assert.equal(submerged(mk('axolotl', { state: 'lurk', round: 1, arrived: true })), false);
  assert.equal(counterFor(mk('axolotl', { state: 'lurk', round: 1 })), null);
  assert.equal(submerged(mk('axolotl', { state: 'approach', round: 0 })), false);
  assert.equal(counterFor(mk('axolotl', { state: 'approach', round: 1 })), null);
  assert.equal(tapPest(mk('axolotl', { state: 'approach', round: 1, x: 0, z: 0 }), { x: 0, z: 0 }), null);
  assert.equal(counterFor(mk('axolotl', { state: 'lurk', round: 1, arrived: true })), 'tap');
  let p = mk('axolotl', { state: 'hide', round: 1, x: 5, z: 0 });
  const seen = [];
  for (let i = 0; i < 120; i++) { p = stepPest(p, 0.05, { chunks: [], burrowAt: home, lurkAt: vein }).pest; seen.push(submerged(p)); }
  assert.equal(seen[0], true);
  assert.equal(seen.at(-1), false);
  assert.equal(p.arrived, true);
  assert.ok(seen.slice(seen.indexOf(false)).every(x => !x));
  assert.equal(counterFor(mk('axolotl', { state: 'approach', round: 0 })), 'tap');
});

test('수법 소리: 잠수 시작은 dive, 떠오르면 notice, 되돌아가는 척은 feint, 두더지 가짜 구멍은 rumble', () => {
  const idle = mk('axolotl', { state: 'hide', round: 1 });
  const dive = { ...idle, state: 'approach' };
  assert.deepEqual(tacticCues(idle, dive), ['dive']);
  assert.deepEqual(tacticCues(dive, dive), []);
  assert.deepEqual(tacticCues(dive, { ...dive, state: 'lurk' }), []);
  assert.deepEqual(tacticCues({ ...dive, state: 'lurk' }, { ...dive, state: 'lurk', arrived: true }), ['notice']);
  assert.deepEqual(tacticCues(mk('axolotl', { state: 'hide' }), mk('axolotl', { state: 'approach' })), ['notice']);
  const lurk = mk('axolotl', { state: 'lurk', round: 2 });
  assert.deepEqual(tacticCues(lurk, { ...lurk, state: 'feint' }), ['feint']);
  assert.deepEqual(tacticCues({ ...lurk, state: 'feint' }, lurk), []);
  assert.deepEqual(tacticCues(mk('mole', { state: 'idle', round: 1 }), mk('mole', { state: 'lurk', round: 1 })), ['notice']);
  assert.deepEqual(tacticCues(mk('mole', { state: 'lurk', round: 1 }), mk('mole', { state: 'lurk', round: 1, arrived: true })), ['rumble']);
  assert.deepEqual(tacticCues(mk('mole', { state: 'lurk' }), mk('mole', { state: 'lurk', arrived: true })), []);
});

test('머리 표식: 잠수 중 없음, 집게는 들면 ❗ 내리면 🍄, 실눈엔 👁️, 나머지는 원래대로', () => {
  assert.equal(badgeFor(mk('axolotl', { state: 'approach', round: 1 })), null);
  assert.equal(badgeFor(mk('crab', { state: 'lurk', round: 2, lt: 0.3 })), BADGE_CLAW);
  assert.equal(badgeFor(mk('crab', { state: 'lurk', round: 2, lt: 1.5 })), BADGE_BAIT);
  assert.equal(badgeFor(mk('crab', { state: 'lurk', round: 1, lt: 0.3 })), PEST_BADGE.lurk);
  assert.equal(badgeFor(mk('dormouse', { state: 'doze', round: 2 }), true), BADGE_PEEK);
  assert.equal(badgeFor(mk('dormouse', { state: 'doze', round: 2 }), false), PEST_BADGE.doze);
  assert.equal(badgeFor(mk('bat', { state: 'carry' })), PEST_BADGE.carry);
});

test('도둑쥐 실눈: 실눈일 때만 깨고, 깬 뒤에는 그 광맥에서 다시 졸지 않고 깨질 때 문다', () => {
  const doze = mk('dormouse', { state: 'doze', round: 2, x: 0.7, z: 0, spot: { x: 0.7, z: 0, ax: 0, az: 0 } });
  assert.equal(peekWake(doze, false), null);
  assert.equal(peekWake({ ...doze, round: 1 }, true), null);
  assert.equal(peekWake({ ...doze, state: 'lurk' }, true), null);
  const woke = peekWake(doze, true);
  assert.equal(woke.state, 'lurk');
  assert.equal(doze.state, 'doze');
  let p = woke;
  for (let i = 0; i < 40; i++) p = stepPest(p, 0.05, { chunks: [], burrowAt: home, lurkAt: vein }).pest;
  assert.equal(p.state, 'lurk');
  assert.equal(catchAtBreak([p], vein, { soft: true }), 0);
  let q = { ...woke };
  for (let i = 0; i < 40; i++) q = stepPest(q, 0.05, { chunks: [], burrowAt: home, lurkAt: { x: 3, z: 3 } }).pest;
  assert.equal(q.woke, false);
  assert.ok(PEEK_CYCLE > 0);
});

test('두더지 구멍 막기: 진짜 구멍이 가장 가까울 때만', () => {
  const p = mk('mole', { state: 'lurk', round: 2 });
  const spot = moleHoles(vein, p)[0];
  const lurk = { ...p, x: spot.x, z: spot.z, spot: { x: spot.x, z: spot.z, ax: 0, az: 0 } };
  const [real, ...decoys] = moleHoles(vein, lurk);
  assert.equal(decoys.length, 2);
  assert.equal(plugReady(lurk, { x: real.x, z: real.z }), true);
  for (const d of decoys) {
    assert.ok(Math.hypot(d.x - real.x, d.z - real.z) > PLUG_R);
    assert.equal(plugReady(lurk, { x: d.x, z: d.z }), false);
    assert.equal(plugPest(lurk, { x: d.x, z: d.z }, home), null);
  }
  assert.equal(plugPest(lurk, { x: real.x, z: real.z }, home).state, 'lost');
  assert.equal(plugReady(mk('mole', { state: 'lurk', x: 0, z: 0 }), { x: 0.5, z: 0 }), true);
});

test('박쥐 튕김·가짜 굴 자리: 거리 그대로, 방 안으로', () => {
  const b = bounceSpot({ x: 1, z: 1 }, 0, 1.5);
  assert.ok(Math.abs(b.x - 2.5) < 1e-9 && Math.abs(b.z - 1) < 1e-9);
  const edge = bounceSpot({ x: DELVE_HALF - 0.4, z: 0 }, 0, 1.5);
  assert.ok(edge.x <= DELVE_HALF - 0.3);
  const from = { x: 0, z: 0 }, at = decoyBurrowSpot(from, home);
  assert.ok(Math.hypot(at.x - home.x, at.z - home.z) > 2);
  for (const v of [at.x, at.z]) assert.ok(Math.abs(v) <= DELVE_HALF - 0.3);
  const far = decoyBurrowSpot({ x: -7, z: -7 }, { x: 7, z: -7 });
  for (const v of [far.x, far.z]) assert.ok(Math.abs(v) <= DELVE_HALF - 0.3);
});

test('잠수 도롱뇽: 플레이어가 대기 자리를 밟고 있어 밀려나도 도착으로 친다', () => {
  const vein = { x: 0, z: 0 };
  const spot = { x: 0.7, z: 0, ax: 0, az: 0 };
  const p = { ...createPest('axolotl', { x: 1.45, z: 0 }, { x: 6, z: 0 }), state: 'lurk', round: 1, spot, arrived: false };
  const { pest } = stepPest(p, 0.016, { chunks: [], burrowAt: p.home, lurkAt: vein });
  assert.equal(pest.arrived, true);
  assert.equal(submerged(pest), false);
});
