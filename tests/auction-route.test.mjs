import { test } from 'node:test';
import assert from 'node:assert/strict';
import { register } from 'node:module';

const threeUrl = new URL('../vendor/three/three.module.js', import.meta.url).href;
register(`data:text/javascript,export const resolve = (s, c, n) => s === 'three' ? { url: '${threeUrl}', shortCircuit: true } : n(s, c);`);

const { segHitsCircle, segHitsBox, blocked, ringNodes, planRoute, planAround, nextPoint, pathLength, guideStatus } = await import('../js/auction/route.js');
const { AUCTION_STAGE, AUCTION_ENTRY, AUCTION_STAGE_BOX } = await import('../js/data/auction.js');
const { DOCK_POND, DOCK_POND_R, SEA_COVE, LAKE, LAKE_R } = await import('../js/data/places.js');
const { walkLimit } = await import('../js/world/walk-bounds.js');

const P = (x, z) => ({ x, z });

test('segment against a circle', () => {
  const c = { x: 0, z: 0, r: 1 };
  assert.equal(segHitsCircle(P(-3, 0), P(3, 0), c, 0), true);
  assert.equal(segHitsCircle(P(-3, 2), P(3, 2), c, 0), false);
  assert.equal(segHitsCircle(P(-3, 1.5), P(3, 1.5), c, 0.6), true);
  assert.equal(segHitsCircle(P(-3, 0), P(-2, 0), c, 0), false);
});

test('segment against a box', () => {
  const b = { x1: -1, z1: -1, x2: 1, z2: 1 };
  assert.equal(segHitsBox(P(-3, 0), P(3, 0), b, 0), true);
  assert.equal(segHitsBox(P(-3, 2), P(3, 2), b, 0), false);
  assert.equal(segHitsBox(P(-3, 1.4), P(3, 1.4), b, 0.5), true);
  assert.equal(segHitsBox(P(-3, -3), P(3, 3), b, 0), true);
  assert.equal(segHitsBox(P(2, 0), P(3, 5), b, 0), false);
});

test('a blocker the walker brushes only blocks legs that dig further in', () => {
  const pond = { x: 0, z: 0, r: 2 };
  assert.equal(blocked(P(2.3, 0), P(2.3, 6), [pond], 0.5), false);
  assert.equal(blocked(P(2.3, 0), P(8, 0), [pond], 0.5), false);
  assert.equal(blocked(P(2.3, 0), P(-6, 0.5), [pond], 0.5), true);
  const box = { x1: -1, z1: -1, x2: 1, z2: 1 };
  assert.equal(blocked(P(1.2, 0), P(6, 0), [box], 0.5), false);
  assert.equal(blocked(P(1.2, 0), P(-6, 0), [box], 0.5), true);
  assert.equal(blocked(P(-6, 0), P(1.2, 0), [box], 0.5), false);
  assert.equal(blocked(P(5, -3), P(5, 3), [pond], 0.5), false);
  assert.equal(blocked(P(-5, 0), P(5, 0), [pond], 0.5), true);
});

test('ringNodes sit outside every blocker and inside the walkable area', () => {
  const blockers = [{ x: 0, z: 0, r: 2 }, { x1: 4, z1: -1, x2: 6, z2: 1 }];
  const nodes = ringNodes(blockers, { gap: 1, inside: p => Math.hypot(p.x, p.z) < 7 });
  assert.ok(nodes.length >= 8);
  for (const n of nodes) {
    assert.ok(Math.hypot(n.x, n.z) > 2.5, JSON.stringify(n));
    assert.ok(!(n.x > 3.5 && n.x < 6.5 && n.z > -1.5 && n.z < 1.5), JSON.stringify(n));
    assert.ok(Math.hypot(n.x, n.z) < 7);
  }
});

test('a clear line is a single leg', () => {
  assert.deepEqual(planRoute(P(0, 0), P(5, 5), [], { pad: 0.5 }), [P(5, 5)]);
});

test('a pond in the way is walked around', () => {
  const pond = { x: 0, z: 0, r: 3 };
  const route = planRoute(P(-8, 0), P(8, 0), [pond], { pad: 0.5, gap: 1.2 });
  assert.ok(route.length >= 2);
  assert.deepEqual(route.at(-1), P(8, 0));
  let prev = P(-8, 0);
  for (const p of route) { assert.equal(blocked(prev, p, [pond], 0.5), false); prev = p; }
  assert.ok(pathLength(P(-8, 0), route) < 16 * 1.6);
});

