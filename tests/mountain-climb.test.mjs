import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CLIMB_PATH, CLIMB_START, ACORNS, nearestOnPath, collectAcorns, atSummit } from '../js/mountain/climb.js';

test('six acorns, some off the path but reachable', () => {
  assert.equal(ACORNS.length, 6);
  assert.ok(ACORNS.some(a => a.offPath));
  for (const a of ACORNS) assert.ok(nearestOnPath(a).dist <= (a.offPath ? 3.2 : 0.8));
});

test('collectAcorns is immutable and picks only within radius', () => {
  const taken = Array(6).fill(false);
  const next = collectAcorns(ACORNS[0], taken);
  assert.notEqual(next, taken);
  assert.deepEqual(taken, Array(6).fill(false));
  assert.equal(next[0], true);
  assert.equal(next.filter(Boolean).length, 1);
});

test('summit is the last path point and the start is not', () => {
  assert.equal(atSummit(CLIMB_PATH.at(-1)), true);
  assert.equal(atSummit(CLIMB_START), false);
  assert.deepEqual(CLIMB_START, CLIMB_PATH[0]);
});
