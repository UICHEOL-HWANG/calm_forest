import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FARM_BUILDINGS, buildingCells, snapCenter, canPlaceBuilding, withinRadius, warehouseCap, storageTotal, compostLeft, HONEY_PER_HIVE, COMPOST_PER_DAY } from '../js/farm-building.js';

const by = id => FARM_BUILDINGS.find(b => b.id === id);
const farm = { center: { x: 0, z: 84 }, half: 6 };

test('FARM_BUILDINGS: 스펙 §4-1 7종 · farm 플래그 · 발자국 · 비용', () => {
  assert.deepEqual(FARM_BUILDINGS.map(b => b.id), ['board', 'warehouse', 'trellis', 'well', 'compost', 'shelter', 'beehive']);
  for (const b of FARM_BUILDINGS) { assert.equal(b.farm, true, b.id); assert.equal(b.fp.length, 2, b.id); assert.ok(Object.keys(b.cost).length > 0, b.id); }
  assert.deepEqual(by('warehouse').fp, [2, 2]); assert.deepEqual(by('trellis').fp, [1, 3]); assert.deepEqual(by('shelter').fp, [2, 2]);
  assert.equal(by('warehouse').cap, 60); assert.equal(by('well').radius, 5); assert.equal(by('beehive').radius, 5);
  assert.deepEqual(by('board').cost, { wood: 25, coins: 80 }); assert.deepEqual(by('well').cost, { wood: 20, stone: 25, coins: 100 });
});

test('snapCenter: 1×1 은 짝수 격자(칸 중심) · 2×2 는 홀수(네 칸 사이) · 1×3 은 축마다 다르고 회전이 바꾼다', () => {
  assert.deepEqual(snapCenter(4.4, 81.2, [1, 1], 0), [4, 82]);
  assert.deepEqual(snapCenter(4.4, 81.2, [2, 2], 0), [5, 81]);
  assert.deepEqual(snapCenter(4.4, 81.2, [1, 3], 0), [4, 82], '세로 3칸: x 짝수 · z 는 가운데 칸이 격자');
  assert.deepEqual(snapCenter(3.2, 81.2, [1, 3], 1), [4, 82], '90° 회전: 가로 3칸 — 여전히 홀수 폭이라 격자');
  assert.deepEqual(snapCenter(3.2, 81.2, [1, 2], 0), [4, 81], '1×2 세로: z 만 홀수');
});

test('buildingCells: 발자국이 덮는 칸 중심 목록 — 회전이 가로·세로를 바꾼다', () => {
  assert.deepEqual(buildingCells([1, 1], 4, 82, 0), [[4, 82]]);
  assert.deepEqual(buildingCells([2, 2], 5, 81, 0).sort(), [[4, 80], [4, 82], [6, 80], [6, 82]].sort());
  assert.deepEqual(buildingCells([1, 3], 4, 82, 0).sort(), [[4, 80], [4, 82], [4, 84]].sort());
  assert.deepEqual(buildingCells([1, 3], 4, 82, 1).sort(), [[2, 82], [4, 82], [6, 82]].sort(), '90° 회전이면 x 축으로 3칸');
});

test('canPlaceBuilding: 텃밭 밖 · 울타리 밖 · 밭 위 · 시설 겹침은 막고, 빈 자리는 통과', () => {
  const trellis = by('trellis'), wh = by('warehouse');
  assert.equal(canPlaceBuilding({ def: wh, x: 5, z: 81, rot: 0, atFarm: false, ...farm, plots: [], buildings: [] }).reason, 'notFarm');
  assert.equal(canPlaceBuilding({ def: wh, x: 5, z: 89, rot: 0, atFarm: true, ...farm, plots: [], buildings: [] }).reason, 'outside', '반경 6 이면 칸 중심은 ±4 까지');
  assert.equal(canPlaceBuilding({ def: wh, x: 3, z: 81, rot: 0, atFarm: true, ...farm, plots: [{ x: 4, z: 80 }], buildings: [] }).reason, 'plot');
  const others = [{ id: 'well', x: 2, z: 82, rot: 0 }];
  assert.equal(canPlaceBuilding({ def: trellis, x: 2, z: 82, rot: 1, atFarm: true, ...farm, plots: [], buildings: others }).reason, 'overlap');
  assert.equal(canPlaceBuilding({ def: trellis, x: 4, z: 82, rot: 0, atFarm: true, ...farm, plots: [], buildings: others }).ok, true);
  assert.equal(canPlaceBuilding({ def: wh, x: -3, z: 81, rot: 0, atFarm: true, ...farm, plots: [], buildings: [] }).ok, true);
});

test('withinRadius / warehouseCap / storageTotal / compostLeft / 상수', () => {
  assert.equal(withinRadius(0, 84, 5, 3, 88), true); assert.equal(withinRadius(0, 84, 5, 4, 88), false, '5.66 > 5');
  assert.equal(warehouseCap([{ id: 'warehouse' }, { id: 'well' }, { id: 'warehouse' }]), 120, '채별 합산');
  assert.equal(warehouseCap([]), 0);
  assert.equal(storageTotal({ wheat: 3, corn: 0, grape: 2, honey: 1 }), 6); assert.equal(storageTotal(undefined), 0);
  assert.equal(compostLeft({ compostDate: '2026-09-13', compostN: 2 }, '2026-09-13'), 1);
  assert.equal(compostLeft({ compostDate: '2026-09-12', compostN: 3 }, '2026-09-13'), COMPOST_PER_DAY, '날짜가 바뀌면 리셋');
  assert.equal(compostLeft({}, '2026-09-13'), COMPOST_PER_DAY);
  assert.equal(HONEY_PER_HIVE, 2); assert.equal(COMPOST_PER_DAY, 3);
});

test('canPlaceBuilding: 📐측량소 마당에도 놓을 수 있다(밭 칸을 아끼려고) · 마당 밖은 거절', () => {
  const def = FARM_BUILDINGS.find(d => d.id === 'warehouse');
  const center = { x: 0, z: 84 }, half = 6;
  const yard = { x0: -half - 8, x1: -half, z0: -6, z1: 6 };   // surveyYard(6)
  const base = { def, rot: 0, atFarm: true, center, half, plots: [], buildings: [] };
  assert.equal(canPlaceBuilding({ ...base, x: -10, z: 84, yard }).ok, true, '마당 한가운데');
  assert.equal(canPlaceBuilding({ ...base, x: -10, z: 84 }).ok, false, 'yard 를 안 주면 예전대로 울타리 안만');
  assert.equal(canPlaceBuilding({ ...base, x: -20, z: 84, yard }).reason, 'outside', '마당보다 서쪽');
  assert.equal(canPlaceBuilding({ ...base, x: -10, z: 94, yard }).reason, 'outside', '마당보다 남쪽');
  assert.equal(canPlaceBuilding({ ...base, x: 0, z: 84, yard }).ok, true, '밭 안은 그대로 된다');
});
