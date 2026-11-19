import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from '../vendor/three/three.module.js';
import { buildFinaleArt } from '../js/world/finale-art.js';
import { rootPoints } from '../js/world/finale-rig.js';

const BOX = { cx: 4, cy: 5, cz: -34, hx: 6.5, hy: 5, hz: 5 };
const make = () => buildFinaleArt(THREE, { box: BOX, pts: rootPoints({ x: 4, z: -35 }, { x: -4, z: 25 }) });
const drawables = (g) => { const out = []; g.traverse(o => { if (o.isMesh || o.isSprite || o.isPoints) out.push(o); }); return out; };
const scaleOf = (im, i) => { const m = new THREE.Matrix4(), s = new THREE.Vector3(); im.getMatrixAt(i, m); m.decompose(new THREE.Vector3(), new THREE.Quaternion(), s); return s.x; };

test('three 를 직접 import 하지 않는다', () => {
  assert.doesNotMatch(readFileSync(new URL('../js/world/finale-art.js', import.meta.url), 'utf8'), /from 'three'/);
});

test('그리기 호출 4개: 꽃·꽃잎·뿌리·뿌리 빛', () => {
  const a = make();
  assert.equal(drawables(a.group).length, 4);
});

test('뿌리 번짐: 0 이면 안 보이고 1 이면 끝까지', () => {
  const a = make();
  const tubes = drawables(a.group).filter(o => !o.isInstancedMesh);
  a.setReveal(0);
  assert.ok(tubes.every(o => o.geometry.drawRange.count === 0));
  a.setReveal(1);
  assert.ok(tubes.every(o => o.geometry.drawRange.count >= o.geometry.index.count));
});

test('꽃: 0 이면 다 접히고, 중간엔 아래쪽이 먼저, 1 이면 다 핀다', () => {
  const a = make();
  const im = drawables(a.group).find(o => o.isInstancedMesh && o.count >= 200);
  a.setBloom(0);
  for (let i = 0; i < im.count; i++) assert.equal(scaleOf(im, i), 0);
  a.setBloom(0.5);
  const ys = [], open = [];
  const m = new THREE.Matrix4(), p = new THREE.Vector3();
  for (let i = 0; i < im.count; i++) { im.getMatrixAt(i, m); p.setFromMatrixPosition(m); ys.push(p.y); open.push(scaleOf(im, i) > 0); }
  const meanY = (f) => { const v = ys.filter((_, i) => open[i] === f); return v.reduce((s, y) => s + y, 0) / Math.max(1, v.length); };
  assert.ok(meanY(true) < meanY(false));
  a.setBloom(1);
  for (let i = 0; i < im.count; i++) assert.ok(scaleOf(im, i) > 0);
});

test('밤엔 뿌리 빛이 더 진하다', () => {
  const a = make();
  const halo = drawables(a.group).find(o => o.material.transparent && !o.isInstancedMesh);
  a.setNight(false); const day = halo.material.opacity;
  a.setNight(true); assert.ok(halo.material.opacity > day);
});

test('꽃잎은 꽃이 반 넘게 핀 뒤에만 떨어진다', () => {
  const a = make();
  const petals = drawables(a.group).find(o => o.isInstancedMesh && o.count < 200);
  a.setBloom(0.3); assert.equal(petals.visible, false);
  a.setBloom(1); assert.equal(petals.visible, true);
  a.update(0.5);
});