test('planAround pulls in small solids only when a leg runs into them', () => {
  const notch = [{ x: 7.4, z: -6.4, r: 1.1 }, { x: 8.85, z: -5.65, r: 0.3 }];
  const far = { x: 30, z: 30, r: 0.8 };
  const wedged = P(8.31, -5.18);
  const out = planAround(wedged, P(10.5, -14.8), [], notch, { pad: 0.6, gap: 1.6 });
  assert.ok(out.length >= 2, JSON.stringify(out));
  assert.equal(blocked(wedged, out[0], notch, 0.6), false);
  const straight = planAround(P(0, 0), P(20, 0), [], [far], { pad: 0.6 });
  assert.deepEqual(straight, [P(20, 0)]);
  const route = planAround(P(4, -2), P(12, -9.5), [], [...notch, far], { pad: 0.6, gap: 1.6 });
  assert.ok(route.length >= 2, JSON.stringify(route));
  let prev = P(4, -2);
  for (const p of route) { assert.equal(blocked(prev, p, notch, 0.6), false, JSON.stringify([prev, p])); prev = p; }
});

test('no route falls back to the straight line', () => {
  const wall = { x1: -1, z1: -100, x2: 1, z2: 100 };
  assert.deepEqual(planRoute(P(-5, 0), P(5, 0), [wall], { pad: 0.5, inside: () => false }), [P(5, 0)]);
});

test('nextPoint drops reached waypoints but never the goal', () => {
  const route = [P(0, 5), P(5, 5)];
  assert.deepEqual(nextPoint(route, P(0, 0), 1.2), { point: P(0, 5), route });
  assert.deepEqual(nextPoint(route, P(0, 4.5), 1.2), { point: P(5, 5), route: [P(5, 5)] });
  assert.deepEqual(nextPoint([P(5, 5)], P(5, 5), 1.2), { point: P(5, 5), route: [P(5, 5)] });
});

test('guideStatus ends on arrival, on close and when the player leaves', () => {
  const spot = P(10, 10);
  const on = { open: true, inVillage: true, pos: P(0, 0), spot, reach: 2.4 };
  assert.equal(guideStatus(on), 'go');
  assert.equal(guideStatus({ ...on, pos: P(10, 11.5) }), 'arrive');
  assert.equal(guideStatus({ ...on, open: false }), 'closed');
  assert.equal(guideStatus({ ...on, inVillage: false }), 'left');
});

const stageBox = AUCTION_STAGE_BOX;
const realBlockers = [
  { x: DOCK_POND.x, z: DOCK_POND.z, r: DOCK_POND_R },
  { x: SEA_COVE.x, z: SEA_COVE.z, r: SEA_COVE.r },
  { x: LAKE.x, z: LAKE.z, r: LAKE_R },
  stageBox,
];
const inside = p => Math.hypot(p.x, p.z) < walkLimit(Math.atan2(p.z, p.x)) - 1;

test('the entry spot is in front of the stage and outside the stage box', () => {
  assert.equal(AUCTION_ENTRY.x, AUCTION_STAGE.x);
  assert.equal(AUCTION_ENTRY.z, AUCTION_STAGE.z + 3.2);
  assert.equal(segHitsBox(AUCTION_ENTRY, AUCTION_ENTRY, stageBox, 0), false);
  assert.ok(stageBox.z2 < AUCTION_ENTRY.z);
});

test('routes from the usual start points never cross water or the stage', () => {
  const starts = [P(0, 0), P(-8, -4), P(0, 7), P(23, -4), P(-6, -32), P(4, -34), P(12, -28), P(-14, -20), P(36, -6)];
  for (const s of starts) {
    const route = planRoute(s, AUCTION_ENTRY, realBlockers, { pad: 0.6, gap: 1.6, inside });
    assert.deepEqual(route.at(-1), AUCTION_ENTRY, JSON.stringify(s));
    let prev = s;
    for (const p of route) {
      assert.equal(blocked(prev, p, realBlockers, 0.6), false, `${JSON.stringify(s)} leg ${JSON.stringify(prev)} -> ${JSON.stringify(p)}`);
      prev = p;
    }
  }
});

test('from behind the stage the route goes around it, not through', () => {
  const route = planRoute(P(10.5, -24), AUCTION_ENTRY, realBlockers, { pad: 0.6, gap: 1.6, inside });
  assert.ok(route.length >= 2, JSON.stringify(route));
});
