import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from '../vendor/three/three.module.js';
import { worldSteer } from '../js/mountain/sled-input.js';
import { createSled, stepSled } from '../js/mountain/sled.js';
import { COURSE, centerX } from '../js/mountain/course.js';
import { slopePoint } from '../js/mountain/terrain.js';
import { sledCamTargets, sledYaw } from '../js/mountain/sled-view.js';

const src = readFileSync(new URL('../js/spaces/mountain.js', import.meta.url), 'utf8');
const between = (s, a, b) => s.slice(s.indexOf(a), s.indexOf(b, s.indexOf(a) + a.length));

function cameraFor(s) {
  const { pos, look } = sledCamTargets(s);
  const cam = new THREE.PerspectiveCamera(42, 16 / 9, 0.1, 200);
  cam.position.set(pos.x, pos.y, pos.z);
  cam.lookAt(look.x, look.y, look.z);
  cam.updateMatrixWorld();
  return cam;
}

const screenX = (cam, q) => new THREE.Vector3(q.x, q.y, q.z).project(cam).x;

function ride(input, ms = 500) {
  const start = { ...createSled(0), z: 60, x: centerX(60) };
  const steer = worldSteer(input);
  const end = Array.from({ length: ms / 50 }).reduce(s => stepSled(s, 50, steer, COURSE), start);
  return { start, end, steer };
}

for (const [side, input, sign] of [['right', { left: false, right: true }, 1], ['left', { left: true, right: false }, -1]]) {
  test(`pressing ${side} moves the sled toward screen ${side}`, () => {
    const { start, end } = ride(input);
    const cam = cameraFor(start);
    const a = screenX(cam, slopePoint(start.z, start.x));
    const b = screenX(cam, slopePoint(start.z, end.x));
    assert.ok(Math.sign(b - a) === sign && Math.abs(b - a) > 0.02, `screen dx ${(b - a).toFixed(3)}`);
  });

  test(`pressing ${side} leans the avatar toward screen ${side}`, () => {
    const { start, steer } = ride(input);
    const cam = cameraFor(start);
    const p = slopePoint(start.z, start.x);
    const yaw = sledYaw(steer);
    const ahead = { x: p.x + Math.sin(yaw) * 5, y: p.y, z: p.z + Math.cos(yaw) * 5 };
    const straight = { x: p.x, y: p.y, z: p.z + 5 };
    assert.equal(Math.sign(screenX(cam, ahead) - screenX(cam, straight)), sign);
  });
}

test('no input or both sides keeps the sled straight', () => {
  assert.equal(worldSteer({ left: false, right: false }), 0);
  assert.equal(worldSteer({ left: true, right: true }), 0);
});

test('the runtime steers through worldSteer and leans the ride by sideways speed', () => {
  const upd = between(src, 'export function updateMountain', '\n}\n');
  assert.match(upd, /const steer = worldSteer\(run\.input\.read\(\)\);/);
  assert.match(upd, /stepSled\(run\.sled, .*, steer, run\.course\)/);
  assert.match(upd, /rideSlope\(run\.sled\.vx \/ run\.sled\.phys\.steerRate, dt\)/);
  assert.doesNotMatch(src, /steerFrom\(/);
});
