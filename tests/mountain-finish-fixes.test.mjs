import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { sledCamTargets, runoutCamTargets, RUNOUT_CAM } from '../js/mountain/sled-view.js';
import { createSled } from '../js/mountain/sled.js';
import { COURSE } from '../js/mountain/course.js';
import { slopePoint, terrainHeight } from '../js/mountain/terrain.js';
import { CAMP } from '../js/mountain/camp-layout.js';
import { RUNOUT_STOP_Z } from '../js/mountain/runout.js';
import { ROOM, KNEE, TABLES, SEATS, ENTRY, EXIT_SPOT, ORDER_SPOT, clampCafe } from '../js/mountain/cafe-layout.js';

const src = p => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const body = (s, name) => s.slice(s.indexOf(`function ${name}(`), s.indexOf('\n}\n', s.indexOf(`function ${name}(`)));

test('runout camera starts on the sled framing and orbits to the front without looking straight down', () => {
  const stop = { x: CAMP.finish.x, y: terrainHeight(CAMP.finish.x, RUNOUT_STOP_Z), z: RUNOUT_STOP_Z };
  const end = { ...createSled(0), z: COURSE.length, x: 0 };
  const p = slopePoint(COURSE.length, 0);
  const a = sledCamTargets(end), b = runoutCamTargets(p, 0);
  assert.ok(Math.abs(a.pos.y - b.pos.y) < 1e-9 && Math.abs(a.pos.z - b.pos.z) < 1e-9 && Math.abs(b.pos.x - p.x) < 1e-9);
  for (let t = 0; t <= RUNOUT_CAM.orbitS + 0.5; t += 0.05) {
    const c = runoutCamTargets(stop, t).pos;
    const flat = Math.hypot(c.x - stop.x, c.z - stop.z);
    assert.ok(flat >= 6, `t=${t.toFixed(2)} flat ${flat.toFixed(2)}`);
    assert.ok(Math.atan2(c.y - stop.y, flat) < (50 * Math.PI) / 180, `t=${t.toFixed(2)} steep`);
  }
  const f = runoutCamTargets(stop, RUNOUT_CAM.orbitS + 1);
  assert.ok(f.pos.z > stop.z + 3);
  assert.ok(Math.hypot(f.look.x - stop.x, f.look.z - stop.z) < 1e-9);
});

test('finishing keeps a camera rig on the sliding player and hides the boost button', () => {
  const s = src('js/spaces/mountain.js');
  const fin = body(s, 'finishSled');
  assert.match(fin, /setCameraRig\(runoutCamera\)/);
  assert.doesNotMatch(fin, /setCameraRig\(null\)/);
  assert.match(fin, /hideBoost\(\)/);
  assert.doesNotMatch(body(s, 'celebrate'), /setCameraRig\(null\)/);
  const close = body(s, 'closeRun');
  assert.ok(close.indexOf('setCameraRig(null)') >= 0 && close.indexOf('snapCamera()') > close.indexOf('setCameraRig(null)'));
});

test('the cheering player stands in front of the stopped sled, on the camera side', () => {
  const s = src('js/spaces/mountain.js');
  const cel = body(s, 'celebrate');
  assert.match(cel, /MOUNTAIN\.z \+ z \+ CHEER_FRONT/);
  assert.doesNotMatch(cel, /Math\.sin\(yaw\) \* 0\.9/);
  assert.match(s, /const CHEER_FRONT = \d/);
});

test('sled HUD exposes hideBoost and puts the result card below the cheering player', () => {
  const s = src('js/mountain/sled-hud.js');
  assert.match(s, /export function hideBoost\(/);
  const rule = s.match(/\.sled-result\{[^}]*\}/)[0];
  assert.doesNotMatch(rule, /top:50%/);
  assert.match(rule, /bottom:/);
});

test('cafe seats and the walkable floor stay out from under the sloped roof', () => {
  assert.ok(KNEE > 0 && KNEE < ROOM.w / 2);
  for (const s of SEATS) assert.ok(Math.abs(s.x) <= KNEE - 0.3, JSON.stringify(s));
  assert.ok(clampCafe({ x: 20, z: 0 }).x <= KNEE + 1e-9);
  assert.ok(clampCafe({ x: -20, z: 0 }).x >= -KNEE - 1e-9);
});

test('cafe furniture does not overlap and leaves the door and order spot clear', () => {
  for (let i = 0; i < SEATS.length; i++) for (let j = i + 1; j < SEATS.length; j++) {
    assert.ok(Math.hypot(SEATS[i].x - SEATS[j].x, SEATS[i].z - SEATS[j].z) >= 0.56 + 0.2, `${i}-${j}`);
  }
  for (const t of TABLES) for (const p of [ENTRY, EXIT_SPOT, ORDER_SPOT]) assert.ok(Math.hypot(t.x - p.x, t.z - p.z) > 1.3, JSON.stringify([t, p]));
});

test('a straight walk from the cafe door reaches the order spot', () => {
  let p = { x: ENTRY.x, z: ENTRY.z };
  const d = Math.hypot(ORDER_SPOT.x - p.x, ORDER_SPOT.z - p.z);
  const dir = { x: (ORDER_SPOT.x - p.x) / d, z: (ORDER_SPOT.z - p.z) / d };
  for (let i = 0; i < Math.ceil(d / 0.05); i++) p = clampCafe({ x: p.x + dir.x * 0.05, z: p.z + dir.z * 0.05 });
  assert.ok(Math.hypot(p.x - ORDER_SPOT.x, p.z - ORDER_SPOT.z) < 0.3, JSON.stringify(p));
});

test('cafe art draws tables from the layout and the roof edge from KNEE', () => {
  const s = src('js/mountain/cafe-art.js');
  assert.match(s, /TABLES\.forEach/);
  assert.doesNotMatch(s, /\[3\.4, 1\.4\]/);
  assert.match(s, /KNEE/);
});

test('hut cafe door ids never collide with door ids the game handles before the mountain', () => {
  const g = src('js/game.js');
  const cut = g.indexOf('if (atMountain || nearDoor === \'mountain\') return mountainAction(nearDoor);');
  assert.ok(cut > 0);
  const before = new Set([...g.slice(0, cut).matchAll(/nearDoor === '([a-z]+)'/g)].map(m => m[1]));
  const mine = [...src('js/spaces/mountain.js').matchAll(/nearDoor === '([a-z]+)'/g)].map(m => m[1]);
  for (const id of mine) if (id !== 'mountain') assert.ok(!before.has(id), id);
});
