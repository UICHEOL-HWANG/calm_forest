// tests/house-surface.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WALL_H, FLOOR_LIFT, decorHalf, surfaceAt, ceilingOk, planSeats } from '../js/house/surface.js';

const S = 1.5;
const table = { id: 'table', x: 10, z: 20, rot: 0, f: 0, top: { y: 0.66, pad: [1.1, 0.7] } };
const bigtable = { id: 'bigtable', x: 10, z: 20, rot: 0, f: 0, top: { y: 0.69, pad: [1.8, 1.0] } };
const vase = { sm: true, foot: [0.3, 0.3] };
const at = (o) => surfaceAt({ x: 10, z: 20, f: 0, def: vase, rot: 0, hosts: [table], scale: S, ...o });

test('상수', () => { assert.equal(WALL_H, 3); assert.equal(FLOOR_LIFT, 0.2); });

test('decorHalf: 90° 에서 가로·세로가 바뀐다', () => {
  const near = (a, b) => a.every((v, i) => Math.abs(v - b[i]) < 1e-9);   // 0.55*1.5 = 0.8250000000000001 — 부동소수점
  assert.ok(near(decorHalf([1.1, 0.7], 0, S), [0.825, 0.525]));
  assert.ok(near(decorHalf([1.1, 0.7], 1, S), [0.525, 0.825]));
});

test('sm 이 아닌 가구는 올라가지 않는다', () => {
  assert.equal(at({ def: { foot: [0.3, 0.3] } }), null);
});

test('상판 중심 위에 놓으면 상판 높이(배율 곱)로 올라간다', () => {
  const r = at({});
  assert.equal(r.hostIndex, 0);
  assert.ok(Math.abs(r.y - 0.66 * S) < 1e-9);
});

test('가장자리에 걸치는 건 허용, 중심이 밖이면 바닥', () => {
  assert.notEqual(at({ x: 10 + 0.825 }), null);
  assert.equal(at({ x: 10 + 0.83 }), null);
});

test('상판보다 큰 소품은 거부한다(스툴 위 어항)', () => {
  const stool = { id: 'stool', x: 10, z: 20, rot: 0, f: 0, top: { y: 0.42, pad: [0.44, 0.44] } };
  const aquarium = { sm: true, foot: [0.66, 0.42] };
  assert.equal(at({ def: aquarium, hosts: [stool] }), null);
});

test('폭이 같은 조합은 허용(협탁 위 라디오)', () => {
  const ns = { id: 'nightstand', x: 10, z: 20, rot: 0, f: 0, top: { y: 0.55, pad: [0.5, 0.45] } };
  const radio = { sm: true, foot: [0.5, 0.25] };
  assert.notEqual(at({ def: radio, hosts: [ns] }), null);
});

test('상판이 겹치면 가장 높은 것을 고른다', () => {
  const r = at({ hosts: [table, bigtable] });
  assert.equal(r.hostIndex, 1);
  assert.ok(Math.abs(r.y - 0.69 * S) < 1e-9);
});

test('다른 층 상판은 무시한다', () => {
  const upper = { ...table, f: 1 };
  assert.equal(at({ f: 0, hosts: [upper] }), null);
  assert.notEqual(at({ f: 1, hosts: [upper] }), null);
});

test('f 가 없는 옛 레코드는 1층(0)으로 본다', () => {
  const old = { ...table }; delete old.f;
  assert.notEqual(at({ f: 0, hosts: [old] }), null);
});

test('상판을 돌리면(90°) pad 가로·세로가 바뀐다', () => {
  const turned = { ...table, rot: 1 };
  assert.equal(at({ x: 10 + 0.7, hosts: [turned] }), null);   // rot 1 은 가로 반폭 0.525
  assert.notEqual(at({ z: 20 + 0.7, hosts: [turned] }), null); // 세로 반폭 0.825
});

test('top 이 없는 가구는 받침이 아니다', () => {
  assert.equal(at({ hosts: [{ id: 'sofa', x: 10, z: 20, rot: 0, f: 0 }] }), null);
});

test('ceilingOk: 탁상 등불은 되고 스탠드 램프(1.6)는 안 된다', () => {
  assert.equal(ceilingOk(0.66, 0.42, S), true);
  assert.equal(ceilingOk(0.66, 1.6, S), false);   // 0.2+(0.66+1.6)*1.5 = 3.59
});

// ── planSeats: 순서 무관 한 번에 앉히기 ──
const tableDef = { top: { y: 0.66, pad: [1.1, 0.7] } };
const bigDef = { top: { y: 0.69, pad: [1.8, 1.0] } };
const propDef = { sm: true, foot: [0.3, 0.3] };
const tItem = { x: 10, z: 20, rot: 0, f: 0, def: tableDef };
const pItem = { x: 10, z: 20, rot: 0, f: 0, def: propDef };

test('planSeats: 소품·탁자 순서가 바뀌어도 소품 결과가 같다', () => {
  const a = planSeats({ items: [pItem, tItem], scale: S })[0];
  const b = planSeats({ items: [tItem, pItem], scale: S })[1];
  assert.equal(a.onSurface, true);
  assert.equal(b.onSurface, true);
  assert.ok(Math.abs(a.y - 0.66 * S) < 1e-9);
  assert.equal(a.y, b.y);
});

test('planSeats: 탁자를 치우면 소품은 바닥으로(onSurface false, y 0, hostIndex -1)', () => {
  const [r] = planSeats({ items: [pItem], scale: S });
  assert.deepEqual(r, { onSurface: false, y: 0, hostIndex: -1 });
});

test('planSeats: 0층 탁자는 1층 소품을 받치지 않는다', () => {
  const r = planSeats({ items: [tItem, { ...pItem, f: 1 }], scale: S })[1];
  assert.equal(r.onSurface, false);
  assert.equal(r.y, 0);
});

test('planSeats: 소품은 받침이 되지 않고 탁자는 앉지 않는다(sm 만 앉는다)', () => {
  const [t, p] = planSeats({ items: [tItem, pItem], scale: S });
  assert.equal(t.onSurface, false);
  assert.equal(t.hostIndex, -1);
  assert.equal(p.hostIndex, 0);
  const [a, b] = planSeats({ items: [pItem, { ...pItem }], scale: S });   // top 없는 소품끼리는 서로 안 받친다
  assert.equal(a.onSurface, false);
  assert.equal(b.onSurface, false);
});

test('planSeats: 상판이 겹치면 높은 쪽이 받치고 hostIndex 가 그것을 가리킨다', () => {
  const r = planSeats({ items: [tItem, { ...tItem, def: bigDef }, pItem], scale: S });
  assert.equal(r[2].hostIndex, 1);
  assert.ok(Math.abs(r[2].y - 0.69 * S) < 1e-9);
});

test('planSeats: 결과 길이는 items 와 같다', () => {
  assert.equal(planSeats({ items: [], scale: S }).length, 0);
  assert.equal(planSeats({ items: [tItem, pItem, pItem], scale: S }).length, 3);
});
