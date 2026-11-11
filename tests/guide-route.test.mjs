import { test } from 'node:test';
import assert from 'node:assert/strict';
import { waypoint, edgeArrow } from '../js/guide/route.js';

test('막는 것이 없으면 목표를 그대로 가리킨다', () => {
  const t = { x: 10, z: 0 };
  assert.equal(waypoint({ x: 0, z: 0 }, t, [[{ x: 5, z: 5 }, 1]]), t);
});

test('직선 위의 건물은 옆으로 비켜 간다', () => {
  const w = waypoint({ x: 0, z: 0 }, { x: 10, z: 0 }, [[{ x: 5, z: 0.3 }, 1.5]]);
  assert.ok(Math.abs(w.z - 0.3) >= 1.5, `비켜 선 점 z=${w.z}`);
  assert.ok(Math.abs(w.x - 5) < 1e-9);
});

test('목표가 건물 반경 안이면 우회하지 않는다', () => {
  const t = { x: 5, z: 0.5 };
  assert.equal(waypoint({ x: 0, z: 0 }, t, [[{ x: 5, z: 0 }, 1.5]]), t);
});

test('화면 안이면 inside, 밖이면 가장자리에 붙고 방향각을 준다', () => {
  assert.deepEqual(edgeArrow({ x: 100, y: 100, inFront: true }, 560, 258), { inside: true, x: 100, y: 100, deg: 0 });
  const r = edgeArrow({ x: 900, y: 129, inFront: true }, 560, 258);
  assert.equal(r.inside, false);
  assert.ok(r.x <= 560 - 26 + 1e-9);
  assert.ok(Math.abs(r.deg) < 1);
  const back = edgeArrow({ x: 900, y: 129, inFront: false }, 560, 258);
  assert.ok(back.x < 280);
});
