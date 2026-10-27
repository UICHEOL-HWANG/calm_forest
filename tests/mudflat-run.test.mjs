import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MUDFLAT, MUD_SPECIES, tideFront } from '../js/forage/logic.js';
import { MUD_AREA, createMudRun, stepMudRun, digMudRun, nearestHole } from '../js/forage/mudflat-run.js';

const seeded = (seed = 7) => {
  let x = seed >>> 0;
  return () => { x = (x + 0x6D2B79F5) >>> 0; let r = Math.imul(x ^ (x >>> 15), 1 | x); r ^= r + Math.imul(r ^ (r >>> 7), 61 | r); return ((r ^ (r >>> 14)) >>> 0) / 4294967296; };
};
const START = { x: 0, z: 7 };
const fresh = (o = {}) => createMudRun({ rnd: seeded(), win: MUDFLAT.WINDOW, player: START, ...o });

test('a run starts with holes spread inside the dry mudflat, away from the player', () => {
  const run = fresh();
  assert.equal(run.holes.length, MUD_AREA.START_HOLES);
  for (const h of run.holes) {
    assert.ok(h.x >= MUD_AREA.X0 && h.x <= MUD_AREA.X1, `x ${h.x}`);
    assert.ok(h.z > tideFront(0) && h.z <= MUD_AREA.Z1, `z ${h.z}`);
    assert.ok(Math.hypot(h.x - START.x, h.z - START.z) >= 1.2);
    assert.ok(MUD_SPECIES.includes(h.sp));
  }
  for (const a of run.holes) for (const b of run.holes) if (a !== b) assert.ok(Math.hypot(a.x - b.x, a.z - b.z) >= 1.6);
  assert.equal(run.over, false);
});

test('the tide swallows holes it reaches and counts them as lost to the tide', () => {
  const run = fresh();
  const before = run.holes.length;
  let gone = 0;
  for (let i = 0; i < 50 * 60; i++) gone += stepMudRun(run, 1 / 60, START).gone.filter(g => g.why === 'tide').length;
  assert.ok(run.lostTide > 0);
  assert.equal(run.lostTide, gone);
  assert.ok(run.holes.every(h => h.z >= tideFront(run.t) + .2));
  assert.ok(before > 0);
});

test('the round ends exactly when the tide is in', () => {
  const run = fresh();
  let over = false;
  for (let i = 0; i < 60 * 60 - 1; i++) over = stepMudRun(run, 1 / 60, START).over;
  assert.equal(over, false);
  over = stepMudRun(run, 1 / 60 + 1e-9, START).over;
  assert.equal(over, true);
  assert.equal(run.over, true);
});

test('digging at the start of a breath catches the clam and fills the bag', () => {
  const run = fresh();
  const h = run.holes[0];
  h.phase = 3.1;
  const r = digMudRun(run, { x: h.x + .5, z: h.z }, 1234);
  assert.equal(r.kind, 'hit');
  assert.equal(r.hole.id, h.id);
  assert.equal(run.good, 1);
  assert.equal(run.bag[h.sp.id], 1);
  assert.ok(!run.holes.includes(h));
  assert.deepEqual(run.acts[0], [1234, 10, 1, h.sp.depth, MUD_SPECIES.indexOf(h.sp)]);
});

test('digging off the breath misses, the clam hides, and a second miss loses the hole', () => {
  const run = fresh();
  const h = run.holes[0];
  h.phase = .6;
  const r1 = digMudRun(run, { x: h.x, z: h.z + .3 }, 100);
  assert.equal(r1.kind, 'miss');
  assert.equal(r1.gone, false);
  assert.equal(run.bad, 1);
  assert.ok(run.holes.includes(h));
  assert.equal(h.phase % 1 >= .3, true);
  h.phase = .9;
  const r2 = digMudRun(run, { x: h.x, z: h.z + .3 }, 200);
  assert.equal(r2.kind, 'miss');
  assert.equal(r2.gone, true);
  assert.equal(run.lostMiss, 1);
  assert.ok(!run.holes.includes(h));
  assert.equal(run.acts.length, 2);
  assert.equal(run.acts[1][2], 0);
});

test('a wider window from an easier arm turns a near miss into a hit', () => {
  const easy = fresh({ win: .375 });
  const h = easy.holes[0];
  h.phase = .34;
  assert.equal(digMudRun(easy, { x: h.x, z: h.z }, 0).kind, 'hit');
  const hard = fresh({ win: .24 });
  hard.holes[0].phase = .26;
  assert.equal(digMudRun(hard, { x: hard.holes[0].x, z: hard.holes[0].z }, 0).kind, 'miss');
});

test('nothing in reach does nothing, and the bag stays untouched after the round', () => {
  const run = fresh();
  assert.equal(nearestHole(run, { x: 999, z: 999 }), null);
  assert.deepEqual(digMudRun(run, { x: 999, z: 999 }, 0), { kind: 'none' });
  run.over = true;
  const h = run.holes[0];
  h.phase = 0;
  assert.deepEqual(digMudRun(run, { x: h.x, z: h.z }, 0), { kind: 'none' });
  assert.equal(run.good, 0);
});

test('new holes keep appearing on dry mud while the tide is out', () => {
  const run = fresh();
  for (const h of [...run.holes]) { h.phase = 0; digMudRun(run, { x: h.x, z: h.z }, 0); }
  assert.equal(run.holes.length, 0);
  let spawned = 0;
  for (let i = 0; i < 10 * 60; i++) spawned += stepMudRun(run, 1 / 60, START).spawned.length;
  assert.ok(spawned >= 6, `spawned ${spawned}`);
  assert.ok(run.holes.every(h => h.z > tideFront(run.t)));
});

test('the hoe reach and spare miss carry into the run', () => {
  const run = createMudRun({ rnd: () => .5, win: .3, reach: 1.8, missLimit: 3 });
  run.holes = [{ id: 1, x: 1.6, z: 0, sp: MUD_SPECIES[0], period: 2, phase: .6, miss: 0 }];
  assert.equal(nearestHole(run, { x: 0, z: 0 })?.id, 1);
  assert.equal(nearestHole({ ...run, reach: undefined }, { x: 0, z: 0 }), null);
  const p = { x: 0, z: 0 };
  assert.equal(digMudRun(run, p, 0).gone, false);
  run.holes[0].phase = .6;
  assert.equal(digMudRun(run, p, 0).gone, false);
  run.holes[0].phase = .6;
  assert.equal(digMudRun(run, p, 0).gone, true);
});
