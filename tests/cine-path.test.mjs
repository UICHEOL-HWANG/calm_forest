import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCinePath, hallFrame } from '../js/guide/cine-path.js';

const F = (x) => ({ pos: { x, y: 5, z: 10 }, look: { x, y: 1, z: 0 } });
const home = (p, l) => { p.x = 0; p.y = 5; p.z = 10; l.x = 0; l.y = 1; l.z = 0; };
const run = (path, sec, dt = 0.05) => { let r; for (let t = 0; t < sec; t += dt) r = path.update(dt); return r; };

test('장면을 차례로 날아가 머문 뒤 돌아와 끝난다', () => {
  const shots = [];
  const path = createCinePath({ from: F(0), frames: [F(10), F(20)], home, hold: 1, onShot: i => shots.push(i) });
  assert.equal(path.update(0.01).phase, 'fly');
  const mid = run(path, 1.5);
  assert.equal(mid.index, 0);
  assert.deepEqual(shots, [0]);
  run(path, 3);
  assert.deepEqual(shots, [0, 1]);
  assert.equal(run(path, 5).phase, 'done');
  assert.equal(path.cur.pos.x, 0);
});

test('머무는 동안 카메라는 그 장면 자리에 있다', () => {
  const path = createCinePath({ from: F(0), frames: [F(10)], home, hold: 1 });
  run(path, 1.6);
  assert.equal(path.cur.pos.x, 10);
});

test('넘기면 짧게 돌아와 끝나고 다음 장면은 안 본다', () => {
  const shots = [];
  const path = createCinePath({ from: F(0), frames: [F(10), F(20)], home, hold: 1, onShot: i => shots.push(i) });
  run(path, 0.3);
  path.skip();
  assert.equal(path.update(0.01).phase, 'out');
  assert.equal(run(path, 0.6).phase, 'done');
  assert.deepEqual(shots, []);
});

test('실내 장면 자리: 방 가운데 쪽에서 대상을 내려다본다', () => {
  const f = hallFrame({ x: 6, z: 0 }, { x: 0, z: 0 }, { h: 3, d: 4 });
  assert.equal(f.pos.x, 2);
  assert.equal(f.pos.y, 3);
  assert.equal(f.look.x, 6);
  assert.ok(f.look.y > 0 && f.look.y < f.pos.y);
});
