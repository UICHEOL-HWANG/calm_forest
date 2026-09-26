import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nearIndices, CLEAR_R } from '../js/duel/clearance.js';

// 🌱 대결 중 곰·동물 발밑 작물이 몸을 뚫고 나오던 것(2026-09-27 제보) — 서 있는 자리 반경 안만 잠깐 숨긴다
test('서 있는 자리 반경 안의 것만 고른다', () => {
  const pos = [{ x: 0, z: 0 }, { x: 0.5, z: 0 }, { x: 2, z: 0 }, { x: -3, z: 0.2 }];
  assert.deepEqual(nearIndices(pos, [{ x: 0, z: 0 }], 1), [0, 1]);
});

test('여러 사람(곰·동물) 중 누구 곁이든 고르고, 겹쳐도 한 번만', () => {
  const pos = [{ x: 0, z: 0 }, { x: 3, z: 0 }, { x: 1.5, z: 0 }];
  assert.deepEqual(nearIndices(pos, [{ x: 0, z: 0 }, { x: 3, z: 0 }], 0.8), [0, 1]);
  assert.deepEqual(nearIndices(pos, [{ x: 1, z: 0 }, { x: 2, z: 0 }], 0.6), [2]);
});

test('경계는 제외(<r) — 옆 칸 작물까지 지우지 않는다', () => {
  assert.deepEqual(nearIndices([{ x: 1, z: 0 }], [{ x: 0, z: 0 }], 1), []);
});

test('반경 기본값은 밭 한 칸(2) 안쪽 — 옆 칸까지 번지지 않는다', () => {
  assert.ok(CLEAR_R > 0.5 && CLEAR_R < 1.5);
});

test('빈 입력은 빈 결과', () => {
  assert.deepEqual(nearIndices([], [{ x: 0, z: 0 }]), []);
  assert.deepEqual(nearIndices([{ x: 0, z: 0 }], []), []);
});
