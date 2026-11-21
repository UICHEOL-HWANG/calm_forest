import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three/three.module.js';
import { HALL, STAR, MENU_KEYS } from '../js/restaurant/data.js';
import { buildHall, showForStar, itemMesh } from '../js/restaurant/hall.js';

const meshes = g => { const out = []; g.traverse(o => { if (o.isMesh) out.push(o); }); return out; };
const visibleMeshes = g => { const out = []; g.traverse(o => { if (o.isMesh) { let v = true; for (let p = o; p; p = p.parent) v = v && p.visible; if (v) out.push(o); } }); return out; };

test('실내는 방 1 + 설비 14 + 테이블 4 + 칠판 줄 6 = 메시 25개', () => {
  const h = buildHall(THREE);
  assert.equal(meshes(h.group).length, 25);
  assert.deepEqual(Object.keys(h.rows), MENU_KEYS);
  assert.deepEqual(Object.keys(h.stations).sort(), HALL.stations.map(s => s.id).sort());
  assert.equal(h.tables.length, HALL.tables.length);
});

test('별 단계에 맞춰 설비·테이블을 숨긴다', () => {
  const h = buildHall(THREE);
  showForStar(h, 1, STAR[1].tables);
  assert.equal(h.stations.pot.visible, false);
  assert.equal(h.stations.pan1.visible, false);
  assert.equal(h.tables[2].visible, false);
  assert.equal(visibleMeshes(h.group).length, 13 - 2 - 2 + 2);
  assert.equal(h.rows.soup.visible, false);
  showForStar(h, 3, STAR[3].tables);
  assert.equal(h.stations.pot.visible, true);
  assert.equal(h.stations.pan1.visible, true);
  showForStar(h, 5, STAR[5].tables);
  assert.deepEqual(['bowl', 'fryer0', 'fryer1', 'crate_shrimp', 'crate_squid', 'crate_veg'].map(id => h.stations[id].visible), [true, true, false, true, true, false]);
  assert.deepEqual(MENU_KEYS.map(k => h.rows[k].visible), [true, true, true, true, true, false]);
  showForStar(h, 6, STAR[6].tables);
  assert.equal(h.stations.fryer1.visible, true);
  assert.equal(h.rows.vegfry.visible, true);
});

test('음식 모형은 종류마다 만들어지고 접시를 담으면 하나 더 붙지 않는다', () => {
  for (const kind of ['fish', 'rice', 'fishChop', 'riceball', 'grilled', 'soup', 'burnt', 'shrimp', 'squid', 'veg', 'shrimpBat', 'squidBat', 'vegBat', 'shrimpfry', 'squidfry', 'vegfry']) {
    assert.equal(meshes(itemMesh(THREE, { kind })).length, 1, kind);
    assert.equal(meshes(itemMesh(THREE, { kind, plated: true })).length, 1, kind);
  }
});

test('화분은 손님 길에서 몸 반경과 잎 반경만큼 떨어져 있다', async () => {
  const { guestPath } = await import('../js/restaurant/session.js');
  const segDist = (p, a, b) => {
    const dx = b.x - a.x, dz = b.z - a.z, L = dx * dx + dz * dz;
    const k = L ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / L)) : 0;
    return Math.hypot(p.x - a.x - dx * k, p.z - a.z - dz * k);
  };
  assert.equal(HALL.plants.length, 2);
  for (const [x, z] of HALL.plants) for (let t = 0; t < HALL.tables.length; t++) {
    const path = guestPath(t);
    for (let i = 1; i < path.length; i++) assert.ok(segDist({ x, z }, path[i - 1], path[i]) >= 0.45 + 0.38, `plant ${x},${z} table ${t}`);
  }
});
