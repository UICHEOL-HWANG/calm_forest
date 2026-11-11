import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three/three.module.js';
import { HALL, STAR } from '../js/restaurant/data.js';
import { buildHall, showForStar, itemMesh } from '../js/restaurant/hall.js';

const meshes = g => { const out = []; g.traverse(o => { if (o.isMesh) out.push(o); }); return out; };
const visibleMeshes = g => { const out = []; g.traverse(o => { if (o.isMesh) { let v = true; for (let p = o; p; p = p.parent) v = v && p.visible; if (v) out.push(o); } }); return out; };

test('실내는 방 1 + 설비 8 + 테이블 4 = 메시 13개', () => {
  const h = buildHall(THREE);
  assert.equal(meshes(h.group).length, 13);
  assert.deepEqual(Object.keys(h.stations).sort(), HALL.stations.map(s => s.id).sort());
  assert.equal(h.tables.length, HALL.tables.length);
});

test('별 단계에 맞춰 설비·테이블을 숨긴다', () => {
  const h = buildHall(THREE);
  showForStar(h, 1, STAR[1].tables);
  assert.equal(h.stations.pot.visible, false);
  assert.equal(h.stations.pan1.visible, false);
  assert.equal(h.tables[2].visible, false);
  assert.equal(visibleMeshes(h.group).length, 13 - 2 - 2);
  showForStar(h, 3, STAR[3].tables);
  assert.equal(h.stations.pot.visible, true);
  assert.equal(h.stations.pan1.visible, true);
});

test('음식 모형은 종류마다 만들어지고 접시를 담으면 하나 더 붙지 않는다', () => {
  for (const kind of ['fish', 'rice', 'fishChop', 'riceball', 'grilled', 'soup', 'burnt']) {
    assert.equal(meshes(itemMesh(THREE, { kind })).length, 1, kind);
    assert.equal(meshes(itemMesh(THREE, { kind, plated: true })).length, 1, kind);
  }
});
