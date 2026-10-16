import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from '../vendor/three/three.module.js';
import { buildMountainSpace, poseObstacles, obstacleScales, INTERIOR_DRAW_BUDGET } from '../js/mountain/interior-art.js';
import { COURSE, obstacleRadius } from '../js/mountain/course.js';
import { slopePoint } from '../js/mountain/terrain.js';
import { SLED_SHAKE, decayShake, shakeOffset } from '../js/mountain/sled-view.js';

const src = readFileSync(new URL('../js/spaces/mountain.js', import.meta.url), 'utf8');
const fx = readFileSync(new URL('../js/mountain/sled-fx.js', import.meta.url), 'utf8');
const between = (s, a, b) => s.slice(s.indexOf(a), s.indexOf(b, s.indexOf(a) + a.length));
const space = buildMountainSpace(THREE);
const geo = space.userData.obstacles.geometry;
const pos = () => geo.getAttribute('position').array;
const scaled = k => ({ ...COURSE, obstacles: COURSE.obstacles.map(o => ({ ...o, r: o.r * k })) });

function horizontalReach(i) {
  const [start, count] = geo.userData.ranges[i];
  const [ax, , az] = geo.userData.anchors[i];
  let m = 0;
  for (let v = start; v < start + count; v++) m = Math.max(m, Math.hypot(pos()[v * 3] - ax, pos()[v * 3 + 2] - az));
  return m;
}

test('every obstacle owns a vertex range anchored on its course spot', () => {
  const { ranges, anchors, base } = geo.userData;
  assert.equal(ranges.length, COURSE.obstacles.length);
  assert.equal(base.length, pos().length);
  let next = 0;
  ranges.forEach(([start, count], i) => {
    assert.equal(start, next);
    assert.ok(count > 0);
    next = start + count;
    const p = slopePoint(COURSE.obstacles[i].z, COURSE.obstacles[i].x);
    assert.deepEqual(anchors[i], [p.x, p.y, p.z]);
  });
  assert.equal(next, geo.getAttribute('position').count);
});

test('obstacleScales follows the run course radius and hides hit ids', () => {
  assert.deepEqual(obstacleScales(COURSE), COURSE.obstacles.map(() => 1));
  const s = obstacleScales(scaled(1.15), [2, 5]);
  s.forEach((k, i) => assert.ok(Math.abs(k - ([2, 5].includes(i) ? 0 : 1.15)) < 1e-12, `${i}`));
});

test('a hit obstacle collapses to its anchor while the others keep their shape', () => {
  poseObstacles(geo, obstacleScales(COURSE, [3]));
  const [start, count] = geo.userData.ranges[3];
  for (let v = start; v < start + count; v++) {
    for (let c = 0; c < 3; c++) assert.ok(Math.abs(pos()[v * 3 + c] - geo.userData.anchors[3][c]) < 1e-4);
  }
  const [s0, c0] = geo.userData.ranges[0];
  for (let v = s0 * 3; v < (s0 + c0) * 3; v++) assert.ok(Math.abs(pos()[v] - geo.userData.base[v]) < 1e-4);
  assert.ok(geo.getAttribute('position').version > 0);
});

test('a new run restores every obstacle to its base shape', () => {
  poseObstacles(geo, obstacleScales(COURSE, [0, 1, 2]));
  poseObstacles(geo, obstacleScales(COURSE));
  pos().forEach((v, i) => assert.ok(Math.abs(v - geo.userData.base[i]) < 1e-4, `${i}`));
});

test('the drawn body radius tracks the collision radius at every difficulty scale', () => {
  for (const k of [0.85, 1, 1.15]) {
    const course = scaled(k);
    poseObstacles(geo, obstacleScales(course));
    course.obstacles.forEach((o, i) => {
      assert.ok(Math.abs(horizontalReach(i) - obstacleRadius(o)) < 1e-3, `k=${k} i=${i} ${horizontalReach(i)} vs ${obstacleRadius(o)}`);
    });
  }
  poseObstacles(geo, obstacleScales(COURSE));
});

