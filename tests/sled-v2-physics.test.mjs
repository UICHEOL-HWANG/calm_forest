import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PHYS, PHYS_V, createSled, stepSled, pressSled } from '../js/mountain/sled.js';
import { DRIFT, JUMP, COMBO, KICK_MULT, SHIELD_PER_RUN } from '../js/mountain/sled-moves.js';
import { physOf } from '../js/mountain/sled-lineup.js';
import { COURSE, COURSE_V, centerX, moverPos } from '../js/mountain/course.js';

const at = (z, extra = {}) => ({ ...createSled(3), z, x: centerX(z), speed: PHYS.baseSpeed, ...extra });
const run = (s, steer, ms, course = COURSE) => Array.from({ length: Math.round(ms / 16) }).reduce(a => stepSled(a, 16, steer, course), s);
const empty = { ...COURSE, flags: [], obstacles: [], ramps: [], movers: [] };

test('versions and speed move to v4 / course v2 at 1.5x', () => {
  assert.equal(PHYS_V, 4);
  assert.equal(COURSE_V, 2);
  assert.equal(PHYS.baseSpeed, 12.9);
  assert.equal(PHYS.steerRate, 9.75);
  assert.equal(PHYS.accel, 13.5);
  assert.equal(PHYS.boostMs, 1333);
  assert.ok(PHYS.baseSpeed * PHYS.boostMult <= 24);
  assert.ok(PHYS.maxSpeed * PHYS.boostMult <= 24);
});

test('a fresh sled is on the ground with no drift, combo or tricks', () => {
  const s = createSled(2);
  assert.equal(s.y, 0);
  assert.equal(s.air, false);
  assert.equal(s.driftMs, 0);
  assert.equal(s.combo, 0);
  assert.equal(s.shield, 0);
  assert.deepEqual(s.driftsAt, []);
  assert.equal(createSled(2, PHYS, { shield: 1 }).shield, 1);
});

test('holding a full turn charges a drift that fires on release', () => {
  const held = run(at(20, { x: centerX(20) - 6 }), 1, DRIFT.t1 + 100, empty);
  assert.ok(held.driftMs >= DRIFT.t1);
  const fired = stepSled(held, 16, 0, empty);
  assert.equal(fired.driftsAt.length, 1);
  assert.ok(fired.kickLeftMs >= DRIFT.ms1 - 16);
  assert.equal(fired.boostLeftMs, 0);
  assert.equal(fired.driftMs, 0);
});

test('a longer drift fires the stronger boost, flipping direction also fires', () => {
  const held = { ...at(20), driftDir: -1, driftMs: DRIFT.t2 + 50, vx: -PHYS.steerRate };
  const fired = stepSled(held, 16, 1, empty);
  assert.equal(fired.driftsAt.length, 1);
  assert.ok(fired.kickLeftMs >= DRIFT.ms2 - 16);
});

test('short or gentle turns never fire a drift', () => {
  const short = stepSled(run(at(20), 1, DRIFT.t1 - 200, empty), 16, 0, empty);
  assert.equal(short.driftsAt.length, 0);
  const gentle = stepSled(run(at(20), 0.5, DRIFT.t2 + 200, empty), 16, 0, empty);
  assert.equal(gentle.driftsAt.length, 0);
});

test('crossing a ramp inside its width launches the sled', () => {
  const ramp = { z: 40, x: centerX(40), half: 2.6 };
  const course = { ...empty, ramps: [ramp] };
  const s = run(at(36), 0, 600, course);
  assert.equal(s.jumps, 1);
  const missed = run(at(36, { x: centerX(36) + 5 }), 0, 600, course);
  assert.equal(missed.jumps, 0);
});

test('in the air the sled flies, ignores obstacles, then lands', () => {
  const s0 = at(40, { air: true, vy: JUMP.vy, y: 0.01 });
  const obs = { z: 44, x: centerX(44), r: 1.1, kind: 'rock' };
  const course = { ...empty, obstacles: [obs] };
  const mid = run(s0, 0, 200, course);
  assert.equal(mid.air, true);
  assert.ok(mid.y > 0.5);
  assert.equal(mid.hits.length, 0);
  const landed = run(s0, 0, 1200, course);
  assert.equal(landed.air, false);
  assert.equal(landed.y, 0);
});

test('steering is weaker in the air', () => {
  const ground = run(at(40), 1, 160, empty);
  const air = run(at(40, { air: true, vy: JUMP.vy, y: 0.01 }), 1, 160, empty);
  assert.ok(Math.abs(air.vx) < Math.abs(ground.vx) * 0.6);
});

test('pressing in the air starts a trick, a full spin on landing boosts', () => {
  const up = pressSled(at(40, { air: true, vy: JUMP.vy, y: 0.01 }));
  assert.equal(up.trick, true);
  assert.equal(up.acorns, 3);
  const landed = run(up, 0, 1200, empty);
  assert.equal(landed.tricksOk, 1);
  assert.ok(landed.kickLeftMs > 0);
});

test('a press too late to finish a spin is ignored, not punished', () => {
  const s = at(40, { air: true, vy: -2, y: 0.3 });
  const late = pressSled(s);
  assert.equal(late.trick, false);
  assert.equal(late.acorns, s.acorns);
  const landed = run(late, 0, 400, empty);
  assert.equal(landed.tricksFail, 0);
  assert.equal(landed.slowLeftMs, 0);
});

