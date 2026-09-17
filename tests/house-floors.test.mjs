import { test } from 'node:test';
import assert from 'node:assert/strict';
import { floorsFor, floorAt, normalizeFloor, decorUnlocked, canPlaceOn } from '../js/house-floors.js';

test('3단계는 1층뿐', () => {
  const fs = floorsFor(3);
  assert.equal(fs.length, 1);
  assert.equal(fs[0].half, 7);
});

test('4단계는 다락이 열린다(작은 층)', () => {
  const fs = floorsFor(4);
  assert.deepEqual(fs.map(f => f.id), ['ground', 'attic']);
  assert.equal(floorAt(4, 1).half, 4.5);
});

test('5단계에서 위층이 2층으로 넓어진다 — f 는 그대로 1', () => {
  assert.equal(floorAt(5, 1).id, 'upper');
  assert.equal(floorAt(5, 1).half, 6);
});

test('6단계에서만 루프탑이 열리고 실외다', () => {
  assert.equal(floorAt(5, 2), null);
  assert.equal(floorAt(6, 2).outdoor, true);
});

test('위층은 넓어지기만 한다 — 다락 가구 좌표가 2층에서도 유효', () => {
  assert.ok(floorAt(5, 1).half >= floorAt(4, 1).half);
});

test('normalizeFloor: 없거나 아직 안 열린 층은 1층으로 떨군다', () => {
  assert.equal(normalizeFloor(undefined, 6), 0);
  assert.equal(normalizeFloor(2, 4), 0);   // 4단계엔 루프탑이 없다
  assert.equal(normalizeFloor(1, 4), 1);
});

test('고급 가구는 stage 로 해금되고, 기존 가구는 항상 열려 있다', () => {
  assert.equal(decorUnlocked({ id: 'sofa' }, 3), true);
  assert.equal(decorUnlocked({ id: 'jacuzzi', stage: 6 }, 5), false);
  assert.equal(decorUnlocked({ id: 'jacuzzi', stage: 6 }, 6), true);
});

test('실외 전용 가구는 루프탑에만 놓인다', () => {
  const firepit = { id: 'firepit', stage: 6, outdoorOnly: true };
  assert.equal(canPlaceOn(firepit, floorAt(6, 2)), true);
  assert.equal(canPlaceOn(firepit, floorAt(6, 0)), false);
  assert.equal(canPlaceOn({ id: 'sofa' }, floorAt(6, 2)), true);
});
