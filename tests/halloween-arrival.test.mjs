import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gameSource } from './helpers/game-source.mjs';
import { arrivalEligible, arrivalSpots, arrivalTimeline, nearestSpot, isHalloweenTouch, ARRIVAL_NEAR_R } from '../js/halloween/arrival-logic.js';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const touch = (content, campaign = 'w1') => ({ jid: 'j', ts: 1, utm: { source: 'meta', medium: 'paid', campaign, content } });
const E1_PLOTS = [[0, -2], [2, -2], [0, 0], [2, 0]], E1_SPAWN = [0, 1.4];

test('할로윈 소재 유입만 대상', () => {
  assert.equal(isHalloweenTouch(touch('w1_halloween_v1')), true);
  assert.equal(isHalloweenTouch(touch('W1_Halloween_v2')), true);
  assert.equal(isHalloweenTouch(touch('w1_general_v1')), false);
  assert.equal(isHalloweenTouch(touch('', 'halloween_push')), true);
  assert.equal(isHalloweenTouch(null), false);
  assert.equal(isHalloweenTouch({ jid: 'j', utm: null }), false);
});

test('기간 안 · 정원 첫 방문 전 · 할로윈 유입일 때만 켠다', () => {
  const t = touch('w1_halloween_v1');
  assert.equal(arrivalEligible({ touch: t, open: true, visits: 0 }), true);
  assert.equal(arrivalEligible({ touch: t, open: false, visits: 0 }), false);
  assert.equal(arrivalEligible({ touch: t, open: true, visits: 1 }), false);
  assert.equal(arrivalEligible({ touch: touch('w1_general_v1'), open: true, visits: 0 }), false);
  assert.equal(arrivalEligible({ touch: null, open: true, visits: 0, force: true }), true);
  assert.equal(arrivalEligible({ touch: null, open: false, visits: 0, force: true }), false);
});

test('호박 자리는 E1 처치 밭 칸과 자동 수확 반경에 겹치지 않는다', () => {
  const spots = arrivalSpots({ x: E1_SPAWN[0], z: E1_SPAWN[1] });
  assert.equal(spots.length, 3);
  for (const s of spots) {
    for (const [px, pz] of E1_PLOTS) assert.ok(Math.abs(s.x - px) > 1.4 || Math.abs(s.z - pz) > 1.4, `${s.x},${s.z} on plot ${px},${pz}`);
    assert.ok(Math.hypot(s.x - E1_SPAWN[0], s.z - E1_SPAWN[1]) > 1.9);
  }
});

test('근접 판정 — 가장 가까운 호박', () => {
  const spots = [{ x: 0, z: 0 }, { x: 5, z: 0 }];
  assert.equal(nearestSpot(spots, { x: 0.5, z: 0 }), 0);
  assert.equal(nearestSpot(spots, { x: 4.2, z: 0.3 }), 1);
  assert.equal(nearestSpot(spots, { x: 2.5, z: 0 }), -1);
  assert.ok(ARRIVAL_NEAR_R >= 1.2 && ARRIVAL_NEAR_R <= 2);
});

test('타임라인 — 유령이 셋을 차례로 떨어뜨리고 3.2초면 끝난다', () => {
  const a = arrivalTimeline(0), m = arrivalTimeline(1.2), z = arrivalTimeline(3.2);
  assert.equal(a.ghostOn, true);
  assert.deepEqual(a.dropped, [false, false, false]);
  assert.ok(m.dropped.some(Boolean));
  assert.deepEqual(z.dropped, [true, true, true]);
  assert.equal(z.ghostOn, false);
  assert.ok(z.lit.every(v => v === 1));
});

test('연결 — 게임 루프·문 프롬프트·행동·모바일 동그라미', () => {
  const SRC = gameSource();
  assert.match(SRC, /updateHalloweenArrival\(dt, t\)/);
  assert.match(SRC, /nearDoor === 'hwpumpkin'\) return pumpkinAction\(\)/);
  assert.match(read('js/spaces/doors.js'), /arrivalPrompt\(player\.position\)/);
  assert.match(read('js/hud/mobile-hud.js'), /onTarget\(icon\)/);
  assert.match(read('index.html'), /setNearTarget\(icon\)/);
  assert.match(SRC, /ui\.setNearTarget\?\.\(/);
});

test('방문객이 먼저 — 호박 프롬프트는 방문객 대상이 없을 때만', () => {
  assert.match(read('js/spaces/halloween-arrival.js'), /visitorTarget\(\)/);
});