test('a trick that cannot quite finish still wobbles on landing', () => {
  const landed = run({ ...at(40, { air: true, vy: 0.5, y: 0.3 }), trick: true, spin: 0 }, 0, 600, empty);
  assert.equal(landed.tricksFail, 1);
  assert.ok(landed.slowLeftMs > 0);
});

test('pinning against the course edge does not charge a drift', () => {
  const edge = { ...at(40), x: centerX(40) + COURSE.width / 2, vx: 0 };
  const held = run(edge, 1, DRIFT.t2 + 200, empty);
  assert.equal(held.driftMs, 0);
  assert.equal(stepSled(held, 16, 0, empty).driftsAt.length, 0);
});

test('a charged drift fires when the sled leaves the ground', () => {
  const charged = { ...at(20), driftDir: 1, driftMs: DRIFT.t1 + 100, vx: PHYS.steerRate };
  const launched = stepSled({ ...charged, air: true, vy: JUMP.vy, y: 0.01 }, 16, 1, empty);
  assert.equal(launched.driftsAt.length, 1);
  assert.ok(launched.kickLeftMs > 0);
});

test('pressing on the ground still spends an acorn boost', () => {
  const s = pressSled(at(40));
  assert.equal(s.acorns, 2);
  assert.equal(s.trick, false);
});

test('three clean gates in a row blow a gust, a miss resets the count', () => {
  const lane = centerX(25);
  const flags = [30, 40, 50].map(z => ({ z, x: lane, half: 2.2 }));
  const s = run(at(25), 0, 3000, { ...empty, flags });
  assert.equal(s.gustsAt.length, 1);
  assert.equal(s.combo, 0);
  const bad = [30, 40, 50].map((z, i) => ({ z, x: lane + (i === 1 ? 6 : 0), half: 2.2 }));
  const r = run(at(25), 0, 3000, { ...empty, flags: bad });
  assert.equal(r.gustsAt.length, 0);
  assert.ok(COMBO.n === 3 && COMBO.ms > 0);
});

test('the pet shield takes the first hit only', () => {
  const obstacles = [44, 70].map(z => ({ z, x: centerX(z), r: 1.1, kind: 'rock' }));
  const course = { ...empty, obstacles };
  const s = run({ ...at(38), shield: 1 }, 0, 1200, course);
  assert.equal(s.shieldUsed, 1);
  assert.equal(s.hits.length, 1);
  assert.equal(s.slowLeftMs, 0);
  const t = run(s, 0, 2500, course);
  assert.equal(t.hits.length, 2);
  assert.ok(t.slowLeftMs > 0 || t.speed < PHYS.baseSpeed);
});

test('moving obstacles follow time and hit once', () => {
  const ball = { kind: 'ball', z0: 60, v: 4, off: 0, r: 0.85 };
  assert.deepEqual(moverPos(ball, 0), moverPos(ball, 0));
  assert.ok(moverPos(ball, 2000).z > moverPos(ball, 0).z);
  const walker = { kind: 'walker', z: 60, amp: 5, w: 1, ph: 0, r: 0.6 };
  assert.notEqual(moverPos(walker, 0).x, moverPos(walker, 800).x);
  const course = { ...empty, movers: [{ kind: 'walker', z: 50, amp: 0, w: 1, ph: 0, r: 0.6 }] };
  const s = run(at(45), 0, 1500, course);
  assert.equal(s.hits.filter(h => h[1] === 'mover').length, 1);
  assert.ok(s.moverHitIds.includes(0));
});

test('stepSled stays pure', () => {
  const s = at(20);
  const frozen = JSON.stringify(s);
  stepSled(s, 16, 1, COURSE);
  pressSled(s);
  assert.equal(JSON.stringify(s), frozen);
});

test('the real course has ramps clear of gates and four movers', () => {
  assert.ok(COURSE.ramps.length >= 3);
  COURSE.ramps.forEach(r => COURSE.flags.forEach(f => assert.ok(Math.abs(r.z - f.z) >= 4, `ramp ${r.z} vs flag ${f.z}`)));
  assert.equal(COURSE.movers.length, 4);
});

test('two shields block exactly two hits', () => {
  const obstacles = [44, 70].map(z => ({ z, x: centerX(z), r: 1.1, kind: 'rock' }));
  const s = run({ ...at(38), shield: 2 }, 0, 3700, { ...empty, obstacles });
  assert.equal(s.hits.length, 2);
  assert.equal(s.shieldUsed, 2);
});

test('drift, trick and gust kicks are the same strength on every sled', () => {
  const kicked = id => {
    const s = { ...createSled(0, physOf(id)), z: 40, x: centerX(40), speed: physOf(id).baseSpeed, kickLeftMs: 3000 };
    return run(s, 0, 2000, empty).speed / physOf(id).baseSpeed;
  };
  const base = kicked('basic');
  for (const id of ['wind', 'acorn', 'skiff', 'toboggan']) assert.ok(Math.abs(kicked(id) - base) < 0.01, id);
  assert.ok(Math.abs(base - KICK_MULT) < 0.01);
});

test('every rider gets one shield per run, pet or not', () => {
  assert.equal(SHIELD_PER_RUN, 1);
});
