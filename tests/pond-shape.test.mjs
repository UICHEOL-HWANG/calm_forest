import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pondLayout, swimLane, keepOff } from '../js/pond/shape.js';
import { POND_STAGE_R } from '../js/data/pond.js';
import { pondFishLimits } from '../js/pond/stage.js';
import { POND_MAX_RIVER } from '../js/pond/rules.js';

test('1단계 배치는 지금 연못과 한 값도 다르지 않다', () => {
  const l = pondLayout(2.0, 1);
  assert.equal(l.rocks.length, 14);
  l.rocks.forEach((s, i) => {
    const a = (i / 14) * Math.PI * 2;
    assert.equal(s.x, Math.cos(a) * 2.1);
    assert.equal(s.z, Math.sin(a) * 2.1);
    assert.equal(s.size, 0.26 + (i % 3) * 0.05);
    assert.equal(s.alt, i % 2 === 1);
  });
  assert.deepEqual(l.pads, [[-0.8, -0.6], [0.9, 0.7], [0.2, -1.1]]);
  assert.deepEqual(l.lotus, [0.9, 0.7]);
  assert.deepEqual(l.reeds, [[-1.8, 0.7], [-1.6, 1.0], [1.5, -1.4]]);
  assert.equal(l.isle, null);
  assert.deepEqual(l.stones, []);
  assert.equal(l.gatherZ, 2.0 * 0.55);
});

test('1단계 헤엄 길은 지금 식과 같다', () => {
  for (let i = 0; i < 8; i++) {
    assert.deepEqual(swimLane(i, 1), {
      rx: 1.15 - (i % 4) * 0.12, rz: 0.9 - (i % 4) * 0.1, cx: ((i % 4) - 1.5) * 0.15,
      cz: i % 2 ? 0.2 : -0.2, speed: (i % 2 ? -1 : 1) * (0.35 + (i % 5) * 0.05), phase: i * 1.5,
    });
  }
});

test('돌 개수는 반지름 × 7, 수련잎과 갈대는 반지름 비율로 밀려난다', () => {
  assert.deepEqual(POND_STAGE_R.map((r, i) => pondLayout(r, i + 1).rocks.length), [14, 20, 27]);
  const l = pondLayout(2.9, 2);
  assert.ok(Math.abs(l.pads[0][0] - -0.8 * 1.45) < 1e-9);
  assert.ok(Math.abs(l.reeds[2][1] - -1.4 * 1.45) < 1e-9);
  assert.equal(l.isle, null);
  for (const s of l.rocks) assert.ok(Math.abs(Math.hypot(s.x, s.z) - 3.0) < 1e-9);
});

test('3단계에만 섬과 징검다리 4개가 있고 물 안에 들어간다', () => {
  const l = pondLayout(3.9, 3);
  assert.deepEqual(l.isle, { x: 1.6, z: -1.2, r: 1.0 });
  assert.equal(l.stones.length, 4);
  l.stones.forEach(([x, z], i) => {
    assert.ok(Math.abs(x - (-0.2 + 0.5 * i)) < 1e-9);
    assert.ok(Math.abs(z - (0.2 - 0.38 * i)) < 1e-9);
    assert.ok(Math.hypot(x, z) + 0.28 < 3.9 - 0.5);
  });
  assert.ok(Math.hypot(l.isle.x, l.isle.z) + l.isle.r < 3.9 - 0.5);
  for (const [x, z] of l.pads) {
    assert.ok(Math.hypot(x - l.isle.x, z - l.isle.z) > l.isle.r + 0.28);
    for (const [sx, sz] of l.stones) assert.ok(Math.hypot(x - sx, z - sz) > 0.56);
  }
});

test('물고기는 어느 단계에서도 물가 돌 안쪽에서만 헤엄친다', () => {
  POND_STAGE_R.forEach((r, idx) => {
    const lim = pondFishLimits(idx + 1);
    const n = POND_MAX_RIVER * lim.riverDup + lim.seaMax;
    for (let i = 0; i < n; i++) {
      const f = swimLane(i, r / 2.0);
      for (let a = 0; a < Math.PI * 2; a += 0.1) {
        const d = Math.hypot(f.cx + Math.cos(a) * f.rx, f.cz + Math.sin(a) * f.rz);
        assert.ok(d <= r - 0.55, `stage ${idx + 1} fish ${i} at ${d.toFixed(2)}`);
      }
    }
  });
});

test('섬 둘레로 비켜 간다', () => {
  const isle = { x: 1.6, z: -1.2, r: 1.0 };
  assert.deepEqual(keepOff(0, 0, null), [0, 0]);
  assert.deepEqual(keepOff(-2, 2, isle), [-2, 2]);
  const [x, z] = keepOff(1.7, -1.0, isle);
  assert.ok(Math.abs(Math.hypot(x - isle.x, z - isle.z) - 1.4) < 1e-9);
  const [cx, cz] = keepOff(isle.x, isle.z, isle);
  assert.ok(Math.abs(Math.hypot(cx - isle.x, cz - isle.z) - 1.4) < 1e-9);
  const l = pondLayout(3.9, 3);
  for (let i = 0; i < 18; i++) {
    const f = swimLane(i, 3.9 / 2.0);
    for (let a = 0; a < Math.PI * 2; a += 0.1) {
      const [px, pz] = keepOff(f.cx + Math.cos(a) * f.rx, f.cz + Math.sin(a) * f.rz, l.isle);
      assert.ok(Math.hypot(px, pz) <= 3.9 - 0.45);
      assert.ok(Math.hypot(px - isle.x, pz - isle.z) >= 1.4 - 1e-9);
    }
  }
});
