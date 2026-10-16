import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gameSource } from './helpers/game-source.mjs';

const src = gameSource();
const vec = name => {
  const m = src.match(new RegExp(`const ${name} = new THREE\\.Vector3\\(([-\\d.]+),\\s*([-\\d.]+),\\s*([-\\d.]+)\\)`));
  assert.ok(m, `${name} not found`);
  return { x: +m[1], z: +m[3] };
};
const d = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const num = name => {
  const m = src.match(new RegExp(`const ${name} = ([-\\d.]+);`));
  assert.ok(m, `${name} not found`);
  return +m[1];
};

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

test('mountain landmark stands at the north-west edge, its footprint clear of north landmarks', () => {
  const c = vec('MOUNTAIN_LANDMARK'), R = num('MOUNTAIN_LANDMARK_R');
  assert.deepEqual(c, { x: -15, z: -36 });
  assert.ok(R >= 10.5 && R <= 11.5);
  assert.ok(Math.hypot(c.x, c.z) < 42);
  assert.ok(d(c, vec('DOCK_POND')) > R + num('DOCK_POND_R'));
  for (const n of ['DOCK_GATE', 'MIST_GATE', 'SEA_GATE']) assert.ok(d(c, vec(n)) > R + 5, n);
  assert.ok(d(c, vec('HOUSE_POS')) > R + 12);
});

test('mountain gate is the south foot of the landmark and its prompt is reachable past the body collider', () => {
  const c = vec('MOUNTAIN_LANDMARK'), g = vec('MOUNTAIN_GATE');
  assert.equal(g.x, c.x);
  assert.ok(g.z - c.z >= 8 && g.z - c.z <= 10.5);
  const mtn = readFileSync(new URL('../js/spaces/mountain.js', import.meta.url), 'utf8');
  const solid = +mtn.match(/const LANDMARK_SOLID_R = ([\d.]+);/)[1];
  const playerR = +readFileSync(new URL('../js/data/character.js', import.meta.url), 'utf8').match(/export const PLAYER_R = ([\d.]+);/)[1];
  assert.ok(g.z - c.z - solid - playerR < 2.4);
  assert.ok(g.z - c.z - solid > 0.5);
});

test('game.js exposes a camera rig hook used at the top of updateCamera', () => {
  assert.match(src, /let cameraRig = null;/);
  assert.match(src, /function setCameraRig\(fn\)\s*\{\s*cameraRig = fn \|\| null;\s*\}/);
  assert.match(src, /function updateCamera\(dt\)\s*\{\s*if \(cameraRig\) \{ cameraRig\(camera, dt\); return; \}/);
});
