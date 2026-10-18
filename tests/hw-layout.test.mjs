import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  HW_R, WALK_R, ARRIVE, EXIT, STALL, GHOST_SPOTS, GHOSTS_PER_DAY,
  isWalkable, clampToGarden, pickSpots, spotOf,
} from '../js/halloween/layout.js';

const DAYS = ['2026-10-22', '2026-10-23', '2026-10-24', '2026-10-25', '2026-10-26', '2026-10-27',
  '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02'];

test('유령 후보 8곳 · 하루 3마리 · id 는 겹치지 않는다', () => {
  assert.equal(GHOST_SPOTS.length, 8);
  assert.equal(GHOSTS_PER_DAY, 3);
  assert.equal(new Set(GHOST_SPOTS.map(s => s.id)).size, 8);
});

test('걷는 원은 정원 반경보다 안쪽이다', () => {
  assert.ok(WALK_R < HW_R);
  assert.ok(WALK_R > 10);
});

test('도착·출구·좌판·유령 후보는 전부 걸을 수 있는 자리다', () => {
  for (const p of [ARRIVE, EXIT, STALL, ...GHOST_SPOTS]) assert.ok(isWalkable(p.x, p.z), JSON.stringify(p));
});

test('clampToGarden — 안쪽은 그대로, 바깥은 원 둘레로 되민다', () => {
  assert.deepEqual(clampToGarden(1, 2), { x: 1, z: 2 });
  assert.deepEqual(clampToGarden(0, 0), { x: 0, z: 0 });
  const c = clampToGarden(30, 0);
  assert.ok(Math.abs(Math.hypot(c.x, c.z) - WALK_R) < 1e-3);
  assert.ok(c.x > 0 && Math.abs(c.z) < 1e-9);
});

test('pickSpots — 같은 날은 같은 3곳, 서로 다르다', () => {
  const a = pickSpots('2026-10-22'), b = pickSpots('2026-10-22');
  assert.deepEqual(a, b);
  assert.equal(a.length, 3);
  assert.equal(new Set(a).size, 3);
  for (const id of a) assert.ok(spotOf(id), id);
});

test('pickSpots — 날짜가 바뀌면 배치도 바뀐다(12일 중 대부분)', () => {
  const sets = new Set(DAYS.map(d => pickSpots(d).join(',')));
  assert.ok(sets.size >= 8, `배치가 ${sets.size}가지뿐`);
});

test('pickSpots — 결과 배열은 얼어 있다(호출부가 못 고친다)', () => {
  assert.ok(Object.isFrozen(pickSpots('2026-10-25')));
});

test('spotOf — 모르는 id 는 null', () => {
  assert.equal(spotOf('nope'), null);
});
