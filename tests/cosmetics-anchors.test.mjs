// tests/cosmetics-anchors.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SURF, DOME_BOT, BAG_DIR, onSurf, ringR, domeTheta,
  sideAnchor, backAnchor, headAnchor, neckAnchor, neckR,
} from '../js/cosmetics/anchors.js';

// 🦊여우 체형 — js/game.js ANIMALS
const FOX = { bs: [0.90, 1.08, 0.90], R: 0.52, HR: 0.37, HY: 1.26 };
const bodyY = FOX.R * FOX.bs[1] + 0.02;
const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);
const surfQ = (p, bs, R, by) =>
  Math.sqrt((p.x / (bs[0] * R)) ** 2 + ((p.y - by) / (bs[1] * R)) ** 2 + (p.z / (bs[2] * R)) ** 2);

test('상수 — 스펙 §3 확정 수치', () => {
  near(SURF, 1.06); near(DOME_BOT, 0.50);
  near(Math.hypot(BAG_DIR.x, BAG_DIR.y, BAG_DIR.z), 1, 1e-9);
  assert.ok(BAG_DIR.x < 0, '왼쪽이어야 한다 — 도구 든 손이 오른쪽이다');
  assert.ok(BAG_DIR.z > 0, '앞옆구리여야 끈 끝이 몸 뒤로 안 돌아간다');
});

test('onSurf: 몸 표면 **밖**에 놓인다 — 타원 방정식을 풀어야 한다', () => {
  const p = onSurf(FOX.bs, FOX.R, bodyY, -0.8, -0.2, 0.5);
  near(surfQ(p, FOX.bs, FOX.R, bodyY), SURF, 1e-9);
  assert.ok(surfQ(p, FOX.bs, FOX.R, bodyY) > 1, '표면(1.0)보다 밖');
});

test('onSurf: 방향만 쓰고 길이는 무시한다 — 같은 방향이면 같은 점', () => {
  const a = onSurf(FOX.bs, FOX.R, bodyY, -0.8, -0.2, 0.5);
  const b = onSurf(FOX.bs, FOX.R, bodyY, -8, -2, 5);
  near(a.x, b.x); near(a.y, b.y); near(a.z, b.z);
});

test('ringR: 머리 구의 그 높이 단면 — √(HR²−h²)', () => {
  near(ringR(FOX.HR, 0), FOX.HR);
  near(ringR(FOX.HR, 0.6), Math.sqrt(1 - 0.36) * FOX.HR);
  assert.ok(ringR(FOX.HR, 1.5) > 0, '범위를 벗어나도 0 이나 NaN 을 내지 않는다');
});

test('domeTheta: 캡 아래 테두리가 DOME_BOT·HR 에 온다', () => {
  const rk = 1.06, th = domeTheta(FOX.HR, rk);
  near(FOX.HR * rk * Math.cos(th), DOME_BOT * FOX.HR, 1e-9);
});

test('DOME_BOT 은 🐱고양이 귀 밑동(0.46·HR)보다 위다 — 귀가 빠져나온다(§3-3)', () => {
  assert.ok(DOME_BOT > 0.46);
});

test('sideAnchor: 왼쪽 앞, 몸 표면 밖', () => {
  const p = sideAnchor(FOX.bs, FOX.R, bodyY);
  assert.ok(p.x < 0 && p.z > 0);
  near(surfQ(p, FOX.bs, FOX.R, bodyY), SURF, 1e-9);
});

test('backAnchor: 등 표면 — 0.98 이다. 옛 값 0.55 는 몸 속이었다', () => {
  const p = backAnchor(FOX.bs, FOX.R, bodyY);
  near(p.z, -FOX.R * FOX.bs[2] * 0.98);
  assert.ok(Math.abs(p.z) > FOX.R * FOX.bs[2] * 0.9, '몸 속이면 안 된다');
});

test('headAnchor 는 머리 중심 · neck 은 🐶목줄 좌표', () => {
  assert.deepEqual(headAnchor(FOX.HY), { x: 0, y: FOX.HY, z: 0 });
  near(neckAnchor(FOX.HR, FOX.HY).y, FOX.HY - FOX.HR * 0.55);
  near(neckR(FOX.HR), FOX.HR * 0.92);
});

test('체형 7종 전부에서 옆구리 앵커가 몸 밖이다', () => {
  const ANIMALS = [
    [0.90, 1.08, 0.90, 0.52], [1.03, 0.99, 1.00, 0.56], [1.00, 0.96, 1.00, 0.46],
    [0.88, 1.10, 0.88, 0.50], [1.08, 1.00, 1.06, 0.63], [1.08, 1.00, 1.06, 0.63],
    [1.02, 0.94, 1.02, 0.50],
  ];
  for (const [a, b, c, R] of ANIMALS) {
    const bs = [a, b, c], by = R * b + 0.02;
    assert.ok(surfQ(sideAnchor(bs, R, by), bs, R, by) > 1, `체형 ${bs} 에서 앵커가 몸 속`);
  }
});
