import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from '../vendor/three/three.module.js';
import { CARRY, poseCarry, handsMid } from '../js/restaurant/carry.js';

const read = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const arm = x => { const pivot = new THREE.Group(); pivot.position.x = x; const hand = new THREE.Group(); hand.position.y = -0.4; pivot.add(hand); return { pivot, hand }; };

test('들기 자세: 두 팔을 앞으로 들고 안쪽으로 모은다(좌우 대칭)', () => {
  const root = new THREE.Group(), arms = { R: arm(0.4), L: arm(-0.4) };
  root.add(arms.R.pivot, arms.L.pivot);
  poseCarry(arms);
  assert.equal(arms.R.pivot.rotation.x, CARRY.x);
  assert.equal(arms.R.pivot.rotation.z, -arms.L.pivot.rotation.z);
  assert.ok(CARRY.x < 0 && CARRY.fwd > 0);
  root.updateMatrixWorld(true);
  const m = handsMid(arms, new THREE.Vector3());
  assert.ok(Math.abs(m.x) < 1e-9);
  assert.ok(m.z > 0);
});

test('식당: 든 재료를 머리 위에 띄우지 않고 두 손 사이에 놓는다', () => {
  const rt = read('js/restaurant/runtime.js');
  assert.doesNotMatch(rt, /m\.position\.set\(0, 1\.42, 0\.5\)/);
  assert.match(rt, /syncHeld\(\); carryHeld\(\);/);
  assert.match(rt, /poseCarry\(arms\)/);
  assert.match(read('js/spaces/restaurant.js'), /arms: \(\) => playerArms/);
});
