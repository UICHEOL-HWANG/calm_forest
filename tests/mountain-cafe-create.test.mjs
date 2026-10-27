import { test } from 'node:test';
import assert from 'node:assert/strict';
import { register } from 'node:module';
import * as THREE from '../vendor/three/three.module.js';

const threeUrl = new URL('../vendor/three/three.module.js', import.meta.url).href;
register(`data:text/javascript,export const resolve = (s, c, n) => s === 'three' ? { url: '${threeUrl}', shortCircuit: true } : n(s, c);`);

const ctx = new Proxy({}, { get: (_, k) => (k === 'measureText' ? () => ({ width: 10 }) : () => {}), set: () => true });
globalThis.document ??= { createElement: () => ({ width: 0, height: 0, getContext: () => ctx }) };

const { createCafe } = await import('../js/mountain/cafe-room.js');

test('createCafe builds the hut cafe without throwing', () => {
  const scene = new THREE.Scene();
  const cafe = createCafe({
    THREE, scene, mountain: { x: 0, z: -1000 },
    makeNameTag: () => new THREE.Object3D(), fadeNameTag: () => {}, getMountainGroup: () => null,
  });
  assert.equal(cafe.active(), false);
  const player = { position: new THREE.Vector3(), rotation: { y: 0 } };
  cafe.enter(player);
  assert.equal(cafe.active(), true);
  assert.ok(cafe.atExit(player.position));
});
