import { test } from 'node:test';
import assert from 'node:assert/strict';
import { register } from 'node:module';

const threeUrl = new URL('../vendor/three/three.module.js', import.meta.url).href;
register(`data:text/javascript,export const resolve = (s, c, n) => s === 'three' ? { url: '${threeUrl}', shortCircuit: true } : n(s, c);`);

const { AUCTION_STAGE } = await import('../js/data/auction.js');
const { DOCK_POND, DOCK_POND_R, SEA_COVE, SEA_GATE, KITCHEN } = await import('../js/data/places.js');

const HALF_W = 3.2, HALF_D = 1.6, POLE_X = 6.4, POLE_Z = 4, ENTRY_Z = 3.2, ENTRY_R = 2.4, KITCHEN_R = 2.2;
const SAND = SEA_COVE.r + 1.1 + 0.4;
const d2 = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const corners = [-1, 1].flatMap(sx => [-1, 1].map(sz => ({ x: AUCTION_STAGE.x + sx * HALF_W, z: AUCTION_STAGE.z + sz * HALF_D })));
const poles = [-1, 1].map(s => ({ x: AUCTION_STAGE.x + s * POLE_X, z: AUCTION_STAGE.z + POLE_Z }));
const boxGap = c => Math.hypot(
  Math.max(0, Math.abs(c.x - AUCTION_STAGE.x) - HALF_W),
  Math.max(0, Math.abs(c.z - AUCTION_STAGE.z) - HALF_D));

test('the stage sits between the ferry pond and the sea cove', () => {
  assert.equal(AUCTION_STAGE.x, 10.5);
  assert.equal(AUCTION_STAGE.z, -18);
});

test('the stage box stays out of the ferry pond', () => {
  for (const c of corners) assert.ok(d2(c, DOCK_POND) > DOCK_POND_R + 0.3, JSON.stringify(c));
  assert.ok(boxGap(DOCK_POND) > DOCK_POND_R + 0.3, 'nearest box point');
});

test('the stage box and lantern poles stay off the cove sand', () => {
  assert.ok(boxGap(SEA_COVE) > SAND, 'box');
  for (const p of poles) assert.ok(d2(p, SEA_COVE) > SAND, JSON.stringify(p));
});

test('the lantern poles leave the sea gate prompt clear', () => {
  const prompt = { x: SEA_GATE.x - 0.4, z: SEA_GATE.z + 1 };
  for (const p of poles) assert.ok(d2(p, prompt) > 2.5, JSON.stringify(p));
});

test('the stage entry spot does not overlap the free kitchen prompt', () => {
  const entry = { x: AUCTION_STAGE.x, z: AUCTION_STAGE.z + ENTRY_Z };
  assert.ok(d2(entry, KITCHEN) > ENTRY_R + KITCHEN_R);
});
