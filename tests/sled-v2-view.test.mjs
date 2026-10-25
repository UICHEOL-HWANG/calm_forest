import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from '../vendor/three/three.module.js';
import { SLED_CAM, sledCamTargets, sledPose, sledFov } from '../js/mountain/sled-view.js';
import { buildSledProps } from '../js/mountain/sled-props.js';
import { COURSE, centerX, moverPos } from '../js/mountain/course.js';
import { slopePoint } from '../js/mountain/terrain.js';
import { PHYS, createSled, SLED_HALF } from '../js/mountain/sled.js';
import { gateSpots, GATE_POLE } from '../js/mountain/interior-art.js';

const src = f => readFileSync(new URL(`../js/${f}`, import.meta.url), 'utf8');
const sled = (extra = {}) => ({ ...createSled(0), z: 100, x: centerX(100), ...extra });

test('the camera sits low and close behind the sled', () => {
  assert.deepEqual({ ...SLED_CAM }, { up: 4.2, back: 4, lookAhead: 9.5, lookDrop: 0 });
  const { pos } = sledCamTargets(sled());
  const p = slopePoint(100, centerX(100));
  assert.ok(Math.abs(pos.y - p.y - 4.2) < 1e-9);
  assert.ok(Math.abs(p.z - pos.z - 4) < 1e-9);
});

test('the camera rises with the sled in the air', () => {
  const ground = sledCamTargets(sled());
  const air = sledCamTargets(sled({ y: 2 }));
  assert.ok(air.pos.y > ground.pos.y + 1);
  assert.ok(air.look.y > ground.look.y);
});

test('field of view widens with speed and is capped', () => {
  assert.equal(sledFov(PHYS.baseSpeed, PHYS.baseSpeed), 46);
  assert.ok(sledFov(PHYS.baseSpeed * 1.35, PHYS.baseSpeed) > 46);
  assert.equal(sledFov(PHYS.baseSpeed * 5, PHYS.baseSpeed), 56);
});

test('the sled pose lifts in the air and flips during a trick', () => {
  const g = sledPose(sled(), 0);
  const a = sledPose(sled({ y: 1.5, air: true, trick: true, spin: 0.25 }), 0);
  assert.ok(Math.abs(a.y - g.y - 1.5) < 1e-9);
  assert.ok(Math.abs(a.flip + Math.PI / 2) < 1e-9);
  assert.equal(g.flip, 0);
});

test('ramps and movers are built with few draw calls and follow course time', () => {
  const props = buildSledProps(THREE, COURSE);
  let meshes = 0;
  props.group.traverse(o => { if (o.isMesh) meshes += 1; });
  assert.ok(meshes <= COURSE.movers.length + 1, `meshes ${meshes}`);
  props.update(3000);
  COURSE.movers.forEach((m, i) => {
    const p = moverPos(m, 3000), s = slopePoint(p.z, p.x);
    assert.ok(Math.abs(props.movers[i].position.x - s.x) < 1e-6);
    assert.ok(Math.abs(props.movers[i].position.z - s.z) < 1e-6);
  });
});

test('the hud has a chip stack that clears with the run', () => {
  const hud = src('mountain/sled-hud.js');
  assert.match(hud, /export function showChips/);
  assert.match(hud, /class="sled-chips"/);
  const hide = hud.slice(hud.indexOf('export function hideSledHud'), hud.indexOf('export function hideSledHud') + 500);
  assert.match(hide, /showChips\(\[\]\)|sled-chips/);
});

