import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gameSource } from './helpers/game-source.mjs';
import { landmarkStop, landmarkStopR, landmarkFoot, onMountainside, LANDMARK } from '../js/mountain/landmark.js';
import { landmarkHeight } from '../js/mountain/backdrop.js';
import { EN } from '../js/i18n-en.js';

const MOUNTAIN_PLACE_MSG = readFileSync(new URL('../js/data/catalog.js', import.meta.url), 'utf8').match(/export const MOUNTAIN_PLACE_MSG = '([^']+)';/)?.[1];

const src = gameSource();
const read = p => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const mtn = read('js/spaces/mountain.js');
const spawn = mtn.slice(mtn.indexOf('export function spawnMountainGate'), mtn.indexOf('function ensureMountainSpace'));

test('spawnMountainGate places the landmark mountain at its centre and no arch', () => {
  assert.match(mtn, /import \{ buildLandmark, landmarkStop \} from '\.\.\/mountain\/landmark\.js';/);
  assert.doesNotMatch(mtn, /gate-art|buildGateArt/);
  assert.match(spawn, /const art = buildLandmark\(THREE\);/);
  assert.match(spawn, /art\.position\.copy\(MOUNTAIN_LANDMARK\);/);
});

test('the mountain body is a polar clamp hooked after resolveColliders in the village, not a collider ring', () => {
  assert.doesNotMatch(mtn, /landmarkSolids|PLAYER_R/);
  assert.doesNotMatch(spawn, /solidCircle/);
  assert.match(mtn, /export function clampToLandmark\(p\) \{\s*const s = landmarkStop\(p\.x - MOUNTAIN_LANDMARK\.x, p\.z - MOUNTAIN_LANDMARK\.z\);\s*p\.x = MOUNTAIN_LANDMARK\.x \+ s\.x; p\.z = MOUNTAIN_LANDMARK\.z \+ s\.z;\s*\}/);
  const hook = src.indexOf('  if (inVillage2()) clampToLandmark(player.position);');
  assert.ok(hook > src.indexOf('  resolveColliders(player.position);'));
  assert.match(src, /if \(atMirror\) clampToMirror\(player\.position\);[^\n]*\n  if \(inVillage2\(\)\) clampToLandmark\(player\.position\);/);
  assert.match(src, /import \{ clampToLandmark, clampToMountain,/);
});

test('landmarkStop pushes inside points radially out to the stop contour', () => {
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * Math.PI * 2, stop = landmarkStopR(a);
    for (const k of [0.05, 0.4, 0.8, 0.99]) {
      const p = { x: Math.cos(a) * stop * k, z: Math.sin(a) * stop * k };
      const q = landmarkStop(p.x, p.z);
      assert.notEqual(q, p);
      assert.ok(Math.abs(Math.hypot(q.x, q.z) - stop) < 1e-9, `dir ${i} k ${k}`);
      assert.ok(Math.abs(Math.atan2(q.z, q.x) - Math.atan2(p.z, p.x)) < 1e-9);
    }
  }
  const c = landmarkStop(0, 0);
  assert.ok(Math.abs(Math.hypot(c.x, c.z) - landmarkStopR(Math.atan2(c.z, c.x))) < 1e-9);
});

test('landmarkStop leaves outside points unchanged and returns a new object', () => {
  const p = { x: 0, z: 12 };
  const q = landmarkStop(p.x, p.z);
  assert.deepEqual(q, { x: 0, z: 12 });
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * Math.PI * 2, r = landmarkStopR(a) + 0.01;
    const s = landmarkStop(Math.cos(a) * r, Math.sin(a) * r);
    assert.ok(Math.abs(s.x - Math.cos(a) * r) < 1e-12 && Math.abs(s.z - Math.sin(a) * r) < 1e-12);
  }
});

test('stop contour is continuous, sits at the visible foot and never up the slope', () => {
  const N = 3600;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2, b = ((i + 1) / N) * Math.PI * 2;
    assert.ok(Math.abs(landmarkStopR(a) - landmarkStopR(b)) < 0.05, `jump at ${i}`);
    const foot = landmarkFoot(a), stop = landmarkStopR(a);
    assert.ok(stop >= 0.75 * foot && stop <= foot + 0.5);
    assert.ok(landmarkHeight(stop, a, LANDMARK.radius, LANDMARK.height, LANDMARK.spur) <= 0.3, `dir ${i} climbs`);
  }
});

