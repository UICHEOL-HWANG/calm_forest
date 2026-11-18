import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cineShots, createRootCine, ROOT_CINE_DUR } from '../js/delve/root-cine.js';

const PANELS = [{ x: -1.2, y: 1.5, z: -7 }, { x: 0, y: 1.5, z: -7 }, { x: 1.2, y: 1.5, z: -7 }];
const HOME = { x: 3, y: 9, z: 6 }, HOME_LOOK = { x: 3, y: 1.2, z: -2 };
const home = (p, l) => { Object.assign(p, HOME); Object.assign(l, HOME_LOOK); };
const FROM = { pos: { x: 0, y: 9, z: 4 }, look: { x: 0, y: 1, z: -3 } };

const run = (rig, sec, step = 0.05) => { for (let t = 0; t < sec; t += step) rig.update(step); };

test('세로 화면은 한 칸이 화면을 채우도록 더 멀리 선다', () => {
  const wide = cineShots(PANELS, 1.6), tall = cineShots(PANELS, 0.46);
  assert.equal(wide.length, 3);
  assert.ok(tall[0].pos.z - PANELS[0].z > wide[0].pos.z - PANELS[0].z);
  wide.forEach((s, i) => { assert.equal(s.pos.x, PANELS[i].x); assert.deepEqual(s.look, PANELS[i]); });
});

test('2칸에 닿을 때 한 번 켜지고 끝나면 기본 시점으로 돌아온다', () => {
  let lights = 0;
  const rig = createRootCine({ from: FROM, shots: cineShots(PANELS, 1.6), home, onLight: () => lights++ });
  run(rig, ROOT_CINE_DUR[0] + ROOT_CINE_DUR[1] - 0.1);
  assert.equal(rig.lit, false);
  run(rig, 0.2);
  assert.equal(rig.lit, true);
  run(rig, 5);
  assert.equal(rig.phase, 'done');
  assert.deepEqual(rig.cur.pos, HOME);
  assert.deepEqual(rig.cur.look, HOME_LOOK);
  assert.equal(lights, 1);
});

test('전체 길이는 4.7초', () => {
  assert.ok(Math.abs(ROOT_CINE_DUR.reduce((a, b) => a + b, 0) - 4.7) < 1e-9);
  const rig = createRootCine({ from: FROM, shots: cineShots(PANELS, 1.6), home });
  run(rig, 4.6);
  assert.equal(rig.phase, 'run');
  run(rig, 0.2);
  assert.equal(rig.phase, 'done');
});

test('건너뛰면 바로 켜지고 0.4초 안에 돌아온다', () => {
  let lights = 0;
  const rig = createRootCine({ from: FROM, shots: cineShots(PANELS, 0.46), home, onLight: () => lights++ });
  run(rig, 0.5);
  rig.skip();
  assert.equal(rig.lit, true);
  run(rig, 0.45);
  assert.equal(rig.phase, 'done');
  assert.deepEqual(rig.cur.pos, HOME);
  rig.skip();
  run(rig, 1);
  assert.equal(lights, 1);
});
