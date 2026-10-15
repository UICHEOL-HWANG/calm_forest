import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CLIMB_PATH, CLIMB_START, ACORNS, PLAZA, nearestOnPath, collectAcorns, atSummit, clampLocal } from '../js/mountain/climb.js';

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

const moved = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

test('clampLocal treats the plaza rim as a wall, not a teleport', () => {
  const rim = [{ x: -5.05, z: 28 }, { x: 4, z: 37.05 }];
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    rim.push({ x: PLAZA.x + Math.cos(a) * (PLAZA.r + 0.1), z: PLAZA.z + Math.sin(a) * (PLAZA.r + 0.1) });
  }
  for (const p of rim) assert.ok(moved(p, clampLocal(p, PLAZA)) < 0.2, JSON.stringify(p));
});

test('clampLocal leaves the plaza and the path band alone', () => {
  const inPlaza = { x: 3, z: 30 };
  const r1 = clampLocal(inPlaza, PLAZA);
  assert.deepEqual({ x: r1.x, z: r1.z, onPath: r1.onPath }, { x: 3, z: 30, onPath: false });
  const onPath = { x: 24.5, z: -18 };
  const r2 = clampLocal(onPath, PLAZA);
  assert.equal(r2.x, 24.5);
  assert.equal(r2.z, -18);
  assert.equal(r2.onPath, true);
});

test('clampLocal snaps far off-band points back to within 1.5 of the path', () => {
  for (const p of [{ x: 40, z: -40 }, { x: -30, z: 0 }, { x: 0, z: -60 }]) {
    const r = clampLocal(p, PLAZA);
    assert.equal(r.onPath, true);
    assert.ok(nearestOnPath(r).dist <= 1.5 + 1e-9, JSON.stringify(p));
    assert.ok(r.k >= 0 && r.k <= 1);
  }
});
