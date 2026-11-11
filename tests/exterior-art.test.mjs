import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three/three.module.js';
import { buildCraftCart, buildPriceBoard, tagData } from '../js/spaces/exterior-art.js';

const noop = () => {};
const ctx = new Proxy({}, { get: (t, k) => (k in t ? t[k] : noop), set: (t, k, v) => { t[k] = v; return true; } });
const makeCanvas = (w, h) => ({ width: w, height: h, getContext: () => ctx });
const env = { woodMap: new THREE.Texture(), makeCanvas };
const data = { hiIcon: '🍓', hiPct: 32, loIcon: '🥕', loPct: -18 };

function stats(obj) {
  const box = new THREE.Box3().setFromObject(obj);
  const size = box.getSize(new THREE.Vector3());
  let meshes = 0, lights = 0, emissiveMax = 0;
  obj.traverse(o => {
    if (o.isMesh) { meshes += 1; if (o.material.emissive && o.material.emissive.getHex() !== 0) emissiveMax = Math.max(emissiveMax, o.material.emissiveIntensity); }
    if (o.isLight) lights += 1;
  });
  return { box, size, meshes, lights, emissiveMax };
}

test('craft cart is grounded, bounded, light-free and cheap', () => {
  const s = stats(buildCraftCart(THREE, env));
  assert.ok(Math.abs(s.box.min.y) < 0.03);
  assert.ok(s.size.x > 1.5 && s.size.x < 1.95);
  assert.ok(s.size.z > 0.8 && s.size.z < 1.1);
  assert.ok(s.size.y > 2.6 && s.size.y < 3.2);
  assert.ok(s.meshes <= 20);
  assert.equal(s.lights, 0);
  assert.ok(s.emissiveMax <= 0.6);
});

test('price board is grounded, bounded, light-free and cheap', () => {
  const s = stats(buildPriceBoard(THREE, data, env));
  assert.ok(Math.abs(s.box.min.y) < 0.03);
  assert.ok(s.size.x > 2.0 && s.size.x < 2.6);
  assert.ok(s.size.z < 0.8);
  assert.ok(s.size.y > 2.5 && s.size.y < 3.1);
  assert.ok(s.meshes <= 20);
  assert.equal(s.lights, 0);
  assert.ok(s.emissiveMax <= 0.6);
});

test('tagData maps hi and lo crop data to two tags without words', () => {
  const tags = tagData(data);
  assert.deepEqual(tags, [
    { icon: '🍓', label: '32%', up: true },
    { icon: '🥕', label: '18%', up: false },
  ]);
  for (const t of tags) assert.match(t.label, /^\d+%$/);
});

test('tagData does not mutate its input', () => {
  const copy = { ...data };
  tagData(data);
  assert.deepEqual(data, copy);
});
