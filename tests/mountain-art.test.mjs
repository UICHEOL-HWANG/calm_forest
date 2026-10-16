import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from '../vendor/three/three.module.js';
import { buildBackdrop } from '../js/mountain/backdrop.js';
import { buildLandmark, LANDMARK } from '../js/mountain/landmark.js';
import { existsSync } from 'node:fs';
import { createReveal } from '../js/mountain/reveal.js';

const meshes = g => { const out = []; g.traverse(o => { if (o.isMesh) out.push(o); }); return out; };

test('art modules do not import three directly', () => {
  for (const f of ['backdrop', 'landmark', 'reveal']) {
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

test('village landmark is the snow mountain itself: exactly 2 draw calls, no arch module left', () => {
  const ms = meshes(buildLandmark(THREE));
  assert.equal(ms.length, 2);
  assert.equal(ms.filter(m => m.isInstancedMesh).length, 1);
  assert.equal(existsSync(new URL('../js/mountain/gate-art.js', import.meta.url)), false);
});

test('landmark uses the approved wild mockup A shape', () => {
  assert.deepEqual({ ...LANDMARK }, { radius: 7, height: 6.5, spur: 1.2, groundColor: 0xd3e2b0, frontGap: 0.38, cloudScale: 1.6 });
});

test('landmark mountain keeps village fog while its clouds ignore fog like the backdrop', () => {
  const ms = meshes(buildLandmark(THREE));
  assert.notEqual(ms.find(m => !m.isInstancedMesh).material.fog, false);
  assert.equal(ms.find(m => m.isInstancedMesh).material.fog, false);
});

test('landmark clouds are the backdrop band for the same size with every puff 1.6x bigger', () => {
  const big = meshes(buildLandmark(THREE)).find(m => m.isInstancedMesh);
  const base = meshes(buildBackdrop(THREE, { radius: 7, height: 6.5, frontGap: 0.38 })).find(m => m.isInstancedMesh);
  assert.equal(big.count, base.count);
  const ma = new THREE.Matrix4(), mb = new THREE.Matrix4();
  const pa = new THREE.Vector3(), pb = new THREE.Vector3(), sa = new THREE.Vector3(), sb = new THREE.Vector3(), q = new THREE.Quaternion();
  for (let i = 0; i < base.count; i++) {
    big.getMatrixAt(i, ma); base.getMatrixAt(i, mb);
    ma.decompose(pa, q, sa); mb.decompose(pb, q, sb);
    assert.ok(pa.distanceTo(pb) < 1e-6, `puff ${i} moved`);
    for (const k of ['x', 'y', 'z']) assert.ok(Math.abs(sa[k] / sb[k] - 1.6) < 1e-6, `puff ${i} ${k}`);
  }
});

test('landmark base is not a circle: its foot radius varies with angle', () => {
  const mtn = meshes(buildLandmark(THREE)).find(m => !m.isInstancedMesh);
  const pos = mtn.geometry.attributes.position;
  const BUCKETS = 36, reach = new Array(BUCKETS).fill(0);
  for (let i = 0; i < pos.count; i++) {
    if (pos.getY(i) < 0.05) continue;
    const x = pos.getX(i), z = pos.getZ(i);
    const b = Math.floor(((Math.atan2(z, x) + Math.PI * 2) % (Math.PI * 2)) / (Math.PI * 2) * BUCKETS) % BUCKETS;
    reach[b] = Math.max(reach[b], Math.hypot(x, z));
  }
  assert.ok(reach.every(r => r > 0));
  assert.ok(Math.max(...reach) / Math.min(...reach) >= 1.3, `ratio ${Math.max(...reach) / Math.min(...reach)}`);
});

test('landmark foot colours blend into the village ground at the outer edge', () => {
  const mtn = meshes(buildLandmark(THREE)).find(m => !m.isInstancedMesh);
  const pos = mtn.geometry.attributes.position, col = mtn.geometry.attributes.color;
  const ground = new THREE.Color(0xd3e2b0);
  let outer = 0;
  for (let i = 0; i < pos.count; i++) outer = Math.max(outer, Math.hypot(pos.getX(i), pos.getZ(i)));
  let n = 0;
  for (let i = 0; i < pos.count; i++) {
    if (Math.hypot(pos.getX(i), pos.getZ(i)) < outer * 0.99) continue;
    n++;
    assert.ok(Math.abs(col.getX(i) - ground.r) < 0.01 && Math.abs(col.getY(i) - ground.g) < 0.01 && Math.abs(col.getZ(i) - ground.b) < 0.01, `vertex ${i}`);
    assert.ok(Math.abs(pos.getY(i)) < 1e-6);
  }
  assert.ok(n > 0);
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

test('reveal finish() releases the rig, disposes the backdrop and is idempotent', () => {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera();
  const rigs = [];
  const r = createReveal({ THREE, scene, camera, setCameraRig: fn => rigs.push(fn), from: new THREE.Vector3(0, 1.2, 0), at: new THREE.Vector3(0, 30, -150), durationMs: 3000 });
  r.start();
  const ms = meshes(r.group());
  let disposed = 0;
  for (const m of ms) m.geometry.addEventListener('dispose', () => { disposed++; });
  r.finish();
  r.finish();
  assert.equal(rigs.at(-1), null);
  assert.equal(rigs.filter(f => f === null).length, 1);
  assert.equal(disposed, ms.length);
  assert.equal(scene.children.length, 0);
  assert.equal(r.group(), null);
  assert.equal(r.update(0.1), false);
});