test('obstacles stay one merged mesh within the draw budget', () => {
  const ds = [];
  space.traverse(o => { if (o.isMesh || o.isPoints) ds.push(o); });
  assert.ok(ds.length <= INTERIOR_DRAW_BUDGET);
  assert.ok(space.userData.obstacles.isMesh && !space.userData.obstacles.isInstancedMesh);
});

test('the camera shake decays to zero in about a third of a second', () => {
  assert.ok(SLED_SHAKE.ms >= 300 && SLED_SHAKE.ms <= 400);
  let v = 1, t = 0;
  while (v > 0 && t < 2) { v = decayShake(v, 0.016); t += 0.016; }
  assert.equal(v, 0);
  assert.ok(t >= 0.3 && t <= 0.41, `${t}`);
  assert.deepEqual(shakeOffset(0, 1.234), { x: 0, y: 0 });
  const o = shakeOffset(1, 0.5);
  assert.ok(Math.hypot(o.x, o.y) > 0 && Math.hypot(o.x, o.y) <= SLED_SHAKE.amp * Math.SQRT2);
});

test('a sled hit bursts the obstacle with snow, sound, shake and an emoji float', () => {
  const burst = between(src, 'function burstObstacle', '\n}');
  assert.match(burst, /showObstacles\(run\.course, run\.sled\.hitIds\)/);
  assert.match(burst, /spawnSnowBurst\(/);
  assert.match(burst, /Sound\.build\(\)/);
  assert.match(burst, /run\.shake = 1/);
  assert.match(burst, /spawnFloatText\([^)]*'💥'/);
  const sled = between(src, "} else if (run.phase === 'sled')", '\n  }\n}');
  assert.match(sled, /const hitsBefore = run\.sled\.hitIds\.length;/);
  assert.match(sled, /run\.sled\.hitIds\.slice\(hitsBefore\)\.forEach\(burstObstacle\)/);
});

test('obstacles come back for each new run and when the run closes', () => {
  assert.match(between(src, 'function startSled', '\n}'), /showObstacles\(run\.course\)/);
  assert.match(between(src, 'function startSled', '\n}'), /run\.shake = 0/);
  assert.match(between(src, 'function closeRun', '\n}'), /showObstacles\(COURSE\)/);
});

test('the sled camera adds the decaying shake on top of the follow', () => {
  const cam = between(src, 'function sledCamera', '\n}');
  assert.match(cam, /run\.shake = decayShake\(run\.shake, dt\)/);
  assert.match(cam, /shakeOffset\(run\.shake,/);
});

test('the snow burst is a white, non-additive particle puff in the shared pool', () => {
  assert.match(fx, /makeParticle\(_dropGeo, [^,)]+\)/);
  assert.doesNotMatch(fx, /makeParticle\([^)]*true\)/);
  assert.match(fx, /particles\.push\(/);
  assert.match(fx, /export function spawnSnowBurst\(x, y, z, count/);
});

test('an acorn pickup sparkles at the acorn with an emoji-only float', () => {
  const climb = between(src, "if (run.phase === 'climb')", "} else if (run.phase === 'countdown')");
  assert.match(climb, /setAcornVisible\(i, false\); Sound\.harvest\(\); pickAcornFx\(i\);/);
  const pick = between(src, 'function pickAcornFx', '\n}');
  assert.match(pick, /acornY\(i\)/);
  assert.match(pick, /spawnSparkle\([^)]*, (8|9|10)\)/);
  assert.match(pick, /spawnFloatText\([^)]*'🌰'/);
});

test('world floats on the mountain are emoji only', () => {
  const calls = [...src.matchAll(/spawnFloatText\(([^;]*)\)/g)].map(m => m[1]);
  assert.ok(calls.length >= 2);
  for (const c of calls) {
    const lit = c.match(/'([^']*)'/)[1];
    assert.match(lit, /^\p{Extended_Pictographic}️?$/u, c);
  }
});
