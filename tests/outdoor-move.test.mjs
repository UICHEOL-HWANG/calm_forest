import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nearestOutdoorAt, takeStored } from '../js/outdoor-move.js';

const ITEMS = [{ x: 0, z: 0 }, { x: 3, z: 0 }, { x: 0, z: 5 }];

test('nearestOutdoorAt: reach 안에 아무것도 없으면 null', () => {
  assert.equal(nearestOutdoorAt(ITEMS, 10, 10, 1.0), null);
  assert.equal(nearestOutdoorAt([], 0, 0, 1.0), null);
});

test('nearestOutdoorAt: 가장 가까운 것의 index·거리', () => {
  const r = nearestOutdoorAt(ITEMS, 2.4, 0, 1.0);
  assert.equal(r.index, 1);
  assert.ok(Math.abs(r.d - 0.6) < 1e-9);
});

test('nearestOutdoorAt: 여럿이 reach 안이면 더 가까운 쪽', () => {
  const r = nearestOutdoorAt(ITEMS, 1.0, 0, 5.0);
  assert.equal(r.index, 0);
});

test('nearestOutdoorAt: reach 경계는 미포함(< reach)', () => {
  assert.equal(nearestOutdoorAt(ITEMS, 1.0, 0, 1.0), null);
});

test('takeStored: 없으면 null, 원본은 건드리지 않음', () => {
  const s = { fence: 1 };
  assert.equal(takeStored(s, 'scarecrow'), null);
  assert.equal(takeStored({}, 'fence'), null);
  assert.equal(takeStored(undefined, 'fence'), null);
  assert.deepEqual(s, { fence: 1 });
});

test('takeStored: 하나 꺼내면 개수 -1, 0이면 키 삭제', () => {
  const s = { fence: 2, path: 1 };
  assert.deepEqual(takeStored(s, 'fence'), { fence: 1, path: 1 });
  assert.deepEqual(takeStored(s, 'path'), { fence: 2 });
  assert.deepEqual(s, { fence: 2, path: 1 });   // 불변
});
