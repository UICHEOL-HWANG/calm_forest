import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three/three.module.js';
import { createArriveFx, arriveCurve, ARRIVE_SEC } from '../js/visitor-arrive.js';

test('등장 연출: 빛 기둥이 솟고 바닥 링이 퍼지며 1.6초 뒤 사라진다', () => {
  const a = arriveCurve(0), mid = arriveCurve(0.6), end = arriveCurve(ARRIVE_SEC);
  assert.equal(a.pillarY, 0);
  assert.equal(mid.pillarY, 1);
  assert.ok(mid.ringS > a.ringS);
  assert.ok(end.pillarA <= 1e-9 && end.ringA <= 1e-9);
  assert.equal(end.done, true);
});

test('등장 연출은 무대에 붙었다가 끝나면 스스로 빠지고 자원을 놓는다', () => {
  const group = new THREE.Group();
  const fx = createArriveFx(THREE);
  fx.spawn(group, { x: -5, z: 0 });
  assert.equal(group.children.length, 1);
  assert.equal(group.children[0].position.x, -5);
  for (let i = 0; i < 40; i++) fx.update(0.05);
  assert.equal(group.children.length, 0);
  assert.equal(fx.count, 0);
});

test('텃밭을 나가면 남은 연출을 모두 치운다', () => {
  const group = new THREE.Group();
  const fx = createArriveFx(THREE);
  fx.spawn(group, { x: 0, z: 0 });
  fx.spawn(group, { x: 1, z: 0 });
  fx.clear();
  assert.equal(group.children.length, 0);
});
