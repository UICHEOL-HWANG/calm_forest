import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MUSEUM_FLOORS, floorEntries } from '../js/museum.js';
import { museumLayout, dimsOf, stairBox, stairSpot, caseHalf, inwardOf, WALL_MAX, GALLERY_MAX } from '../js/museum/layout.js';
import { realDexIds } from './helpers/real-dex.mjs';

const REAL = Object.fromEntries(Object.entries(realDexIds()).map(([k, v]) => [k, v.map(id => ({ id }))]));
const realCount = (floor) => floorEntries(floor.id, REAL).length;
const box = (s) => { const { hx, hz } = caseHalf(s); return { x0: s.x - hx, x1: s.x + hx, z0: s.z - hz, z1: s.z + hz }; };
const overlap = (a, b) => a.x0 < b.x1 && a.x1 > b.x0 && a.z0 < b.z1 && a.z1 > b.z0;
const tableBox = (t) => ({ x0: t.x - t.w / 2, x1: t.x + t.w / 2, z0: t.z - t.d / 2, z1: t.z + t.d / 2 });

for (const floor of MUSEUM_FLOORS) {
  test(`${floor.name}: 실제 칸 수가 배치에 들어가고 자리 수와 같다`, () => {
    const n = realCount(floor);
    const L = museumLayout(floor.layout, n);
    assert.equal(L.slots.length, n, '칸 수와 자리 수가 다르다 — 전시물이 사라지거나 남는다');
  });

  test(`${floor.name}: 모든 칸이 이동 제한 안쪽(벽에서 0.8)이다`, () => {
    const L = museumLayout(floor.layout, realCount(floor));
    const { hw, hd } = L.dims;
    const out = L.slots.filter(s => Math.abs(s.x) > hw - 0.8 || Math.abs(s.z) > hd - 0.8);
    assert.deepEqual(out, [], '벽 밖 칸은 걸어갈 수 없어 영원히 못 본다');
  });

  test(`${floor.name}: 칸끼리 겹치지 않고 계단 박스·도착 지점·안내 반경과 겹치지 않는다`, () => {
    const L = museumLayout(floor.layout, realCount(floor));
    const cases = L.slots.filter(s => s.kind === 'case');
    for (let i = 0; i < L.slots.length; i++) for (let j = i + 1; j < L.slots.length; j++) {
      const d = Math.hypot(L.slots[i].x - L.slots[j].x, L.slots[i].z - L.slots[j].z);
      assert.ok(d > 1.1, `칸이 겹친다(간격 ${d.toFixed(2)})`);
    }
    for (const sx of [-1, 1]) {
      const sb = stairBox(sx, L.dims), spot = stairSpot(sx, L.dims), arrive = { x: spot.x, z: spot.z + 1.4 };
      for (const s of cases) {
        assert.ok(!overlap(box(s), sb), `유리장(${s.x},${s.z}) 이 계단 발판과 겹친다`);
        const h = caseHalf(s);
        assert.ok(Math.abs(arrive.x - s.x) > h.hx + 0.35 || Math.abs(arrive.z - s.z) > h.hz + 0.35, `도착 지점이 유리장(${s.x},${s.z}) 충돌체에 붙는다`);
      }
      for (const s of L.slots) {
        const [dx, dz] = inwardOf(s.ry);
        assert.ok(Math.hypot(s.x + dx * 0.9 - spot.x, s.z + dz * 0.9 - spot.z) > 1.8, `칸(${s.x},${s.z}) 앞이 계단 안내 반경에 든다`);
      }
      for (const t of L.tables) assert.ok(!overlap(tableBox(t), sb), '탁자가 계단과 겹친다');
    }
  });
}

test('벽 배치: 17칸이 뒷벽 5 + 좌우 6/6, 입구 길(가운데 폭 3.6)이 비어 있다', () => {
  const L = museumLayout('wall', 17);
  assert.equal(L.slots.filter(s => s.ry === 0).length, 5);
  assert.equal(L.slots.filter(s => s.ry > 0).length, 6);
  assert.equal(L.slots.filter(s => s.ry < 0).length, 6);
  assert.ok(L.slots.every(s => s.kind === 'case'));
  assert.deepEqual(L.tables, []);
  assert.deepEqual(L.slots.filter(s => Math.abs(s.x) < 1.8 && s.z > 3.0), [], '입구 길을 막았다');
});

