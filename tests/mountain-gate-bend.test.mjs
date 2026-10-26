import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three/three.module.js';
import { GATE_BEND, stepPole, touchesPole, createGateBend } from '../js/mountain/gate-bend.js';
import { buildMountainSpace, gateSpots } from '../js/mountain/interior-art.js';

const gates = () => buildMountainSpace(THREE).userData.gates;
const pos = m => m.geometry.getAttribute('position').array;

test('every pole and flag has its own vertex span on the merged gate mesh', () => {
  const m = gates(), spans = m.userData.spans, spots = gateSpots();
  assert.equal(spans.length, spots.length);
  const total = spans.reduce((n, s) => n + s.count, 0);
  assert.equal(total, m.geometry.getAttribute('position').count);
  spans.forEach((s, i) => assert.equal(s.x, spots[i].x));
});

test('a sled passing a pole bends it away and it springs back upright', () => {
  const m = gates(), bend = createGateBend(m), span = m.userData.spans[0];
  const rest = pos(m).slice();
  bend.update({ x: span.x - 0.3, z: span.z }, 0, 1 / 60);
  for (let i = 0; i < 6; i++) bend.update({ x: span.x - 0.3, z: span.z }, 0, 1 / 60);
  let top = span.start * 3;
  for (let i = span.start; i < span.start + span.count; i++) if (rest[i * 3 + 1] > rest[top + 1]) top = i * 3;
  const moved = Math.hypot(pos(m)[top] - rest[top], pos(m)[top + 2] - rest[top + 2]);
  assert.ok(moved > 0.05, `top moved ${moved}`);
  for (let i = 0; i < 240; i++) bend.update({ x: 1e9, z: 1e9 }, 0, 1 / 60);
  assert.ok(pos(m).every((v, i) => Math.abs(v - rest[i]) < 1e-6));
});

test('the pole leans away from the sled side and downhill', () => {
  let b = { a: 0, w: 0, dx: 0, dz: 1 };
  for (let i = 0; i < 5; i++) b = stepPole(b, 1 / 60, { dx: 0.6, dz: 1 });
  assert.ok(b.a > 0.1 && b.dx > 0 && b.dz > 0);
  assert.ok(b.a <= GATE_BEND.max);
});

test('poles far away or under a high jump are left alone', () => {
  const span = { x: 0, z: 0 };
  assert.equal(touchesPole(span, { x: 2, z: 0 }, 0), false);
  assert.equal(touchesPole(span, { x: 0.3, z: 0 }, GATE_BEND.airY + 0.1), false);
  assert.equal(touchesPole(span, { x: 0.3, z: 0 }, 0), true);
});

test('reset puts every pole back exactly', () => {
  const m = gates(), bend = createGateBend(m), span = m.userData.spans[5];
  const rest = pos(m).slice();
  for (let i = 0; i < 5; i++) bend.update({ x: span.x + 0.2, z: span.z }, 0, 1 / 60);
  bend.reset();
  assert.deepEqual(Array.from(pos(m)), Array.from(rest));
});