test('straight walks with real step sizes never tunnel inside the stop contour', () => {
  for (const step of [0.1, 0.2, 0.42]) {
    for (let deg = 0; deg < 360; deg += 2) {
      const a = deg * Math.PI / 180, ux = Math.cos(a), uz = Math.sin(a);
      for (let off = -12; off <= 12; off += 1) {
        let x = -ux * 15 - uz * off, z = -uz * 15 + ux * off;
        for (let n = 0; n * step < 30; n++) {
          ({ x, z } = landmarkStop(x + ux * step, z + uz * step));
          assert.ok(Math.hypot(x, z) >= landmarkStopR(Math.atan2(z, x)) - 0.01, `step ${step} deg ${deg} off ${off}`);
        }
      }
    }
  }
});

test('outdoor decor is refused on the mountainside with the approved copy', () => {
  assert.equal(MOUNTAIN_PLACE_MSG, '🏔️ 산자락엔 놓을 수 없어요');
  assert.equal(EN[MOUNTAIN_PLACE_MSG], "🏔️ Can't place on the mountainside");
  assert.doesNotMatch(MOUNTAIN_PLACE_MSG + EN[MOUNTAIN_PLACE_MSG], /\u2014/);
  assert.match(src, /if \(!silent && !def\.farm && onMountainside\(wx, wz, MOUNTAIN_LANDMARK, MOUNTAIN_LANDMARK_R\)\) \{ ui\.toast\?\.\(MOUNTAIN_PLACE_MSG, 2400\); return false; \}/);
  const place = src.slice(src.indexOf('function placeOutdoor('), src.indexOf('const moved = !silent && !!pickedOutdoor;'));
  assert.match(place, /onMountainside/);
});

test('the decor ghost turns red over the mountainside like other invalid spots', () => {
  const indoor = read('js/spaces/indoor.js');
  assert.match(indoor, /tintGhost\(!onMountainside\(ax, az, MOUNTAIN_LANDMARK, MOUNTAIN_LANDMARK_R\)\)/);
  assert.match(indoor, /function tintGhost\(ok\) \{[\s\S]*?0x7fce8b : 0xe8705a/);
});

test('onMountainside covers the footprint and nothing beyond it', () => {
  const c = { x: -15, z: -36 };
  assert.equal(onMountainside(-15, -26, c, 11), true);
  assert.equal(onMountainside(-15 + 10.9, -36, c, 11), true);
  assert.equal(onMountainside(-15, -24.9, c, 11), false);
});

test('the footprint is a no-till obstacle checked by the hoe through isBlocked', () => {
  assert.match(spawn, /obstacles\.push\(\{ x: MOUNTAIN_LANDMARK\.x, z: MOUNTAIN_LANDMARK\.z, r: MOUNTAIN_LANDMARK_R \}\);/);
  assert.match(src, /function isBlocked\(x, z\) \{ return obstacles\.some\(o => Math\.hypot\(x - o\.x, z - o\.z\) < o\.r \+ 0\.95\); \}/);
  assert.match(read('js/spaces/orchard-actions.js'), /if \(isBlocked\(gx, gz\)\) \{ ui\.toast\?\.\('여기엔 밭을 만들 수 없어요 🌳'\); return; \}/);
});

test('no-till obstacle covers the whole footprint including the south-foot gate', () => {
  const isBlocked = (obs, x, z) => obs.some(o => Math.hypot(x - o.x, z - o.z) < o.r + 0.95);
  const c = { x: -15, z: -36 }, obs = [{ ...c, r: 11 }];
  for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) {
    assert.equal(isBlocked(obs, c.x + Math.cos(a) * 11, c.z + Math.sin(a) * 11), true);
  }
  assert.equal(isBlocked(obs, c.x, c.z + 9), true);
  assert.equal(isBlocked(obs, c.x, c.z + 12.5), false);
});

test('village trees and ground scatter avoid the landmark footprint, not the old gate', () => {
  const hits = src.match(/dist2D\(\{ x, z \}, MOUNTAIN_LANDMARK\) < MOUNTAIN_LANDMARK_R \+ 0\.5/g) || [];
  assert.equal(hits.length, 2);
  assert.doesNotMatch(src, /dist2D\(\{ x, z \}, MOUNTAIN_GATE\)/);
});

test('door prompt is anchored on the gate itself at the south foot', () => {
  assert.match(read('js/spaces/doors.js'), /\} else if \(dist2D\(MOUNTAIN_GATE, player\.position\) < 2\.4\) \{\s*nd = 'mountain';/);
});
