import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three/three.module.js';
import { paddlePose, hopHeight, faceStage, createActors } from '../js/auction/actors.js';

test('paddlePose lowers at 0 and lifts beside the head at 1, mirrored by side', () => {
  const lo = paddlePose(0, 1, 1), hi = paddlePose(1, 1, 1), hiL = paddlePose(1, -1, 1);
  assert.ok(Math.abs(lo.y - 0.05) < 1e-9 && Math.abs(hi.y - 1.0) < 1e-9);
  assert.ok(Math.abs(hi.x - 0.8) < 1e-9 && Math.abs(hiL.x + 0.8) < 1e-9);
  assert.ok(Math.abs(hi.rz + hiL.rz) < 1e-9);
  assert.ok(Math.abs(paddlePose(1, 1, 0.84).x - 0.8 * 0.84) < 1e-9);
});

test('hopHeight is a 0.42s arc of 0.26', () => {
  assert.equal(hopHeight(0), 0);
  assert.ok(Math.abs(hopHeight(0.21) - 0.26) < 1e-9);
  assert.equal(hopHeight(0.5), 0);
});

test('faceStage turns a figure toward the stage centre', () => {
  const ry = faceStage(0, 5);
  assert.ok(Math.abs(Math.abs(ry) - Math.PI) < 0.1);
  assert.ok(faceStage(-3, 3) > 0);
});

const defs = ['curator', 'stargazer', 'builder', 'merchant'].map((id) => ({ id, color: 0x888888 }));
const buildFigure = () => {
  const group = new THREE.Group();
  group.scale.setScalar(1);
  return { group };
};
const makeArms = () => {
  const pivot = new THREE.Group();
  const hand = new THREE.Group();
  pivot.add(hand);
  return { R: { pivot, hand } };
};

test('createActors raises paddles, drives the player arm and tears everything down', () => {
  const parent = new THREE.Group();
  const a = createActors(THREE, { buildFigure, npcDefs: defs, parent });
  const arms = makeArms();
  a.attachPlayer(arms);
  assert.equal(arms.R.hand.children.length, 1);
  a.raise('me', 10);
  a.raise('curator', 10);
  for (let i = 0; i < 40; i++) a.update(0.05, 1, i * 0.05);
  assert.ok(arms.R.pivot.rotation.x < -2.8);
  a.raise('me', 0);
  for (let i = 0; i < 40; i++) a.update(0.05, 5, 2 + i * 0.05);
  assert.ok(arms.R.pivot.rotation.x > -1.0);
  assert.deepEqual(a.spotOf('me'), [0.4, 5.9]);
  a.lead('curator');
  a.burst('builder');
  assert.ok(parent.children.length > 46);
  a.detachPlayer();
  assert.equal(arms.R.hand.children.length, 0);
  a.dispose();
  assert.equal(parent.children.length, 0);
});

test('hop twice plays two arcs then rests', () => {
  const parent = new THREE.Group();
  const a = createActors(THREE, { buildFigure, npcDefs: defs, parent });
  a.hop('builder', true);
  const lift = parent.children.find((c) => c.position.x === 2.9).children[0];
  let arcs = 0;
  let airborne = false;
  for (let i = 0; i < 80; i++) {
    a.update(0.02, 0, i * 0.02);
    const high = lift.position.y > 0.2;
    if (high && !airborne) arcs += 1;
    airborne = airborne ? lift.position.y > 0.05 : high;
  }
  assert.equal(arcs, 2);
  a.dispose();
});
