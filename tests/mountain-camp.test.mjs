import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three/three.module.js';
import { CAMP, CAMP_COLLIDERS, PLAYER_R, pushOutProps, START_SPOT, atHut, YARD, DOOR_SPOT, DOOR_R, inYard, clampSummit } from '../js/mountain/camp-layout.js';
import { CLIMB_PATH, CLIMB_START, PLAZA, clampLocal } from '../js/mountain/climb.js';
import { buildCamp, CAMP_DRAWS } from '../js/mountain/camp-art.js';

const EXIT = { x: 0, z: 83 };
const free = p => CAMP_COLLIDERS.every(c => Math.hypot(p.x - c.x, p.z - c.z) >= c.r + PLAYER_R - 1e-6);

test('every plaza and summit prop has a collider', () => {
  const ids = new Set(CAMP_COLLIDERS.map(c => c.id));
  for (const id of ['campfire', 'bench0', 'bench1', 'bench2', 'lamp0', 'lamp1', 'lamp2', 'woodpile', 'stump', 'snowman', 'sign', 'sticks', 'cairn', 'finishL', 'finishR', 'keeper', 'hut', 'poleL', 'poleR']) {
    assert.ok(ids.has(id), id);
  }
});

test('pushOutProps moves a point out of a prop and leaves free points alone', () => {
  const fire = CAMP_COLLIDERS.find(c => c.id === 'campfire');
  const inside = { x: fire.x + 0.1, z: fire.z };
  const out = pushOutProps(inside);
  assert.notEqual(out, inside);
  assert.deepEqual(inside, { x: fire.x + 0.1, z: fire.z });
  assert.ok(free(out));
  const open = { x: PLAZA.x, z: PLAZA.z };
  assert.deepEqual(pushOutProps(open), open);
});

test('a point dead centre on a prop is still pushed out', () => {
  const lamp = CAMP_COLLIDERS.find(c => c.id === 'lamp0');
  assert.ok(free(pushOutProps({ x: lamp.x, z: lamp.z })));
});

test('walking keeps the plaza centre, exit, trail start, summit and start deck reachable', () => {
  for (const p of [{ x: PLAZA.x, z: PLAZA.z }, EXIT, CLIMB_START, CLIMB_PATH.at(-1), START_SPOT]) assert.ok(free(p), JSON.stringify(p));
});

test('the straight walk from the plaza centre to the trail start is not blocked', () => {
  for (let k = 0; k <= 20; k++) {
    const p = { x: PLAZA.x + (CLIMB_START.x - PLAZA.x) * (k / 20), z: PLAZA.z + (CLIMB_START.z - PLAZA.z) * (k / 20) };
    assert.ok(free(p), JSON.stringify(p));
  }
});

test('the climb path band stays free of props', () => {
  for (let i = 0; i < CLIMB_PATH.length - 1; i++) {
    const a = CLIMB_PATH[i], b = CLIMB_PATH[i + 1];
    for (let k = 0; k <= 10; k++) assert.ok(free({ x: a.x + (b.x - a.x) * k / 10, z: a.z + (b.z - a.z) * k / 10 }));
  }
});

test('plaza props sit inside the walkable plaza so they can actually be bumped', () => {
  for (const id of ['campfire', 'lamp0', 'woodpile', 'snowman']) {
    const c = CAMP_COLLIDERS.find(q => q.id === id);
    const r = clampLocal({ x: c.x, z: c.z }, PLAZA);
    assert.ok(Math.hypot(r.x - c.x, r.z - c.z) < 0.01, id);
  }
});

test('atHut triggers near the summit and not at the trail start', () => {
  assert.equal(atHut(CLIMB_PATH.at(-1)), true);
  assert.equal(atHut(CLIMB_START), false);
  assert.ok(Math.hypot(CAMP.keeper.x - CLIMB_PATH.at(-1).x, CAMP.keeper.z - CLIMB_PATH.at(-1).z) < 4);
});

test('the camp is two drawables, solid and glowing, both merged', () => {
  const g = buildCamp(THREE);
  const ds = [];
  g.traverse(o => { if (o.isMesh) ds.push(o); });
  assert.equal(ds.length, CAMP_DRAWS);
  assert.equal(CAMP_DRAWS, 2);
  assert.ok(ds[0].geometry.getAttribute('color'));
  assert.ok(ds[0].geometry.getAttribute('position').count > 3000);
});

test('the summit yard joins the path end and holds the keeper and the hut door', () => {
  const end = CLIMB_PATH.at(-1);
  assert.ok(Math.hypot(end.x - YARD.x, end.z - YARD.z) < YARD.r + 1.5);
  assert.ok(inYard(CAMP.keeper));
  assert.ok(inYard(DOOR_SPOT));
  assert.ok(free(DOOR_SPOT));
  assert.ok(Math.hypot(DOOR_SPOT.x - START_SPOT.x, DOOR_SPOT.z - START_SPOT.z) > 1.6 + DOOR_R);
});

test('the porch is walkable and the hut body still blocks', () => {
  assert.ok(!CAMP_COLLIDERS.some(c => c.id === 'porch'));
  assert.ok(CAMP_COLLIDERS.find(c => c.id === 'hut').r <= 2.6);
});

test('walking out of the yard never jumps more than a step', () => {
  for (let i = 0; i < 36; i++) {
    const a = (i / 36) * Math.PI * 2;
    const p = { x: YARD.x + Math.cos(a) * (YARD.r + 0.1), z: YARD.z + Math.sin(a) * (YARD.r + 0.1) };
    const q = clampSummit(p, x => clampLocal(x, PLAZA));
    assert.ok(Math.hypot(q.x - p.x, q.z - p.z) < 0.3, a.toFixed(2));
  }
});

test('a straight walk from the last path segment to the door stays in the yard', () => {
  const a = { x: -1.68, z: -7.08 };
  for (let i = 0; i <= 20; i++) {
    const t = i / 20;
    assert.ok(inYard({ x: a.x + (DOOR_SPOT.x - a.x) * t, z: a.z + (DOOR_SPOT.z - a.z) * t }), String(i));
  }
});
