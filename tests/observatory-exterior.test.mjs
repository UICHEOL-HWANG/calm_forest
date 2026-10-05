import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import vm from 'node:vm';
import * as THREE from '../vendor/three/three.module.js';

function build() {
  const url = new URL('../js/observatory/exterior.js', import.meta.url);
  assert.ok(existsSync(url), 'C exterior builder must exist');
  const context = vm.createContext({ THREE });
  const game = readFileSync(new URL('../js/game.js', import.meta.url), 'utf8');
  const merge = game.slice(game.indexOf('function mergeGeos('), game.indexOf('// 테이퍼 튜브'));
  vm.runInContext(merge + readFileSync(url, 'utf8').replace(/^import .*;$/gm, '').replace(/^export /gm, ''), context);
  return context.buildObservatoryExterior(context.mergeGeos);
}

test('C exterior fits eight material batches and one body shadow', () => {
  const group = build();
  assert.ok(group.children.length <= 8);
  assert.equal(group.children.filter(m => m.castShadow).length, 1);
  assert.ok(group.children.every(m => !m.material.clippingPlanes));
  const bounds = new THREE.Box3().setFromObject(group);
  assert.ok(bounds.max.y > 9 && bounds.max.y < 10);
  assert.ok(bounds.max.z >= 7);
});

test('dome has a real open slit and stars follow the whole hemisphere', () => {
  const group = build();
  const body = group.getObjectByName('body');
  group.updateMatrixWorld(true);
  const dir = new THREE.Vector3(-Math.sin(-2.35), 0.65, -Math.cos(-2.35)).normalize();
  const center = new THREE.Vector3(0, 4.92, 0);
  const ray = new THREE.Raycaster(center.clone().addScaledVector(dir, 10), dir.clone().negate(), 0, 9);
  assert.equal(ray.intersectObject(body).length, 0, 'slit must not be painted onto a closed dome');
  const stars = group.getObjectByName('stars');
  stars.geometry.computeBoundingBox();
  assert.ok(stars.geometry.boundingBox.max.y > 8.5);
  assert.ok(stars.geometry.boundingBox.min.y < 6);
});

test('looking down into the slit shows the dark lining, not the beige wall top', () => {
  const group = build();
  group.updateMatrixWorld(true);
  const d = new THREE.Vector3(-Math.sin(-2.35), 0, -Math.cos(-2.35));
  const up = new THREE.Vector3(0, 1, 0), center = new THREE.Vector3(0, 4.92, 0);
  const view = new THREE.Vector3(0, -Math.sin(0.72), -Math.cos(0.72));   // gameplay camera: from +z, 41° down
  for (const deg of [8, 15, 25]) {
    const a = deg * Math.PI / 180;
    const p = center.clone().addScaledVector(d, 4.3 * Math.cos(a)).addScaledVector(up, 4.3 * Math.sin(a));
    const hits = new THREE.Raycaster(p.clone().addScaledVector(view, -6), view, 0, 20).intersectObjects(group.children);
    assert.ok(hits.length, `slit ${deg}° ray hits nothing`);
    assert.equal(hits[0].object.name, 'inner', `slit ${deg}° shows ${hits[0].object.name}`);
  }
});
