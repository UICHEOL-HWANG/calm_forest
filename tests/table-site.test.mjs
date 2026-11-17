import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TABLE_SITES, TABLE_SHAPES, TABLE_TREE_CLEAR, TABLE_SOUTH_CLEAR, TABLE_DECOR_PAD } from '../js/data/table.js';
import { POND_SPOTS, POND_BIG_SPOT, POND_STAGE_R } from '../js/data/pond.js';
import { RESTAURANT_SIGN } from '../js/restaurant/data.js';
import { ISLE, ISLE_R, STREAM_HALF, BANK_W } from '../js/world/bridge.js';
import { walkLimit } from '../js/world/walk-bounds.js';
import {
  tableFootprint, tableKeepOut, tableSiteFor, tableBlockedBy, tableCovers, segmentHitsKeepOut, tableMapKey, tableClear,
} from '../js/table/site.js';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const places = read('js/data/places.js');
const vec = (name) => {
  const m = places.match(new RegExp(`const ${name} = new THREE\\.Vector3\\((-?[\\d.]+), 0, (-?[\\d.]+)\\)`));
  assert.ok(m, `${name} not found`);
  return { x: Number(m[1]), z: Number(m[2]) };
};
const HOUSE = vec('HOUSE_POS');
const HOUSE_HALF = 3.95, HOUSE_PAD = 1.2;
const d = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const edge = (f, p) => Math.hypot(Math.max(0, Math.abs(p.x - f.x) - f.hx), Math.max(0, Math.abs(p.z - f.z) - f.hz));
const radius = (f) => Math.hypot(f.hx, f.hz);
const facilities = [...places.matchAll(/export const ([A-Z_]+) = new THREE\.Vector3\((-?[\d.]+), 0, (-?[\d.]+)\)/g)]
  .map(m => ({ name: m[1], x: Number(m[2]), z: Number(m[3]) }))
  .filter(g => g.name !== 'HOUSE_POS' && Math.abs(g.x) < 45 && Math.abs(g.z) < 45);
