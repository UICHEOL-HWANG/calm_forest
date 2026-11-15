import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three/three.module.js';
import { WEEKLY_SOLIDS, MERCHANT_SOLID, buildWeeklyMarket } from '../js/spaces/weekly-market-art.js';
import { MARKET_POS, BOARD_POS } from '../js/data/weekly.js';
import { PLAZA_PATH } from '../js/data/plaza.js';

const SPOT_R = 1.8;
const PLAQUE = { x: 21.4, z: -0.9, r: 2.0 };
const STALL = { x: 25.4, z: -1.0, r: 2.0 };
const gap = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

test('cart and board sit at the chosen positions', () => {
  assert.deepEqual({ ...MARKET_POS }, { x: 17.4, z: -2.0 });
  assert.deepEqual({ ...BOARD_POS }, { x: 17.6, z: 1.9 });
});

test('cart and board each have a collider at their position', () => {
  const near = (p) => WEEKLY_SOLIDS.some(([x, z, r]) => Math.hypot(x - p.x, z - p.z) < 0.01 && r > 0);
  assert.ok(near(MARKET_POS));
  assert.ok(near(BOARD_POS));
});

test('colliders stay inside the interaction ring', () => {
  for (const [, , r] of WEEKLY_SOLIDS) assert.ok(r < 1.8);
});

test('the two colliders do not overlap and leave the stone path free', () => {
  const [a, b] = WEEKLY_SOLIDS;
  assert.ok(Math.hypot(a[0] - b[0], a[1] - b[1]) > a[2] + b[2]);
  for (const [px, pz] of PLAZA_PATH) for (const [x, z, r] of WEEKLY_SOLIDS) assert.ok(Math.hypot(px - x, pz - z) > r, `path ${px},${pz}`);
});

test('interaction rings do not reach the plaque or the seasonal stall', () => {
  for (const p of [MARKET_POS, BOARD_POS]) {
    assert.ok(gap(p, PLAQUE) >= SPOT_R + PLAQUE.r, `plaque ${gap(p, PLAQUE)}`);
    assert.ok(gap(p, STALL) >= SPOT_R + STALL.r, `stall ${gap(p, STALL)}`);
  }
});

for (const open of [false, true]) {
  test(`market group places cart and board at their own spots (open=${open})`, () => {
    const g = buildWeeklyMarket(THREE, { open });
    const cart = g.getObjectByName('cart');
    const board = g.getObjectByName('board');
    assert.ok(cart && board);
    assert.ok(Math.hypot(cart.position.x - MARKET_POS.x, cart.position.z - MARKET_POS.z) < 0.01);
    assert.ok(Math.hypot(board.position.x - BOARD_POS.x, board.position.z - BOARD_POS.z) < 0.01);
    assert.equal(!!g.getObjectByName('merchant'), open);
    const meshes = [];
    g.traverse(o => { if (o.isMesh) meshes.push(o); });
    assert.ok(meshes.length > 0);
  });
}

test('merchant has its own collider at the merchant and clear of the path and the cart', () => {
  const g = buildWeeklyMarket(THREE, { open: true });
  const m = g.getObjectByName('merchant');
  const w = new THREE.Vector3();
  g.updateMatrixWorld(true);
  m.getWorldPosition(w);
  const [x, z, r] = MERCHANT_SOLID;
  assert.ok(Math.hypot(w.x - x, w.z - z) < 0.01);
  assert.ok(r >= 0.4 && r < 0.6);
  for (const [px, pz] of PLAZA_PATH) assert.ok(Math.hypot(px - x, pz - z) > r, `path ${px},${pz}`);
  const [cx, cz, cr] = WEEKLY_SOLIDS[0];
  assert.ok(Math.hypot(cx - x, cz - z) >= cr + r - 0.001);
});

for (const open of [false, true]) {
  test(`board carries a lantern so the market reads at night (open=${open})`, () => {
    const g = buildWeeklyMarket(THREE, { open });
    const board = g.getObjectByName('board');
    assert.ok(board.userData.lamps.length >= 1);
    for (const mat of board.userData.lamps) assert.ok(g.userData.lamps.includes(mat));
  });
}
