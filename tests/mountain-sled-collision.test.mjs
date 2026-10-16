import { test } from 'node:test';
import assert from 'node:assert/strict';
import { COURSE, OBSTACLE_BODY, obstacleRadius } from '../js/mountain/course.js';
import { SLOPE_M_PER_UNIT, slopePoint } from '../js/mountain/terrain.js';
import { PHYS, SLED_HALF, createSled, stepSled, overlapsObstacle, hitReach } from '../js/mountain/sled.js';
import { DIFFICULTY } from '../js/tuning.js';
import { perfectLine } from '../tools/sim/sled-sim.mjs';

const scaled = k => ({ ...COURSE, obstacles: COURSE.obstacles.map(o => ({ ...o, r: o.r * k })) });
const rock = COURSE.obstacles.find(o => o.kind === 'rock');
const at = (o, dxM, dzM) => ({ ...createSled(0), x: o.x + dxM, z: o.z + dzM / SLOPE_M_PER_UNIT });

test('course units convert to local metres through the slope run', () => {
  const top = slopePoint(0, 0), foot = slopePoint(COURSE.length, 0);
  assert.ok(Math.abs(SLOPE_M_PER_UNIT - (foot.z - top.z) / COURSE.length) < 1e-12);
  assert.ok(SLOPE_M_PER_UNIT < 0.3 && SLOPE_M_PER_UNIT > 0.15);
});

test('the obstacle hit radius is the visual body radius', () => {
  assert.equal(obstacleRadius(rock), rock.r * OBSTACLE_BODY.rock);
  const ball = COURSE.obstacles.find(o => o.kind === 'snowball');
  assert.equal(obstacleRadius(ball), ball.r * OBSTACLE_BODY.snowball);
});

test('a sled whose nose touches the rock along the slope is a hit, a clear gap is not', () => {
  const reach = obstacleRadius(rock) + SLED_HALF.l;
  assert.ok(overlapsObstacle(at(rock, 0, -(reach - 0.05)), rock));
  assert.ok(!overlapsObstacle(at(rock, 0, -(reach + 0.05)), rock));
  assert.ok(overlapsObstacle(at(rock, 0, reach - 0.05), rock));
  assert.ok((reach - 0.05) / SLOPE_M_PER_UNIT > rock.r * 2, 'old course-unit window would have missed this');
});

test('a sled whose side touches the rock is a hit, a clear lateral gap is not', () => {
  const reach = obstacleRadius(rock) + SLED_HALF.w;
  assert.ok(overlapsObstacle(at(rock, reach - 0.05, 0), rock));
  assert.ok(!overlapsObstacle(at(rock, reach + 0.05, 0), rock));
  assert.ok(!overlapsObstacle(at(rock, -(reach + 0.05), 0), rock));
});

test('the sled corner only hits inside the round body', () => {
  const r = obstacleRadius(rock);
  const d = r / Math.SQRT2;
  assert.ok(overlapsObstacle(at(rock, SLED_HALF.w + d * 0.95, -(SLED_HALF.l + d * 0.95)), rock));
  assert.ok(!overlapsObstacle(at(rock, SLED_HALF.w + d * 1.05, -(SLED_HALF.l + d * 1.05)), rock));
});

test('difficulty scaling of r widens the hit body in both axes', () => {
  const big = scaled(1.15).obstacles.find(o => o.kind === 'rock');
  const gapZ = -(obstacleRadius(rock) + SLED_HALF.l + 0.08);
  const gapX = obstacleRadius(rock) + SLED_HALF.w + 0.08;
  assert.ok(!overlapsObstacle(at(rock, 0, gapZ), rock));
  assert.ok(overlapsObstacle(at(rock, 0, gapZ), big));
  assert.ok(!overlapsObstacle(at(rock, gapX, 0), rock));
  assert.ok(overlapsObstacle(at(rock, gapX, 0), big));
});

test('hitReach gives the course-unit window of the overlap test', () => {
  const r = hitReach(rock);
  assert.ok(Math.abs(r.x - (obstacleRadius(rock) + SLED_HALF.w)) < 1e-12);
  assert.ok(Math.abs(r.z * SLOPE_M_PER_UNIT - (obstacleRadius(rock) + SLED_HALF.l)) < 1e-12);
});

test('stepSled registers the hit through a straight pass at top speed and clamped 50 ms steps', () => {
  for (const o of COURSE.obstacles) {
    for (let phase = 0; phase < 10; phase++) {
      let s = { ...createSled(0), x: o.x, z: o.z - 20 + phase * 0.13, speed: PHYS.maxSpeed * PHYS.boostMult, boostLeftMs: 1e9 };
      while (s.z < o.z + 10) s = stepSled({ ...s, x: o.x }, 50, 0);
      assert.ok(s.hitIds.includes(COURSE.obstacles.indexOf(o)), `z=${o.z} phase=${phase}`);
    }
  }
});

test('a perfect line passes all 12 flags with 0 hits at every sled arm, with and without boosts', () => {
  for (const ease of DIFFICULTY.sled.arms) {
    for (const acorns of [0, 3, 6]) {
      const line = perfectLine(scaled(2 - ease), acorns);
      assert.ok(line, `ease=${ease} acorns=${acorns}`);
      assert.equal(line.sled.flagsPassed, 12);
      assert.equal(line.sled.hits.length, 0);
      assert.equal(line.sled.boostsAt.length, acorns);
    }
  }
});
