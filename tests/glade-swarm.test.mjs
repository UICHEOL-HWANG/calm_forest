import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FIRST_DELAY, KIDS, LIFE_SEC, NEXT_DELAY, createSwarm, delay, expired, kidBright, kidsLeft, nextKid, swingKid, swingLeader } from '../js/glade/swarm.js';

const sure = { bright: 1, chanceLit: 1, chanceDim: 1, rnd: () => 0 };
const never = { bright: 1, chanceLit: 0, chanceDim: 0, rnd: () => 0.5 };

test('a new swarm has four kids and the tail goes first', () => {
  const sw = createSwarm('yellow', 10);
  assert.equal(kidsLeft(sw), KIDS);
  assert.equal(nextKid(sw), 3);
  assert.equal(sw.combo, 0);
  assert.ok(Object.isFrozen(sw));
});

test('catching kids from the tail builds the combo and a perfect finish', () => {
  let sw = createSwarm('yellow', 0);
  for (const i of [3, 2, 1, 0]) {
    const r = swingKid(sw, i, sure);
    assert.ok(r.hit && r.inTurn);
    sw = r.sw;
  }
  assert.equal(sw.combo, 4);
  assert.equal(kidsLeft(sw), 0);
  assert.equal(nextKid(sw), -1);
  const end = swingLeader(sw, sure);
  assert.ok(end.hit && end.perfect);
  assert.ok(end.sw.done);
  assert.equal(end.sw.caught, 5);
});

test('a kid out of turn is still caught but resets the combo and spoils the perfect', () => {
  let sw = swingKid(createSwarm('yellow', 0), 3, sure).sw;
  const r = swingKid(sw, 0, sure);
  assert.ok(r.hit);
  assert.equal(r.inTurn, false);
  assert.equal(r.sw.combo, 0);
  sw = r.sw;
  for (const i of [2, 1]) sw = swingKid(sw, i, sure).sw;
  assert.equal(sw.combo, 2);
  const end = swingLeader(sw, sure);
  assert.ok(end.hit);
  assert.equal(end.perfect, false);
});

test('a miss keeps the swarm and the combo', () => {
  const sw = swingKid(createSwarm('yellow', 0), 3, sure).sw;
  const r = swingKid(sw, 2, never);
  assert.equal(r.hit, false);
  assert.equal(r.reason, 'miss');
  assert.equal(r.sw, sw);
});

test('a kid already caught cannot be caught again', () => {
  const sw = swingKid(createSwarm('yellow', 0), 3, sure).sw;
  assert.equal(swingKid(sw, 3, sure).reason, 'gone');
});

test('the leader is guarded while any kid is left', () => {
  const sw = createSwarm('yellow', 0);
  const r = swingLeader(sw, sure);
  assert.equal(r.hit, false);
  assert.equal(r.reason, 'guarded');
  assert.equal(r.sw, sw);
});

test('dim swings use the dim chance, lit swings use the lit chance', () => {
  const sw = createSwarm('yellow', 0);
  assert.equal(swingKid(sw, 3, { bright: 0.2, chanceLit: 1, chanceDim: 0, rnd: () => 0.5 }).hit, false);
  assert.equal(swingKid(sw, 3, { bright: 0.9, chanceLit: 1, chanceDim: 0, rnd: () => 0.5 }).hit, true);
});

test('a swarm expires after its life and delays stay in range', () => {
  const sw = createSwarm('yellow', 100);
  assert.equal(expired(sw, 100 + LIFE_SEC - 0.1), false);
  assert.equal(expired(sw, 100 + LIFE_SEC), true);
  assert.equal(delay(FIRST_DELAY, () => 0), 40);
  assert.equal(delay(FIRST_DELAY, () => 1), 70);
  assert.equal(delay(NEXT_DELAY, () => 0.5), 120);
});

test('kid brightness is between 0 and 1 and the tail peaks before the head', () => {
  let tail = -1, head = -1;
  for (let t = 0; t < 3; t += 0.01) {
    for (let i = 0; i < KIDS; i++) { const b = kidBright(i, t); assert.ok(b >= 0 && b <= 1); }
    if (tail < 0 && kidBright(3, t) > 0.95) tail = t;
    if (tail >= 0 && head < 0 && t > tail && kidBright(2, t) > 0.95) head = t;
  }
  assert.ok(tail >= 0 && head > tail);
});
