import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from '../vendor/three/three.module.js';
import { buildBackdrop } from '../js/mountain/backdrop.js';
import { buildGateArt } from '../js/mountain/gate-art.js';
import { createReveal } from '../js/mountain/reveal.js';

const meshes = g => { const out = []; g.traverse(o => { if (o.isMesh) out.push(o); }); return out; };

test('art modules do not import three directly', () => {
  for (const f of ['backdrop', 'gate-art', 'reveal']) {
    const src = readFileSync(new URL(`../js/mountain/${f}.js`, import.meta.url), 'utf8');
    assert.doesNotMatch(src, /from 'three'/, f);
  }
});

test('backdrop is two draw calls and ignores fog', () => {
  const ms = meshes(buildBackdrop(THREE, { radius: 60, height: 34, frontGap: 0.38 }));
  assert.equal(ms.length, 2);
  assert.ok(ms.every(m => m.material.fog === false));
  assert.ok(ms.some(m => m.isInstancedMesh));
});

test('backdrop cloud band leaves the front gap empty', () => {
  const clouds = meshes(buildBackdrop(THREE, { radius: 60, height: 34, frontGap: 0.38 })).find(m => m.isInstancedMesh);
  const mtx = new THREE.Matrix4(), p = new THREE.Vector3();
  for (let i = 0; i < clouds.count; i++) {
    clouds.getMatrixAt(i, mtx); p.setFromMatrixPosition(mtx);
    assert.ok(Math.abs(Math.atan2(p.z, p.x) - Math.PI / 2) >= 0.18, `cloud ${i} in gap`);
  }
});

test('gate art stays within 3 draw calls', () => {
  assert.ok(meshes(buildGateArt(THREE)).length <= 3);
});

test('reveal installs a rig, adds and removes the backdrop, then releases the camera', () => {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera();
  const rigs = [];
  const r = createReveal({ THREE, scene, camera, setCameraRig: fn => rigs.push(fn), from: new THREE.Vector3(0, 1.2, 0), at: new THREE.Vector3(0, 30, -150), durationMs: 3000 });
  r.start();
  assert.equal(typeof rigs[0], 'function');
  assert.equal(scene.children.length, 1);
  rigs[0](camera, 0.016);
  let alive = true, t = 0;
  while (alive && t < 5) { alive = r.update(0.1); t += 0.1; }
  assert.equal(alive, false);
  assert.equal(rigs.at(-1), null);
  assert.equal(scene.children.length, 0);
});

test('reveal builds the backdrop on start and disposes its geometries and materials when it finishes', () => {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera();
  const r = createReveal({ THREE, scene, camera, setCameraRig: () => {}, from: new THREE.Vector3(0, 1.2, 0), at: new THREE.Vector3(0, 30, -150), durationMs: 3000 });
  assert.equal(r.group(), null);
  r.start();
  const ms = meshes(r.group());
  assert.ok(ms.length > 0);
  const disposed = new Set();
  for (const m of ms) {
    m.geometry.addEventListener('dispose', () => disposed.add(m.geometry));
    m.material.addEventListener('dispose', () => disposed.add(m.material));
  }
  let alive = true, t = 0;
  while (alive && t < 5) { alive = r.update(0.1); t += 0.1; }
  for (const m of ms) {
    assert.ok(disposed.has(m.geometry), 'geometry disposed');
    assert.ok(disposed.has(m.material), 'material disposed');
  }
  assert.equal(scene.children.length, 0);
});
