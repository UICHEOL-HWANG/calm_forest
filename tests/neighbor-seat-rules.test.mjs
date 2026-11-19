import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SEAT, SEAT_CAM, seatOut, seatPose, seatCamera, bodyROf, nearSeat } from '../js/neighbors/seat-rules.js';

const ANIMALS = [{ id: 'rabbit', bodyR: 0.46 }, { id: 'bear', bodyR: 0.63 }];

test('몸이 작으면 그루터기 자리, 크면 상판에 안 묻히게 뒤로', () => {
  assert.equal(seatOut('round', 0.46), SEAT.round.out);
  assert.equal(+seatOut('round', 0.63).toFixed(2), 1.30);
  assert.equal(seatOut('long', 0.46), SEAT.long.out);
  assert.ok(seatOut('long', 0.63) > SEAT.long.out);
  assert.equal(seatOut('weird', 0.46), SEAT.round.out);
});

test('손님은 남쪽에서 북쪽을, 집주인은 북쪽에서 남쪽을 본다', () => {
  const t = { x: 10, z: 700 };
  assert.deepEqual(seatPose(t, 'round', 0.46, 'guest'), { x: 10, z: 700 + SEAT.round.out, ry: Math.PI });
  const h = seatPose(t, 'round', 0.63, 'host');
  assert.equal(h.x, 10); assert.equal(+h.z.toFixed(2), 698.70); assert.equal(h.ry, 0);
});

test('카메라: 식탁 기준 어깨 너머, 세로 화면은 주시점에서 더 멀리', () => {
  const t = { x: 10, z: 700 };
  const land = seatCamera(t, 16 / 9);
  assert.deepEqual(land.look, { x: 10 + SEAT_CAM.look[0], y: SEAT_CAM.look[1], z: 700 + SEAT_CAM.look[2] });
  assert.deepEqual(land.pos, { x: 10 + SEAT_CAM.pos[0], y: SEAT_CAM.pos[1], z: 700 + SEAT_CAM.pos[2] });
  const port = seatCamera(t, 9 / 16);
  const d = (c) => Math.hypot(c.pos.x - c.look.x, c.pos.y - c.look.y, c.pos.z - c.look.z);
  assert.equal(+(d(port) / d(land)).toFixed(3), SEAT_CAM.portrait);
});

test('동물 몸 반지름, 모르는 동물은 가운데 값', () => {
  assert.equal(bodyROf('bear', ANIMALS), 0.63);
  assert.equal(bodyROf('nope', ANIMALS), 0.55);
});

test('식탁 가까이일 때만 앉기 프롬프트', () => {
  const t = { x: 0, z: 0, shape: 'round' };
  assert.equal(nearSeat(t, { x: 0, z: 2.0 }), true);
  assert.equal(nearSeat(t, { x: 0, z: 3.5 }), false);
  assert.equal(nearSeat(null, { x: 0, z: 0 }), false);
  assert.equal(nearSeat({ x: 0, z: 0, shape: 'long' }, { x: 2.4, z: 1.5 }), true);
});
