import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rideSchedule, phaseAt } from '../js/mirror/ride-schedule.js';

for (const first of [true, false]) test(`단계가 빈틈없이 이어진다 (first=${first})`, () => {
  const s = rideSchedule(first);
  const order = ['walk', 'board', 'rise', 'pass', 'descend', 'alight'];
  assert.equal(s.walk[0], 0);
  for (let i = 1; i < order.length; i++) assert.equal(s[order[i]][0], s[order[i - 1]][1], order[i]);
  assert.equal(s.total, s.alight[1]);
  assert.ok(s.flash > s.pass[0] && s.flash < s.pass[1], '번쩍(공간 전환)은 거울 문을 지나는 중간');
  assert.ok(s.gate[0] >= s.rise[0] && s.gate[1] <= s.pass[0], '거울 문은 이륙하는 동안 일어선다');
});

test('길이 — 첫 회 ≈7.5s, 이후 ≈3.3s (스펙 §2, 2026-10-09 "출발이 너무 빠르다"로 늘림)', () => {
  assert.ok(Math.abs(rideSchedule(true).total - 7.5) < 0.05);
  assert.ok(Math.abs(rideSchedule(false).total - 3.3) < 0.05);
});

test('phaseAt', () => {
  const s = rideSchedule(true), mid = s.rise[0] + (s.rise[1] - s.rise[0]) / 2;
  assert.deepEqual(phaseAt(s, 0), { name: 'walk', p: 0 });
  assert.equal(phaseAt(s, mid).name, 'rise');
  assert.ok(Math.abs(phaseAt(s, mid).p - 0.5) < 1e-9);
  assert.deepEqual(phaseAt(s, 99), { name: 'done', p: 1 });
});
