import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GHOST_V, GHOST_STEP_MS, recordGhost, ghostAt, ghostGapMs, validGhost, sledEvents, chipsFor } from '../js/mountain/sled-extras.js';
import { COURSE_V } from '../js/mountain/course.js';
import { PHYS_V, createSled } from '../js/mountain/sled.js';

const S = (extra = {}) => ({ ...createSled(0), ...extra });

test('ghost version follows course and physics versions', () => {
  assert.equal(GHOST_V, `c${COURSE_V}p${PHYS_V}`);
  assert.equal(GHOST_STEP_MS, 100);
});

test('recording keeps one point per step and never mutates', () => {
  const a = recordGhost([], S({ t: 0, z: 0, x: 1.234, y: 0 }));
  assert.deepEqual(a, [[0, 123, 0]]);
  const same = recordGhost(a, S({ t: 50, z: 0.5, x: 1, y: 0 }));
  assert.equal(same, a);
  const b = recordGhost(a, S({ t: 100, z: 1.26, x: 1, y: 0.5 }));
  assert.deepEqual(b, [[0, 123, 0], [13, 100, 50]]);
  assert.equal(a.length, 1);
});

test('ghost replays interpolated positions and ends after its run', () => {
  const g = { v: GHOST_V, t: 200, pts: [[0, 0, 0], [100, 200, 0], [200, 400, 100]] };
  const p = ghostAt(g, 50);
  assert.ok(Math.abs(p.z - 5) < 1e-9 && Math.abs(p.x - 1) < 1e-9);
  assert.equal(ghostAt(g, 500), null);
  assert.equal(ghostAt(null, 50), null);
});

test('gap is how far behind (positive) or ahead (negative) of the ghost you are', () => {
  const g = { v: GHOST_V, t: 200, pts: [[0, 0, 0], [100, 0, 0], [200, 0, 0]] };
  assert.equal(ghostGapMs(g, S({ z: 10, t: 150 })), 50);
  assert.equal(ghostGapMs(g, S({ z: 10, t: 80 })), -20);
  assert.equal(ghostGapMs(g, S({ z: 50, t: 80 })), null);
  assert.equal(ghostGapMs(null, S({ z: 10, t: 80 })), null);
});

test('only well-formed ghosts of the current version survive a save', () => {
  const ok = { v: GHOST_V, t: 24000, pts: Array.from({ length: 240 }, (_, i) => [i * 13, 100, 0]) };
  assert.equal(validGhost(ok), true);
  assert.equal(validGhost({ ...ok, v: 'c1p3' }), false);
  assert.equal(validGhost({ ...ok, pts: [[1, 2]] }), false);
  assert.equal(validGhost({ ...ok, pts: Array.from({ length: 2000 }, () => [0, 0, 0]) }), false);
  assert.equal(validGhost({ ...ok, t: 1.5 }), false);
  assert.equal(validGhost({ ...ok, pts: [[0, 999999, 0]] }), false);
  assert.equal(validGhost({ ...ok, pts: [[-5, 0, 0]] }), false);
  assert.equal(validGhost({ ...ok, t: 999999 }), false);
  assert.equal(validGhost(null), false);
  assert.ok(JSON.stringify(ok).length < 6000);
});

test('events are read from the state change between frames', () => {
  const a = S();
  const b = { ...a, jumps: 1, tricksOk: 1, driftsAt: [[1, 2]], gustsAt: [5], shieldUsed: 1, moverHitIds: [0], combo: 2, splits: [[true, 1]] };
  assert.deepEqual(sledEvents(a, b).sort(), ['combo', 'drift', 'gust', 'jump', 'mover', 'shield', 'trickOk'].sort());
  assert.deepEqual(sledEvents(a, { ...a, tricksFail: 1 }), ['trickFail']);
  assert.deepEqual(sledEvents(a, a), []);
});

test('chips describe ghost gap, drift, combo, air and pet shield', () => {
  const t = s => s;
  assert.deepEqual(chipsFor(S(), null, t), []);
  assert.deepEqual(chipsFor(S(), -1234, t), [['👻 −1.2초', 'ahead']]);
  assert.deepEqual(chipsFor(S(), 800, t), [['👻 +0.8초', 'behind']]);
  assert.deepEqual(chipsFor(S({ driftDir: 1, driftMs: 700 }), null, t), [['🔵 드리프트', 'blue']]);
  assert.deepEqual(chipsFor(S({ driftDir: -1, driftMs: 1500 }), null, t), [['🟠 드리프트', 'orange']]);
  assert.deepEqual(chipsFor(S({ combo: 2 }), null, t), [['🚩 연속 2/3', '']]);
  assert.deepEqual(chipsFor(S({ air: true }), null, t), [['🛫 지금 누르면 회전', '']]);
  assert.deepEqual(chipsFor(S({ air: true, trick: true, spin: 0.5 }), null, t), [['🌀 도는 중', '']]);
  assert.deepEqual(chipsFor(S({ air: true, trick: true, spin: 1.1 }), null, t), [['🌀 한 바퀴!', '']]);
  assert.deepEqual(chipsFor(S({ shield: 1 }), null, t), [['🛡️ 펫 방패', '']]);
  assert.deepEqual(chipsFor(S({ shield: 1, shieldUsed: 1 }), null, t), []);
});

test('a valid ghost survives restore, a stale one is dropped', async () => {
  const { restoreMountain } = await import('../js/mountain/save.js');
  const ghost = { v: GHOST_V, t: 24000, pts: Array.from({ length: 240 }, (_, i) => [i * 13, 100, 0]) };
  assert.deepEqual(restoreMountain({ sled: { best: 24000, ghost } }).sled.ghost, ghost);
  assert.equal('ghost' in restoreMountain({ sled: { best: 24000, ghost: { ...ghost, v: 'c1p3' } } }).sled, false);
});
