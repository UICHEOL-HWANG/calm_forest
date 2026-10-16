import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from '../vendor/three/three.module.js';
import { SOUVENIR_INDOOR_IDS, buildSouvenir, souvenirOutdoorMesh } from '../js/mountain/souvenir-art.js';
import { EN } from '../js/i18n-en.js';

const read = p => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const meshes = g => { let n = 0; g.traverse(o => { if (o.isMesh) n++; }); return n; };

test('souvenir meshes stay within three meshes each', () => {
  for (const id of SOUVENIR_INDOOR_IDS) { const n = meshes(buildSouvenir(THREE, id)); assert.ok(n >= 1 && n <= 3, id); }
  assert.ok(meshes(souvenirOutdoorMesh(THREE, 'summitflag')) <= 3);
  assert.equal(souvenirOutdoorMesh(THREE, 'fence'), null);
});

test('catalog entries: hut-only indoor decor and a hidden outdoor flag', () => {
  const cat = read('js/data/catalog.js');
  assert.match(cat, /\{ id: 'snowglobe', name: '설산 스노볼', ico: '🔮', cost: 150, pay: 'coins', hut: true, foot: \[0\.35, 0\.35\], sm: true, h: 0\.45 \}/);
  assert.match(cat, /\{ id: 'hutmodel', name: '미니 등불 산장 모형', ico: '🏠', cost: 300, pay: 'coins', hut: true, foot: \[0\.6, 0\.6\] \}/);
  assert.match(cat, /\{ id: 'summitflag', name: '정상 깃발', ico: '🚩', cost: \{ coins: 9999 \}, desc: '산장 카페에서 산 정상 깃발', hidden: true \}/);
});

test('hut decor only shows in the decor list when stored', () => {
  assert.match(read('js/game.js'), /\.filter\(d => !d\.hut \|\| \(kept\[d\.id\] \|\| 0\) > 0\)/);
});

test('mesh dispatchers know the souvenirs', () => {
  assert.match(read('js/spaces/indoor.js'), /SOUVENIR_INDOOR_IDS\.includes\(id\)\) \{\s*g\.add\(buildSouvenir\(THREE, id\)\);/);
  assert.match(read('js/game.js'), /\{ const m = souvenirOutdoorMesh\(THREE, id\); if \(m\) return m; \}/);
});

test('souvenir names have English', () => {
  for (const ko of ['설산 스노볼', '미니 등불 산장 모형', '정상 깃발', '산장 카페에서 산 정상 깃발']) assert.ok(EN[ko], ko);
});

test('hut model is one coloured mesh plus a glow gable within its footprint', () => {
  const g = buildSouvenir(THREE, 'hutmodel');
  assert.equal(meshes(g), 2);
  let solid = null;
  g.traverse(o => { if (o.isMesh && o.geometry.getAttribute('color')) solid = o; });
  assert.ok(solid);
  const col = solid.geometry.getAttribute('color');
  const has = hex => {
    const c = new THREE.Color(hex);
    for (let i = 0; i < col.count; i++) if (Math.abs(col.getX(i) - c.r) < 1e-3 && Math.abs(col.getY(i) - c.g) < 1e-3 && Math.abs(col.getZ(i) - c.b) < 1e-3) return true;
    return false;
  };
  assert.ok(has(0x34465c) && has(0xf7fafd));
  const size = new THREE.Box3().setFromObject(g).getSize(new THREE.Vector3());
  const box = new THREE.Box3().setFromObject(g);
  assert.ok(size.x <= 0.55 && size.y <= 0.6 && size.z <= 0.55 && box.min.y >= -1e-6);
});