const BENCHES = [...places.match(/const PARK_BENCHES = \[(.+)\];/)[1].matchAll(/\[(-?[\d.]+), (-?[\d.]+), /g)].map(m => ({ x: Number(m[1]), z: Number(m[2]) }));
const NPC_R = Number(read('js/data/character.js').match(/export const NPC_R = ([\d.]+);/)[1]);
const gateM = read('js/spaces/farm-field.js').match(/\[-([\d.]+), ([\d.]+)\]\.forEach\(px => solidCircle\(FARM_GATE\.x \+ px, FARM_GATE\.z, ([\d.]+)\)\)/);
const GATE_HALF = Number(gateM?.[1]) + Number(gateM?.[3]);
const owlM = read('js/data/npcs.js').match(/id: 'courier'[^\n]*pos: \[(-?[\d.]+), 0, (-?[\d.]+)\]/);
const OWL = { x: Number(owlM?.[1]), z: Number(owlM?.[2]) };
const [FRONT, BACK] = TABLE_SITES;
const LONG = TABLE_SITES.map(s => ({ id: s.id, f: tableFootprint(s, 'long', HOUSE) }));
const smallPond = (i) => ({ ...POND_SPOTS[i], r: POND_STAGE_R[0] });

test('자리는 앞마당과 집 뒤 두 곳, 긴 식탁 발자국이 가장 넓다', () => {
  assert.deepEqual(TABLE_SITES.map(s => s.id), ['front', 'back']);
  assert.deepEqual(tableFootprint(FRONT, 'long', HOUSE), { x: -3.5, z: 0.5, hx: 2.1, hz: 1.3 });
  assert.deepEqual(tableFootprint(BACK, 'round', HOUSE), { x: -11, z: -19, hx: 1.5, hz: 1.5 });
  assert.ok(facilities.length > 10);
  assert.equal(BENCHES.length, 2);
  assert.equal(NPC_R, 0.45);
  assert.ok(GATE_HALF > 1 && GATE_HALF < 2);
});

test('두 자리 모두 7단계 집과 통로를 비켜 선다', () => {
  for (const { id, f } of LONG) {
    const apart = Math.abs(f.x - HOUSE.x) >= f.hx + HOUSE_HALF + HOUSE_PAD || Math.abs(f.z - HOUSE.z) >= f.hz + HOUSE_HALF + HOUSE_PAD;
    assert.ok(apart, id);
  }
});

test('호수·나루터 물가·박물관 물길과 겹치지 않고 걷는 범위 안이다', () => {
  for (const { id, f } of LONG) {
    assert.ok(edge(f, vec('LAKE')) >= 6 + 1, `${id} 호수`);
    assert.ok(edge(f, vec('DOCK_POND')) >= 7 + 1, `${id} 나루터 ${edge(f, vec('DOCK_POND')).toFixed(2)}`);
    assert.ok(d(f, ISLE) >= ISLE_R + STREAM_HALF + BANK_W + radius(f) + 1, `${id} 물길`);
    assert.ok(Math.hypot(f.x, f.z) + radius(f) + 1 <= walkLimit(Math.atan2(f.z, f.x)), `${id} 걷는 범위`);
  }
});

test('시설·공원 의자·식당 팻말과 발자국 끝에서 2.5 이상, 안개 숲 입구와 10 이상', () => {
  for (const { id, f } of LONG) {
    for (const g of facilities) assert.ok(edge(f, g) >= 2.5, `${id} ${g.name} ${edge(f, g).toFixed(2)}`);
    for (const b of BENCHES) assert.ok(edge(f, b) >= 2.5, `${id} 의자 ${b.x},${b.z}`);
    assert.ok(edge(f, RESTAURANT_SIGN) >= 2.5, `${id} 식당 팻말`);
    assert.ok(d(f, vec('MIST_GATE')) >= 10, `${id} 안개 숲 ${d(f, vec('MIST_GATE')).toFixed(2)}`);
  }
});

test('남쪽(카메라 쪽) 가까이에는 집도 시설도 서 있지 않다', () => {
  const tall = [{ name: 'HOUSE_POS', ...HOUSE }, ...facilities]
    .map(g => ({ ...g, r: g.name === 'HOUSE_POS' ? 3.9 : g.name === 'FARM_GATE' ? GATE_HALF : 2.5 }));
  for (const { id, f } of LONG) {
    for (const g of tall) {
      const south = g.z - f.z;
      assert.ok(!(south > 0 && south < f.hz + 7 && Math.abs(g.x - f.x) < f.hx + g.r), `${id} ${g.name}`);
    }
  }
});

test('자리 고르기: 연못이 앞마당 여분 자리에 있으면 집 뒤로 비킨다', () => {
  const pick = (o) => tableSiteFor({ pond: null, outdoorRel: [], plotsRel: [], ...o })?.id ?? null;
  assert.equal(pick({}), 'front');
  assert.equal(pick({ pond: smallPond(0) }), 'front');
  assert.equal(pick({ pond: smallPond(1) }), 'back');
  assert.equal(pick({ pond: smallPond(2) }), 'back');
  assert.equal(pick({ pond: { ...POND_BIG_SPOT, r: POND_STAGE_R[2] } }), 'front');
  assert.equal(pick({ outdoorRel: null, plotsRel: undefined }), 'front');
});

test('자리 고르기: 꾸미기나 밭이 있으면 비키고, 둘 다 막히면 짓지 않는다', () => {
  const pick = (o) => tableSiteFor({ pond: null, outdoorRel: [], plotsRel: [], ...o })?.id ?? null;
  const onFront = { dx: FRONT.dx + 2.1 + TABLE_DECOR_PAD - 0.05, dz: FRONT.dz };
  const offFront = { dx: FRONT.dx + 2.1 + TABLE_DECOR_PAD + 0.05, dz: FRONT.dz };
  const onBack = { dx: BACK.dx, dz: BACK.dz - 1.3 - TABLE_DECOR_PAD + 0.05 };
  assert.equal(pick({ outdoorRel: [onFront] }), 'back');
  assert.equal(pick({ outdoorRel: [offFront] }), 'front');
  assert.equal(pick({ plotsRel: [onFront] }), 'back');
  assert.equal(pick({ outdoorRel: [onFront], plotsRel: [onBack] }), null);
  assert.equal(pick({ pond: smallPond(1), outdoorRel: [onBack] }), null);
  assert.equal(tableBlockedBy({ pond: null, outdoorRel: [], plotsRel: [] }), null);
  assert.equal(tableBlockedBy({ pond: null, outdoorRel: [onFront], plotsRel: [] }), null);
  assert.equal(tableBlockedBy({ pond: null, outdoorRel: [onFront, onBack], plotsRel: [] }), 'decor');
  assert.equal(tableBlockedBy({ pond: smallPond(1), outdoorRel: [], plotsRel: [onBack] }), 'plots');
  assert.equal(tableBlockedBy({ pond: null, outdoorRel: [onFront], plotsRel: [onBack] }), 'decor');
});

test('둥근 식탁일 때 긴 식탁 발자국에만 걸리는 꾸미기도 자리를 막는다', () => {
  const corner = { dx: FRONT.dx + 2.0, dz: FRONT.dz };
  assert.equal(tableSiteFor({ pond: null, outdoorRel: [corner], plotsRel: [] }).id, 'back');
});

test('주민 금지 원은 발자국을 다 덮는다', () => {
  assert.equal(tableKeepOut(FRONT, 'round', HOUSE).length, 1);
  assert.equal(tableKeepOut(FRONT, 'long', HOUSE).length, 3);
  for (const site of TABLE_SITES) for (const shape of ['round', 'long']) {
    const f = tableFootprint(site, shape, HOUSE), circles = tableKeepOut(site, shape, HOUSE);
    for (let i = 0; i <= 20; i++) for (let j = 0; j <= 20; j++) {
      const p = { x: f.x - f.hx + (i / 20) * f.hx * 2, z: f.z - f.hz + (j / 20) * f.hz * 2 };
      assert.ok(circles.some(c => d(p, c) <= c.r + 1e-9), `${site.id} ${shape} ${p.x},${p.z}`);
    }
    for (const p of [{ x: f.x - f.hx + 0.1, z: f.z - f.hz + 0.1 }, { x: f.x + f.hx - 0.1, z: f.z }, { x: f.x, z: f.z + f.hz - 0.1 }]) {
      assert.ok(circles.some(c => d(p, c) < c.r + 0.35), `${site.id} ${shape} 안쪽 점`);
    }
    for (const c of circles) assert.ok(c.r <= radius(f) + 1e-9);
  }
});

test('올빼미 자리는 금지 원 밖에 있다', () => {
  assert.deepEqual(OWL, { x: -3, z: -3 });
  for (const site of TABLE_SITES) for (const shape of ['round', 'long']) {
    for (const c of tableKeepOut(site, shape, HOUSE)) {
      assert.ok(d(OWL, c) - c.r >= 0.35 + NPC_R, `${site.id} ${shape} ${(d(OWL, c) - c.r).toFixed(2)}`);
    }
  }
});

test('비행 선이 금지 원을 지나는지', () => {
  const circles = tableKeepOut(FRONT, 'long', HOUSE);
  assert.equal(segmentHitsKeepOut({ x: -3.5, z: -4 }, { x: -3.5, z: 5 }, circles, 0), true);
  assert.equal(segmentHitsKeepOut({ x: -9, z: 0.5 }, { x: 2, z: 0.5 }, circles, 0), true);
  assert.equal(segmentHitsKeepOut({ x: -3, z: -3 }, { x: 1, z: -5 }, circles, 0.8), false);
  assert.equal(segmentHitsKeepOut({ x: -3, z: -3 }, { x: -3.5, z: -1.2 }, circles, 0), false);
  assert.equal(segmentHitsKeepOut({ x: -3, z: -3 }, { x: -3.5, z: -1.2 }, circles, 0.8), true);
  assert.equal(segmentHitsKeepOut({ x: 0, z: 0 }, { x: 0, z: 0 }, [{ x: 0, z: 0.5, r: 1 }], 0), true);
  assert.equal(segmentHitsKeepOut({ x: 0, z: 0 }, { x: 1, z: 0 }, [], 5), false);
});

test('나무 치우는 범위는 발자국 둘레 1.5와 남쪽 띠를 덮는다', () => {
  assert.equal(TABLE_TREE_CLEAR, 1.5);
  assert.equal(TABLE_SOUTH_CLEAR, 3);
  for (const shape of ['round', 'long']) {
    const s = TABLE_SHAPES[shape], c = tableClear(shape);
    assert.equal(c.treeR, Math.hypot(s.hx, s.hz) + TABLE_TREE_CLEAR);
    assert.equal(c.south, TABLE_SOUTH_CLEAR);
    assert.ok(c.r < c.treeR && c.r >= Math.hypot(s.hx, s.hz) + 0.5);
    for (let a = 0; a < 360; a += 5) {
      const ux = Math.cos(a * Math.PI / 180), uz = Math.sin(a * Math.PI / 180);
      for (const [px, pz] of [[s.hx, s.hz], [s.hx, -s.hz], [-s.hx, s.hz], [-s.hx, -s.hz], [s.hx, 0], [0, s.hz]]) {
        assert.ok(Math.hypot(px + ux * TABLE_TREE_CLEAR, pz + uz * TABLE_TREE_CLEAR) <= c.treeR + 1e-9);
      }
    }
    assert.ok(c.treeR + c.south >= s.hz + 3);
    assert.ok(c.treeR >= s.hx + TABLE_TREE_CLEAR);
  }
  assert.ok(TABLE_SHAPES.long.reach >= Math.hypot(2.1, 1.3) + 0.4);
  assert.ok(TABLE_SHAPES.round.reach >= 1.5 + 0.5);
});

test('이웃 마당용 덮임 판정과 지도 열쇠', () => {
  const t = { dx: FRONT.dx, dz: FRONT.dz, shape: 'long' };
  assert.equal(tableCovers(t, FRONT.dx + 2.0, FRONT.dz, 0), true);
  assert.equal(tableCovers(t, FRONT.dx + 2.5, FRONT.dz, 0), false);
  assert.equal(tableCovers(t, FRONT.dx + 2.5, FRONT.dz, 0.5), true);
  assert.equal(tableCovers(null, 0, 0, 9), false);
  assert.equal(tableMapKey('front', 'long'), 'front/long');
  assert.notEqual(tableMapKey('back', 'long'), tableMapKey('front', 'long'));
  assert.notEqual(tableMapKey('front', 'round'), tableMapKey('front', 'long'));
});
