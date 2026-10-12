import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TAG_R, HOST_SIDE, canEnterIndoor, doorSpot, hostStand, layoutRoom, nearestTag } from '../js/neighbors/indoor-rules.js';
import { hostSpot } from '../js/neighbors/rules.js';

const O = { x: 0, z: 780 };
const DEFS = {
  table: { id: 'table', foot: [1, 1], top: { y: 0.5, pad: [1, 1] } },
  vase: { id: 'vase', foot: [0.3, 0.3], sm: true, h: 0.72 },
  rug: { id: 'rug' },
};
const opts = { origin: O, defOf: (id) => DEFS[id], scale: 1.5, roofY: 3.4, elevated: (f) => f === 2 };

test('입장 가능 — 3단계 이상 + room 배열', () => {
  assert.equal(canEnterIndoor({ houseStage: 2, room: [] }), false);
  assert.equal(canEnterIndoor({ houseStage: 3, room: null }), false);
  assert.equal(canEnterIndoor({ houseStage: 3, room: [] }), true);
  assert.equal(canEnterIndoor(null), false);
});

test('문 자리 = hostSpot · 집주인은 x+HOST_SIDE 로 비킨다', () => {
  const v = { houseStage: 5, style: null };
  assert.deepEqual(doorSpot(v, { x: 0, z: 700 }), hostSpot(5, null, { x: 0, z: 700 }));
  assert.deepEqual(hostStand({ x: 1, z: 2 }), { x: 1 + HOST_SIDE, z: 2 });
});

test('배치 — 월드 좌표·상판 위 소품은 올라가고 충돌 없음·루프탑 높이·러그는 충돌 없음', () => {
  const items = layoutRoom([
    { id: 'table', x: 1, z: 1, rot: 0, f: 0 },
    { id: 'vase', x: 1, z: 1, rot: 0, f: 0 },
    { id: 'rug', x: -2, z: 0, rot: 1, f: 2 },
  ], opts);
  assert.equal(items[0].x, 1); assert.equal(items[0].z, 781);
  assert.equal(items[0].y, 0.2);
  assert.deepEqual(items[0].box, [0.25, 780.25, 1.75, 781.75]);
  assert.equal(items[1].y, 0.2 + 0.75);
  assert.equal(items[1].box, null);
  assert.ok(Math.abs(items[2].y - 3.6) < 1e-9);
  assert.equal(items[2].ry, Math.PI / 2);
  assert.equal(items[2].box, null);
});

test('배치 — 모르는 id 는 건너뛴다', () => {
  assert.equal(layoutRoom([{ id: 'nope', x: 0, z: 0, rot: 0, f: 0 }], opts).length, 0);
});

test('이름표 — 같은 층에서 가장 가까운 것, TAG_R 밖이면 null', () => {
  const items = [{ id: 'a', f: 0, x: 0, z: 780 }, { id: 'b', f: 0, x: 1, z: 780 }, { id: 'c', f: 1, x: 0.2, z: 780 }];
  assert.equal(nearestTag(items, 0, 0.9, 780).id, 'b');
  assert.equal(nearestTag(items, 1, 0.1, 780).id, 'c');
  assert.equal(nearestTag(items, 0, 0, 780 + TAG_R + 0.01), null);
});
