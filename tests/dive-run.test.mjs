import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DIVE, DIVE_SPECIES } from '../js/forage/logic.js';
import { DIVE_AREA, diveDepthAt, createDiveRun, stepDiveRun, pressDive, ascendDive, nearestDiveItem } from '../js/forage/dive-run.js';

const seeded = (seed = 7) => {
  let x = seed >>> 0;
  return () => { x = (x + 0x6D2B79F5) >>> 0; let r = Math.imul(x ^ (x >>> 15), 1 | x); r ^= r + Math.imul(r ^ (r >>> 7), 61 | r); return ((r ^ (r >>> 14)) >>> 0) / 4294967296; };
};
const fresh = (o = {}) => createDiveRun({ rnd: seeded(), ...o });
const P = { x: 0, z: -6 };
const run60 = (run, sec, p = P, t0 = 0) => {
  const ev = { surfaced: 0, outOfAir: 0, over: false };
  for (let i = 0; i < sec * 60; i++) {
    const e = stepDiveRun(run, 1 / 60, p, t0 + i * 1000 / 60);
    ev.surfaced += e.surfaced ? 1 : 0; ev.outOfAir += e.outOfAir ? 1 : 0; ev.over = ev.over || e.over;
  }
  return ev;
};

test('the sea floor deepens offshore and treasures match their depth', () => {
  assert.ok(diveDepthAt(0, 2) < diveDepthAt(0, -20));
  const run = fresh();
  assert.equal(run.items.length, DIVE_AREA.START_ITEMS);
  for (const it of run.items) {
    assert.ok(it.x >= DIVE_AREA.X0 && it.x <= DIVE_AREA.X1 && it.z >= DIVE_AREA.Z0 && it.z <= DIVE_AREA.Z1);
    assert.ok(it.d >= it.sp.minD, `${it.sp.id} at ${it.d}`);
    assert.ok(DIVE_SPECIES.includes(it.sp));
  }
  assert.equal(run.state, 'surface');
  assert.equal(run.air, 1);
});

test('pressing at the surface dives down until the swimmer floats above the floor', () => {
  const run = fresh();
  assert.equal(pressDive(run, P, 0).kind, 'dive');
  assert.equal(run.state, 'descend');
  run60(run, 4);
  assert.equal(run.state, 'swim');
  assert.ok(Math.abs(run.y - (-diveDepthAt(P.x, P.z) + DIVE_AREA.LIFT)) < .01);
  assert.ok(run.air < 1);
});

test('air runs out after the breath time and the diver floats up on their own, keeping the catch', () => {
  const run = fresh({ breath: 10 });
  pressDive(run, P, 0);
  run60(run, 3);
  const it = run.items[0];
  it.x = P.x + .3; it.z = P.z; it.d = diveDepthAt(it.x, it.z);
  assert.equal(pressDive(run, P, 3000).kind, 'pick');
  const ev = run60(run, 12, P, 3000);
  assert.ok(ev.outOfAir >= 1);
  assert.equal(ev.surfaced, 1);
  assert.equal(run.state, 'surface');
  assert.equal(run.dives, 1);
  assert.equal(run.bag[it.sp.id], 1);
  assert.equal(run.carry.length, 0);
  assert.equal(run.legs.length, 1);
  assert.equal(run.legs[0][0], 1);
  assert.equal(run.legs[0][6], 1);
  assert.equal(run.bad, 1);
});

test('surfacing on purpose keeps air, refills at the surface and counts the dive', () => {
  const run = fresh();
  pressDive(run, P, 0);
  run60(run, 4);
  ascendDive(run);
  assert.equal(run.state, 'ascend');
  const ev = run60(run, 6, P, 4000);
  assert.equal(ev.surfaced, 1);
  assert.equal(ev.outOfAir, 0);
  assert.equal(run.legs[0][6], 0);
  assert.equal(run.bad, 0);
  assert.equal(run.air, 1);
});

test('three dives end the round and further presses do nothing', () => {
  const run = fresh();
  let over = false;
  for (let n = 0; n < DIVE.DIVES; n++) {
    pressDive(run, P, n * 20000);
    run60(run, 4, P, n * 20000);
    ascendDive(run);
    over = run60(run, 6, P, n * 20000 + 4000).over || over;
  }
  assert.equal(run.dives, DIVE.DIVES);
  assert.equal(run.over, true);
  assert.equal(over, true);
  assert.equal(pressDive(run, P, 99999).kind, 'none');
});

test('picking takes the nearest treasure within reach at swimming depth and tops the floor back up', () => {
  const run = fresh();
  pressDive(run, P, 0);
  run60(run, 4);
  run.items = run.items.slice(0, DIVE_AREA.MIN_ITEMS);
  const near = run.items[0];
  near.x = P.x + .5; near.z = P.z; near.d = diveDepthAt(near.x, near.z);
  assert.equal(nearestDiveItem(run, P), near);
  const r = pressDive(run, P, 4200);
  assert.equal(r.kind, 'pick');
  assert.equal(r.item, near);
  assert.ok(!run.items.includes(near));
  assert.equal(run.items.length, DIVE_AREA.MIN_ITEMS);
  assert.equal(run.carry.length, 1);
  assert.equal(run.good, 1);
  assert.deepEqual(run.picks[0], [4200, Math.round(near.d * 10), DIVE_SPECIES.indexOf(near.sp), Math.round(run.air * 100)]);
  assert.equal(pressDive({ ...run, items: [] }, P, 4300).kind, 'none');
});

test('breath length follows the difficulty arm', () => {
  assert.equal(fresh({ breath: 17 }).breath, 17);
  assert.equal(fresh().breath, DIVE.BREATH);
});
