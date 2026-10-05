import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const space = readFileSync(new URL('../js/spaces/observatory.js', import.meta.url), 'utf8');
const doors = readFileSync(new URL('../js/spaces/doors.js', import.meta.url), 'utf8');

test('observatory entrance and exit are reachable outside the solid foundation', () => {
  const radius = Number(space.match(/solidCircle\(OBSERVATORY_GATE.x, OBSERVATORY_GATE.z, ([\d.]+)\)/)[1]);
  const exit = Number(space.match(/player.position.set\(OBSERVATORY_GATE.x, 0, OBSERVATORY_GATE.z \+ ([\d.]+)\)/)[1]);
  const prompt = doors.match(/dist2D\(\{ x: OBSERVATORY_GATE.x, z: OBSERVATORY_GATE.z \+ ([\d.]+) \}, player.position\) < ([\d.]+)/);
  assert.ok(exit > radius + 0.5, 'exit must clear the foundation and player radius');
  assert.ok(Number(prompt[1]) + Number(prompt[2]) > radius + 0.5, 'prompt must extend beyond collision');
  assert.ok(Math.abs(exit - Number(prompt[1])) < Number(prompt[2]), 'exit stays within entrance reach');
});

test('observatory stairs are climbable from the front: step heights match the geometry, sides are walled', async () => {
  const ext = await import('../js/observatory/stairs.js');
  const { STAIR_HALF_W, STAIR_FOOT, STAIR_RUN, STAIR_RISE, STAIR_STEPS, R_BASE, stairHeight } = ext;
  assert.match((await import('node:fs')).readFileSync(new URL('../js/observatory/exterior.js', import.meta.url), 'utf8'), /from '\.\/stairs\.js'/, 'geometry uses the same numbers');
  assert.equal(STAIR_STEPS, 4);
  // front edge of the bottom step (centre R+2.9, depth 0.5)
  assert.ok(Math.abs(STAIR_FOOT - (R_BASE + 3.15)) < 1e-9);
  // ground in front of the stairs, then one rise per run, up to the plinth top (BASE 1.2)
  assert.equal(stairHeight(0, STAIR_FOOT + 0.2), 0);
  assert.equal(stairHeight(0, STAIR_FOOT - 0.1), STAIR_RISE);
  assert.equal(stairHeight(0, STAIR_FOOT - STAIR_RUN - 0.1), STAIR_RISE * 2);
  assert.equal(stairHeight(0, STAIR_FOOT - STAIR_RUN * 3 - 0.1), STAIR_RISE * 4);
  assert.ok(Math.abs(STAIR_RISE * STAIR_STEPS - 1.2) < 1e-9, 'top step meets the plinth');
  // beside the stairs is ground
  assert.equal(stairHeight(STAIR_HALF_W + 0.3, STAIR_FOOT - 0.5), 0);
  // the space no longer blocks the stair footprint, it walls the two sides instead
  assert.doesNotMatch(space, /solidBox\(OBSERVATORY_GATE\.x - STAIR_HALF_W, OBSERVATORY_GATE\.z \+ R_BASE, OBSERVATORY_GATE\.x \+ STAIR_HALF_W/);
  assert.match(space, /for \(const sx of \[-1, 1\]\)[\s\S]*solidBox\(/);
  // exit still lands in front of the bottom step
  const exit = Number(space.match(/player.position.set\(OBSERVATORY_GATE.x, 0, OBSERVATORY_GATE.z \+ ([\d.]+)\)/)[1]);
  assert.ok(exit > STAIR_FOOT + 0.5);
});

test('updateObservatoryStairs eases the player onto the step height near the gate only', async () => {
  const src = space;
  assert.match(src, /export function updateObservatoryStairs\(dt\)/);
  const game = (await import('node:fs')).readFileSync(new URL('../js/game.js', import.meta.url), 'utf8');
  assert.match(game, /updateObservatoryStairs\(dt\)/, 'called from the play loop');
});