test('the runtime wires v2: pet shield, press, props, fov, ghost and chips', () => {
  const m = src('spaces/mountain.js');
  assert.match(m, /createSled\([^\n]*\{ shield: SHIELD_PER_RUN \}\)/);
  assert.doesNotMatch(m, /shield: gameState\.pet/);
  assert.match(m, /pressSled\(run\.sled\)/);
  assert.match(m, /sledProps\(ensureMountainSpace\(\)\)/);
  assert.match(m, /sledFov\(/);
  assert.match(m, /openRide\(\{ group: \$w\.mountainGroup, sledMesh: [^}]*pet: gameState\.pet, ghost: gameState\.mountain\?\.sled\?\.ghost/);
  assert.match(m, /rideTick\(run\.ride, prev, run\.sled/);
  assert.match(m, /sledSettle\(run\.sled, ctxOf\(\), \{ fpsAvg, ghostPts: run\.ride\?\.path \}\)/);
  const close = m.slice(m.indexOf('function closeRun'), m.indexOf('function closeRun') + 300);
  assert.match(close, /closeRide\(run\?\.ride\)/);
  assert.match(close, /restoreFov\(\)/);
  const ride = src('mountain/sled-ride.js');
  assert.match(ride, /buildSledProps\(/);
  assert.match(ride, /showChips\(chipsFor\(/);
  assert.match(ride, /PET_SEAT = Object\.freeze\(\{ x: 0, y: [0-9.]+, z: -0\.62/);
});

test('the riding pet and the ghost are cached on the mountain group and rebuilt only when they change', () => {
  const ride = src('mountain/sled-ride.js');
  assert.match(ride, /group\.userData\.sledPet = /);
  assert.match(ride, /cached\?\.key === key/);
  assert.match(ride, /cached\?\.skin === skin/);
  const close = ride.slice(ride.indexOf('export function closeRide'));
  assert.doesNotMatch(close, /disposePremiumPet/);
  const m = src('spaces/mountain.js');
  assert.match(m, /skin: run\.sledId \}\)/);
  const fin = m.slice(m.indexOf('function finishSled'), m.indexOf('function finishSled') + 400);
  assert.match(fin, /air: false, trick: false/);
});

test('gate poles stand clear of a sled passing at the edge of the window, cloth hangs outward', () => {
  for (const s of gateSpots()) {
    const f = COURSE.flags[s.flag];
    const pole = slopePoint(f.z, f.x + s.side * (f.half + GATE_POLE.gap));
    assert.ok(Math.abs(s.x - pole.x) < 1e-9);
    assert.ok(GATE_POLE.gap >= SLED_HALF.w + GATE_POLE.r);
  }
  assert.ok(GATE_POLE.clothOut > 0);
});

test('rolling snowballs never overlap a ramp deck', () => {
  const ramps = COURSE.ramps;
  for (const m of COURSE.movers.filter(x => x.kind === 'ball')) {
    for (let tMs = 0; tMs <= 60000; tMs += 50) {
      const p = moverPos(m, tMs);
      for (const r of ramps) {
        const dzM = (p.z - r.z) * (70 / 330);
        if (dzM < -1.9 - m.r || dzM > 0.3 + m.r) continue;
        assert.ok(Math.abs(p.x - r.x) >= r.half + m.r, `ball at z ${p.z.toFixed(1)} x ${p.x.toFixed(2)} vs ramp ${r.z}`);
      }
    }
  }
});

test('the result bar is numbers and emoji only, with reward dots', async () => {
  const { resultBar } = await import('../js/mountain/sled-extras.js');
  const best = resultBar({ timeMs: 40160, best: 40160, newBest: true, coins: 31, leftToday: 2, flags: 3 });
  assert.deepEqual(best, { icon: '🏆', time: '40.16', gold: true, chips: ['🚩 3/12', '🪙 +31'], dots: '●●○', left: 2 });
  const done = resultBar({ timeMs: 41020, best: 38700, newBest: false, coins: 0, leftToday: 0, flags: 9 });
  assert.deepEqual(done, { icon: '🏁', time: '41.02', gold: false, chips: ['🚩 9/12', '🏆 38.70'], dots: '○○○', left: 0 });
  const both = resultBar({ timeMs: 42000, best: 38700, newBest: false, coins: 23, leftToday: 1, flags: 12 });
  assert.deepEqual(both.chips, ['🚩 12/12', '🪙 +23', '🏆 38.70']);
  const hud = src('mountain/sled-hud.js');
  const show = hud.slice(hud.indexOf('export function showResult'), hud.indexOf('export function showResult') + 900);
  assert.doesNotMatch(show, /완주|새 최고 기록|판 남음'\)|다 받았어요/);
  assert.match(hud, /\.sled-result\{[^}]*background:rgba\(28,44,35,\.92\)/);
  assert.match(hud, /\.sled-result\{[^}]*border-radius:22px/);
});
