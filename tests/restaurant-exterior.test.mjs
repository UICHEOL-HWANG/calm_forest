import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from '../vendor/three/three.module.js';
import { buildBistro, setBistroEvening } from '../js/restaurant/exterior.js';

const meshes = g => { const out = []; g.traverse(o => { if (o.isMesh) out.push(o); }); return out; };
const lights = g => { const out = []; g.traverse(o => { if (o.isLight) out.push(o); }); return out; };

test('외관 모듈은 three 를 직접 import 하지 않는다', () => {
  const src = readFileSync(new URL('../js/restaurant/exterior.js', import.meta.url), 'utf8');
  assert.doesNotMatch(src, /from 'three'/);
});

test('비스트로는 합친 메시 2개(몸체·발광)이고 조명은 없다', () => {
  const g = buildBistro(THREE);
  const ms = meshes(g);
  assert.equal(ms.length, 2);
  assert.ok(ms.some(m => m.userData.glow === true));
  assert.equal(lights(g).length, 0);
});

test('크기와 정면 방향', () => {
  const box = new THREE.Box3().setFromObject(buildBistro(THREE));
  const size = box.getSize(new THREE.Vector3());
  assert.ok(size.x >= 6.4 && size.x <= 7.6, `x ${size.x}`);
  assert.ok(size.y >= 4.5 && size.y <= 5.6, `y ${size.y}`);
  assert.ok(box.max.z > -box.min.z + 1.5, 'front terrace on +z');
});

test('저녁 점등은 발광 세기를 올리고 낮엔 되돌린다', () => {
  const g = buildBistro(THREE);
  const glow = meshes(g).find(m => m.userData.glow);
  const day = glow.material.emissiveIntensity;
  setBistroEvening(g, 1);
  assert.ok(glow.material.emissiveIntensity > day);
  setBistroEvening(g, 0);
  assert.equal(glow.material.emissiveIntensity, day);
});
