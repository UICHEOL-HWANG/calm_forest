import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gameSource } from './helpers/game-source.mjs';

const src = gameSource();
const vec = name => {
  const m = src.match(new RegExp(`const ${name} = new THREE\\.Vector3\\(([-\\d.]+),\\s*([-\\d.]+),\\s*([-\\d.]+)\\)`));
  assert.ok(m, `${name} not found`);
  return { x: +m[1], z: +m[3] };
};
const d = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

test('mountain space is far from every other instanced space', () => {
  const m = vec('MOUNTAIN');
  for (const n of ['MIRROR', 'DREAM', 'RIVER', 'MIST', 'NEIGHBOR', 'NEIGHBOR_INT', 'OBSERVATORY']) {
    assert.ok(d(m, vec(n)) > 150, `${n} too close`);
  }
});

test('mountain gate sits inside the village and clears north landmarks', () => {
  const g = vec('MOUNTAIN_GATE');
  assert.ok(Math.hypot(g.x, g.z) < 42 - 6);
  for (const n of ['DOCK_GATE', 'DOCK_POND', 'MIST_GATE', 'SEA_GATE']) assert.ok(d(g, vec(n)) > 9, n);
  assert.ok(d(g, vec('HOUSE_POS')) > 12);
});

test('game.js exposes a camera rig hook used at the top of updateCamera', () => {
  assert.match(src, /let cameraRig = null;/);
  assert.match(src, /function setCameraRig\(fn\)\s*\{\s*cameraRig = fn \|\| null;\s*\}/);
  assert.match(src, /function updateCamera\(dt\)\s*\{\s*if \(cameraRig\) \{ cameraRig\(camera, dt\); return; \}/);
});