test('벽 배치: 한도(17) 초과는 던진다 — 층 정의 오류를 조용히 삼키지 않는다', () => {
  assert.equal(WALL_MAX, 17);
  assert.throws(() => museumLayout('wall', 18), /17/);
  assert.doesNotThrow(() => museumLayout('wall', 1));
});

test('회랑 배치: 31칸 = 벽 15 + 탁자 16(두 줄 8칸), 11칸 = 벽 6 + 탁자 5(한 줄)', () => {
  const a = museumLayout('gallery', 31);
  assert.equal(a.slots.filter(s => s.kind === 'case').length, 15);
  assert.equal(a.slots.filter(s => s.kind === 'open').length, 16);
  assert.equal(a.tables.length, 2);
  const b = museumLayout('gallery', 11);
  assert.equal(b.slots.filter(s => s.kind === 'case').length, 6);
  assert.equal(b.slots.filter(s => s.kind === 'open').length, 5);
  assert.equal(b.tables.length, 1);
  assert.equal(GALLERY_MAX, 35);
  assert.throws(() => museumLayout('gallery', 36), /35/);
});

test('회랑 배치: 탁자 칸은 자기 탁자 위에 있고, 간격 ≥1.3, 두 줄 사이 통로 ≥2.2, 방 안쪽이다', () => {
  for (const n of [9, 11, 16, 20, 31, 35]) {
    const L = museumLayout('gallery', n), { hw } = L.dims;
    const open = L.slots.filter(s => s.kind === 'open');
    for (const s of open) {
      const t = L.tables.find(t => Math.abs(t.z - s.z) < 0.05 && Math.abs(s.x - t.x) <= t.w / 2);
      assert.ok(t, `탁자 칸(${s.x},${s.z}) 이 탁자 위에 없다`);
      assert.ok(t.x - t.w / 2 >= -(hw - 0.8) && t.x + t.w / 2 <= hw - 0.8, '탁자가 벽에 닿는다');
    }
    for (let i = 0; i < open.length; i++) for (let j = i + 1; j < open.length; j++) {
      if (Math.abs(open[i].z - open[j].z) < 0.05) assert.ok(Math.abs(open[i].x - open[j].x) >= 1.3, '탁자 칸이 붙었다');
    }
    if (L.tables.length === 2) assert.ok(tableBox(L.tables[1]).z0 - tableBox(L.tables[0]).z1 >= 2.2, '두 탁자 사이 통로가 좁다');
    // 두 탁자의 칸은 서로 통로 쪽을 본다
    if (L.tables.length === 2) {
      assert.ok(open.filter(s => s.z < 0).every(s => Math.abs(s.ry) < 0.01));
      assert.ok(open.filter(s => s.z > 0).every(s => Math.abs(Math.abs(s.ry) - Math.PI) < 0.01));
    }
  }
});

test('inwardOf — 칸이 바라보는 방향(통로 쪽)', () => {
  assert.deepEqual(inwardOf(0), [0, 1]);
  assert.deepEqual(inwardOf(Math.PI), [0, -1]);
  assert.deepEqual(inwardOf(Math.PI / 2), [1, 0]);
  assert.deepEqual(inwardOf(-Math.PI / 2), [-1, 0]);
});

test('방 크기: 벽 16×14, 회랑 20×14 — 소비처(이동 제한·미니맵)가 이 값을 읽는다', () => {
  assert.deepEqual(dimsOf('wall'), { hw: 8, hd: 7 });
  assert.deepEqual(dimsOf('gallery'), { hw: 10, hd: 7 });
});

// ✨ 1층 가운데 특별 진열대 3칸이 벽 유리장과 같은 자리를 쓰면 겹쳐 보인다(2026-10-06 실기기 제보)
test('1층 특별 진열대가 진열장과 겹치지 않는다', () => {
  const EXTRAS = readFileSync(new URL('../js/museum/extras.js', import.meta.url), 'utf8');
  const specials = JSON.parse(EXTRAS.match(/specials: (\[\[.*?\]\])/)[1]);
  const L = museumLayout('wall', 17);
  for (const [sx, sz] of specials) for (const s of L.slots) {
    assert.ok(Math.hypot(sx - s.x, sz - s.z) > 1.6, `특별 진열대(${sx},${sz}) 가 진열장(${s.x},${s.z})과 겹친다`);
  }
});
