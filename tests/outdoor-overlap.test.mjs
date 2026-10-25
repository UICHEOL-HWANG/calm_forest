import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { outdoorFootprint, shapesOverlap, blockedByWorld } from '../js/world/outdoor-overlap.js';

const tree = (x, z) => ({ x, z, r: 0.8, off: false });
const cart = { w: 2.28, d: 0.98 };

test('나무 줄기 위에 수레를 놓으면 막힌다', () => {
  const fp = outdoorFootprint('mine_cart', 1, 0, 0, { cartBox: cart, cartId: 'mine_cart' });
  assert.equal(blockedByWorld(fp, [tree(1.5, 0.3)]), true);
});

test('나무에서 충분히 떨어지면 놓인다', () => {
  const fp = outdoorFootprint('mine_cart', 5, 0, 0, { cartBox: cart, cartId: 'mine_cart' });
  assert.equal(blockedByWorld(fp, [tree(0, 0)]), false);
});

test('수레를 90도 돌리면 가로·세로가 바뀐다', () => {
  const a = outdoorFootprint('mine_cart', 0, 0, 0, { cartBox: cart, cartId: 'mine_cart' });
  const b = outdoorFootprint('mine_cart', 0, 0, 1, { cartBox: cart, cartId: 'mine_cart' });
  assert.ok(Math.abs((a.x2 - a.x1) - 2.28) < 1e-9 && Math.abs((b.z2 - b.z1) - 2.28) < 1e-9);
});

test('작은 장식도 나무와 겹치면 막히고, 꺼진 충돌체·무시 목록은 건너뛴다', () => {
  const fp = outdoorFootprint('postlamp', 0.5, 0, 0);
  const t = tree(0, 0);
  assert.equal(blockedByWorld(fp, [t]), true);
  assert.equal(blockedByWorld(fp, [{ ...t, off: true }]), false);
  assert.equal(blockedByWorld(fp, [t], new Set([t])), false);
});

test('건물 상자와 겹치면 막힌다', () => {
  const house = { x1: -2, z1: -2, x2: 2, z2: 2, off: false };
  assert.equal(blockedByWorld(outdoorFootprint('fence', 2.2, 0, 0), [house]), true);
  assert.equal(blockedByWorld(outdoorFootprint('fence', 2.7, 0, 0), [house]), false);
});

test('딱 맞닿기만 하면 겹침이 아니다', () => {
  assert.equal(shapesOverlap({ x: 0, z: 0, r: 0.5 }, { x: 1, z: 0, r: 0.5 }), false);
});

test('placeOutdoor 는 새로 놓을 때만 세계 충돌체와의 겹침을 막고, 장식끼리는 무시한다', () => {
  const src = readFileSync(new URL('../js/game.js', import.meta.url), 'utf8');
  assert.match(src, /if \(!silent && !def\.farm && outdoorBlockedByWorld\(id, wx, wz, ry\)\)/);
  assert.match(src, /outdoorMeshes\.map\(m => m\.userData\.solid\)/);
});
