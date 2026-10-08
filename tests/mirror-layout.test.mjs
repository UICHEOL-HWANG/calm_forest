import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  LANDMARKS, SPOTS, spotOf, isWalkable, clampWalkable, MIRROR_LANDING, MIRROR_STOP_LOCAL, MIRROR_PARK,
  SOLIDS, NPC_SPOTS, HOUSES, STOP_REACH,
} from '../js/mirror/layout.js';

test('표지물 5종 · 숨는 자리 15곳 · 왼/오 자리 10곳', () => {
  assert.deepEqual(LANDMARKS.map(l => l.id), ['pond', 'well', 'clock', 'lamp', 'stop']);
  assert.equal(SPOTS.length, 15);
  assert.equal(SPOTS.filter(s => s.side === 'left' || s.side === 'right').length, 10);
  assert.equal(new Set(SPOTS.map(s => s.id)).size, 15);
  for (const s of SPOTS) {
    assert.ok(['left', 'right', 'front', 'back'].includes(s.side), s.id);
    assert.ok(['bush', 'rock', 'tree'].includes(s.cover), s.id);
    assert.ok(LANDMARKS.some(l => l.id === s.landmark), s.id);
    assert.equal(spotOf(s.id), s);
  }
});

test('방향 규칙 — 화면 왼쪽 = 서쪽(-x), 앞 = 남쪽(+z): 자리는 표지물 기준 그쪽에 있다', () => {
  for (const s of SPOTS) {
    const l = LANDMARKS.find(m => m.id === s.landmark);
    const dx = s.x - l.x, dz = s.z - l.z;
    if (s.side === 'left') assert.ok(dx < -1 && Math.abs(dx) > Math.abs(dz), s.id);
    if (s.side === 'right') assert.ok(dx > 1 && Math.abs(dx) > Math.abs(dz), s.id);
    if (s.side === 'front') assert.ok(dz > 1 && Math.abs(dz) > Math.abs(dx), s.id);
    if (s.side === 'back') assert.ok(dz < -1 && Math.abs(dz) > Math.abs(dx), s.id);
  }
});

test('자리·착지·정류장·주민은 걸을 수 있는 곳, 충돌 상자 밖', () => {
  const inSolid = (x, z) => SOLIDS.some(b => x > b.x1 && x < b.x2 && z > b.z1 && z < b.z2);
  for (const p of [...SPOTS, MIRROR_LANDING, MIRROR_STOP_LOCAL, ...NPC_SPOTS]) {
    assert.ok(isWalkable(p.x, p.z), JSON.stringify(p));
    assert.ok(!inSolid(p.x, p.z), JSON.stringify(p));
  }
  assert.ok(Math.hypot(MIRROR_PARK.x, MIRROR_PARK.z) < 21, '마차 정박 자리도 원 안');
  assert.equal(HOUSES.length, 3);
});

test('clampWalkable — 안이면 그대로, 밖이면 원 경계 안쪽으로', () => {
  assert.deepEqual(clampWalkable(1, 2), { x: 1, z: 2 });
  const c = clampWalkable(40, 0);
  assert.ok(isWalkable(c.x, c.z));
  assert.ok(c.x > 19 && c.x < 21.6 && Math.abs(c.z) < 1e-6);
});

test('하차 자리는 정류장 프롬프트 반경 밖 — 도착 직후 탭이 귀환이 되지 않는다', () => {
  assert.ok(Math.hypot(MIRROR_LANDING.x - MIRROR_STOP_LOCAL.x, MIRROR_LANDING.z - MIRROR_STOP_LOCAL.z) > STOP_REACH);
});
