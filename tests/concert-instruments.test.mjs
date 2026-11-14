import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three/three.module.js';
import { INSTRUMENTS } from '../js/data/concert.js';
import { makeRig, aimDir, frontZ, relax } from '../js/concert/instruments/pose.js';
import { buildInstrument } from '../js/concert/instruments/index.js';

const DEFS = {
  bear: { bodyR: 0.63, bodyScale: [1.08, 1.0, 1.06] },
  rabbit: { bodyR: 0.46, bodyScale: [1.0, 0.96, 1.0] },
  chick: { bodyR: 0.5, bodyScale: [1.02, 0.94, 1.02], extras: ['wings'] },
};

function fakePlayer(def) {
  const R = def.bodyR, bs = def.bodyScale, bodyY = R * bs[1] + 0.02;
  const anchor = new THREE.Group();
  const arm = (side) => {
    const pivot = new THREE.Group();
    pivot.position.set(side * R * 0.85 * bs[0], bodyY + R * 0.54, R * 0.2);
    const aim = new THREE.Group();
    aim.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), new THREE.Vector3(side * 0.29, -0.9, 0.32).normalize());
    const hand = new THREE.Group();
    hand.position.y = -R * 0.527;
    aim.add(hand); pivot.add(aim); anchor.add(pivot);
    return { pivot, hand };
  };
  return { anchor, arms: { R: arm(1), L: arm(-1) }, def };
}

const handAt = (p, key) => p.anchor.worldToLocal(p.arms[key].hand.getWorldPosition(new THREE.Vector3()));

test('aimDir puts the hand along the asked direction at arm length', () => {
  const p = fakePlayer(DEFS.bear);
  const rig = makeRig(THREE, p);
  const dir = new THREE.Vector3(-0.2, -0.4, 0.9).normalize();
  const want = aimDir(rig, 1, dir);
  assert.ok(handAt(p, 'R').distanceTo(want) < 1e-6);
  const fromShoulder = want.clone().sub(p.arms.R.pivot.position);
  assert.ok(Math.abs(fromShoulder.length() - rig.arms[1].reach) < 1e-6);
  assert.ok(fromShoulder.normalize().distanceTo(dir) < 1e-6);
});

test('relax returns both arms to the rest pose', () => {
  const p = fakePlayer(DEFS.rabbit);
  const rig = makeRig(THREE, p);
  aimDir(rig, 1, new THREE.Vector3(0, 0, 1));
  aimDir(rig, -1, new THREE.Vector3(0, 1, 0));
  relax(rig);
  for (const key of ['R', 'L']) assert.ok(p.arms[key].pivot.quaternion.angleTo(new THREE.Quaternion()) < 1e-6);
});

test('the body front is farthest at the belly centre and zero outside the body', () => {
  const rig = makeRig(THREE, fakePlayer(DEFS.bear));
  const centre = frontZ(rig, 0, rig.bodyY);
  assert.ok(centre > frontZ(rig, rig.R * 0.6, rig.bodyY));
  assert.equal(frontZ(rig, rig.R * 3, rig.bodyY), 0);
});

for (const [name, def] of Object.entries(DEFS)) {
  for (const { id } of INSTRUMENTS) {
    test(`${id} builds, poses and cleans up on a ${name}`, () => {
      const p = fakePlayer(def);
      const rig = makeRig(THREE, p);
      const inst = buildInstrument(THREE, id, rig);
      assert.equal(inst.group.parent, p.anchor);
      inst.pose(0, 0);
      inst.pose(1, 0);
      inst.pose(0, 1);
      let meshes = 0;
      inst.group.traverse(o => {
        if (!o.isMesh) return;
        meshes += 1;
        for (const v of o.geometry.attributes.position.array) assert.ok(Number.isFinite(v));
      });
      assert.ok(meshes > 0);
      inst.dispose();
      assert.equal(inst.group.parent, null);
    });
  }
}

test('a hit changes the pose of that side only', () => {
  const p = fakePlayer(DEFS.bear);
  const rig = makeRig(THREE, p);
  const inst = buildInstrument(THREE, 'drum', rig);
  inst.pose(0, 0);
  const restR = p.arms.R.pivot.quaternion.clone(), restL = p.arms.L.pivot.quaternion.clone();
  inst.pose(0, 1);
  assert.ok(p.arms.R.pivot.quaternion.angleTo(restR) > 0.01);
  assert.ok(p.arms.L.pivot.quaternion.angleTo(restL) < 1e-6);
});
