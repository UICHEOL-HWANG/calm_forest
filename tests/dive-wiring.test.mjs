import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const game = read('js/game.js');
const sea = read('js/spaces/sea.js');
const doors = read('js/spaces/doors.js');
const dv = read('js/spaces/dive.js');

test('the dive lives inside the sea space at its own spot and opens from the picker', () => {
  assert.match(read('js/data/places.js'), /export const DIVE = new THREE\.Vector3\(400, 0, -300\);/);
  assert.match(read('js/spaces/sea-pick.js'), /dive: \(o\) => enterDive\(o\)/);
  assert.match(game, /_wq\.get\('dive'\) === '1'/);
});

test('sea, game and doors hand control to the dive while it is active', () => {
  assert.match(sea, /if \(dive\.active\) return updateDive\(dt, t\);/);
  assert.match(sea, /if \(dive\.active\) return diveCamera\(camera, look, dt\);/);
  assert.match(sea, /leaveMudflat\(\);\n  leaveDive\(\);/);
  assert.match(game, /else if \(dive\.active\) clampDive\(player\.position\);/);
  assert.match(game, /diveAtmosphere\(scene, camera\);/);
  assert.match(doors, /if \(nearDiveExit\(\)\) \{ nd = 'seaexit'; prompt = DIVE_COPY\.exit; \}/);
  assert.match(doors, /else prompt = diveHint\(\);/);
});

test('the dog paddle pose runs only while diving and leaves the tool swings alone', () => {
  assert.match(game, /\} else if \(playerArms && swim\.on\) \{\n    applySwimPose\(playerArms, playerAnchor, t, swim\.moving, swim\.surface\);/);
  assert.match(dv, /swim\.on = true;/);
  assert.match(dv, /swim\.on = false; swim\.moving = false; swim\.surface = false;/);
  assert.match(dv, /swim\.surface = !run \|\| run\.state === 'surface';/);
  assert.match(dv, /player\.position\.y = 0;/);
  assert.match(dv, /moving \? 'wait' : near \|\| run\.state === 'surface' \? 'go' : '', !!resultCard\);/);
});

test('every dive run is tracked from start to finish or abandon with one run_id', () => {
  assert.match(dv, /rollDifficulty\('dive'\)/);
  assert.match(dv, /trackEvent\('forage_start', startEventParams\(ctx\)\)/);
  assert.match(dv, /trackEvent\('forage_result', resultEventParams\(/);
  assert.match(dv, /trackDiffAbandon\('dive', /);
  assert.match(dv, /sendForageRun\(rowOf\('finish', 'dives'\)\)/);
  assert.match(dv, /giveReward\(\{ \[it\.sp\.key\]: 1, coins: it\.sp\.coin \}, 'dive_pick', it\.sp\.id\)/);
  assert.match(dv, /dives: run\.legs, picks: run\.picks/);
});

test('underwater the diver keeps off the shallows so the camera always sits below the surface', async () => {
  const { diveDepthAt } = await import('../js/forage/dive-run.js');
  const UNDER_Z = Number(/ UNDER_Z = (-?[\d.]+)/.exec(dv)[1]), CAM = Number(/CAM_UNDER_Z = (-?[\d.]+)/.exec(dv)[1]);
  assert.match(dv, /_camPos\.z = Math\.min\(_camPos\.z, DIVE\.z \+ CAM_UNDER_Z\);/);
  const { DIVE_AREA } = await import('../js/forage/dive-run.js');
  assert.ok(DIVE_AREA.Z1 <= UNDER_Z + 1.4, 'every treasure is within reach of the underwater limit');
  for (const k of [1, 1.35, .85]) for (const x of [-16, -8, 0, 8, 16]) {
    const camZ = Math.min(UNDER_Z + 6.4 * k, CAM);
    const camY = Math.max(-diveDepthAt(x, camZ) + 1.6, -.9);
    assert.ok(camY < -.05, `camera y ${camY} at k=${k} x=${x}`);
  }
});
