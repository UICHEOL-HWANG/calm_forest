import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DEAD_ZONE, FULL_AT, TURN_RATE, CAM_FOLLOW, stickVector, stickMove, stickCenter, turnToward, followK } from '../js/move-feel.js';

const near = (a, b, e = 1e-6) => assert.ok(Math.abs(a - b) < e, `${a} ≉ ${b}`);
const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

test('스틱 벡터는 반경으로 나누고 반경 밖은 잘린다', () => {
  assert.deepEqual(stickVector(23, 0, 46), { x: 0.5, y: 0 });
  const v = stickVector(0, 92, 46);
  near(v.x, 0); near(v.y, 1);
  const d = stickVector(60, 80, 46);
  near(Math.hypot(d.x, d.y), 1);
});

test('데드존 안에서는 안 움직인다', () => {
  assert.equal(stickMove(0.1, 0.1).scale, 0);
  assert.equal(stickMove(DEAD_ZONE * 0.99, 0).scale, 0);
  assert.equal(stickMove(0, 0).scale, 0);
});

test('데드존 밖은 기울인 만큼 빨라지고 70%만 밀어도 전속력', () => {
  near(stickMove(0, (FULL_AT + DEAD_ZONE) / 2).scale, 0.5);
  near(stickMove(FULL_AT, 0).scale, 1);
  near(stickMove(1, 0).scale, 1);
  near(stickMove(-0.6, -0.8).scale, 1);
});

test('방향은 길이 1로 정규화된다', () => {
  const m = stickMove(0.3, 0.4);
  near(Math.hypot(m.mx, m.mz), 1);
  near(m.mx, 0.6); near(m.mz, 0.8);
});

test('키보드 대각선(합 1.41)도 전속력을 넘지 않는다', () => {
  near(stickMove(1, 1).scale, 1);
  near(stickMove(2, 0).scale, 1);
});

test('스틱 중심은 화면 가장자리에서 반경만큼 떨어진다', () => {
  assert.deepEqual(stickCenter(30, 380, 46, 800, 400, 8), { x: 54, y: 346 });
  assert.deepEqual(stickCenter(120, 200, 46, 800, 400, 8), { x: 120, y: 200 });
  assert.deepEqual(stickCenter(790, 5, 46, 800, 400, 8), { x: 746, y: 54 });
});

test('회전은 프레임 수와 상관없이 같은 시간에 같은 만큼 돈다', () => {
  const run = (fps) => { let a = Math.PI; for (let i = 0; i < fps * 0.2; i++) a = turnToward(a, 0, 1 / fps); return a; };
  near(run(60), run(20), 1e-9);
  near(run(30), run(20), 1e-9);
});

test('반 바퀴 돌아서는 데 0.25초가 안 걸린다', () => {
  let a = Math.PI - 0.01, t = 0;
  while (Math.abs(a) > 20 * Math.PI / 180) { a = turnToward(a, 0, 1 / 20); t += 1 / 20; }
  assert.ok(t <= 0.25, `${t}s`);
});

test('회전은 짧은 쪽으로 돈다', () => {
  assert.ok(turnToward(3, -3, 1 / 60) > 3);
});

test('카메라 추적 계수는 예전보다 빠르고 프레임 수와 무관하게 누적된다', () => {
  assert.ok(followK(1 / 60) > 1 - Math.pow(0.025, 1 / 60));
  near(1 - (1 - followK(1 / 60)) ** 3, followK(1 / 20));
  near(followK(1), 1 - CAM_FOLLOW);
  assert.ok(TURN_RATE > 13.4);
});

test('game.js 가 move-feel 을 이동·회전·카메라에 쓴다', () => {
  const g = read('../js/game.js');
  assert.match(g, /from '\.\/move-feel\.js'/);
  assert.match(g, /stickMove\(/);
  assert.match(g, /player\.rotation\.y = turnToward\(player\.rotation\.y,/);
  assert.match(g, /const k = followK\(dt\);/);
  assert.doesNotMatch(g, /player\.rotation\.y = lerpAngle\(player\.rotation\.y, Math\.atan2\(mx, mz\), 0\.2\)/);
});

test('조이스틱은 닿은 자리를 중심으로 잡는다', () => {
  const c = read('../js/controls.js');
  assert.match(c, /from '\.\/move-feel\.js'/);
  assert.match(c, /stickCenter\(t\.clientX, t\.clientY, R, innerWidth, innerHeight/);
  assert.match(c, /visibilitychange/);
  assert.match(c, /stickVector\(/);
  assert.match(c, /base\.style\.transform = ''/);
});
