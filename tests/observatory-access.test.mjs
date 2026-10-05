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

test('observatory stairs are solid and the exit lands in front of them, not on them', async () => {
  const ext = readFileSync(new URL('../js/observatory/exterior.js', import.meta.url), 'utf8');
  const R = Number(ext.match(/const R = ([\d.]+)/)[1]);
  const foot = Number(ext.match(/export const STAIR_FOOT = R \+ ([\d.]+);/)[1]) + R;
  // geometry: bottom step centre R+2.9, depth 0.5 → front edge R+3.15
  assert.ok(Math.abs(foot - (R + 3.15)) < 1e-9, 'STAIR_FOOT is the front edge of the bottom step');
  assert.match(space, /solidBox\(OBSERVATORY_GATE\.x - STAIR_HALF_W, OBSERVATORY_GATE\.z \+ R_BASE, OBSERVATORY_GATE\.x \+ STAIR_HALF_W, OBSERVATORY_GATE\.z \+ STAIR_FOOT\)/);
  const exit = Number(space.match(/player.position.set\(OBSERVATORY_GATE.x, 0, OBSERVATORY_GATE.z \+ ([\d.]+)\)/)[1]);
  assert.ok(exit > foot + 0.5, `exit ${exit} must clear the stairs (${foot}) and player radius`);
});
