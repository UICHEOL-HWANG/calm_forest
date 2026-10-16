import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gameSource } from './helpers/game-source.mjs';
import { landmarkSolids, landmarkFoot, onMountainside, LANDMARK } from '../js/mountain/landmark.js';
import { landmarkHeight } from '../js/mountain/backdrop.js';
import { EN } from '../js/i18n-en.js';

const PLAYER_R = 0.42;
const MOUNTAIN_PLACE_MSG = readFileSync(new URL('../js/data/catalog.js', import.meta.url), 'utf8').match(/export const MOUNTAIN_PLACE_MSG = '([^']+)';/)?.[1];

const src = gameSource();
const read = p => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const mtn = read('js/spaces/mountain.js');
const spawn = mtn.slice(mtn.indexOf('export function spawnMountainGate'), mtn.indexOf('function ensureMountainSpace'));

test('spawnMountainGate places the landmark mountain at its centre and no arch', () => {
  assert.match(mtn, /import \{ buildLandmark, landmarkSolids \} from '\.\.\/mountain\/landmark\.js';/);
  assert.doesNotMatch(mtn, /gate-art|buildGateArt/);
  assert.match(spawn, /const art = buildLandmark\(THREE\);/);
  assert.match(spawn, /art\.position\.copy\(MOUNTAIN_LANDMARK\);/);
});

test('the mountain body is a ring of solid circles following the star-shaped foot', () => {
  assert.match(mtn, /import \{ PLAYER_R \} from '\.\.\/data\/character\.js';/);
  assert.match(spawn, /for \(const s of landmarkSolids\(PLAYER_R\)\) solidCircle\(MOUNTAIN_LANDMARK\.x \+ s\.x, MOUNTAIN_LANDMARK\.z \+ s\.z, s\.r\);/);
  assert.doesNotMatch(mtn, /LANDMARK_SOLID_R/);
});

test('in 72 directions the player stops near the visible foot and never climbs the slope', () => {
  const solids = landmarkSolids(PLAYER_R);
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * Math.PI * 2, ux = Math.cos(a), uz = Math.sin(a);
    let t = 0;
    for (const s of solids) {
      const R = s.r + PLAYER_R, b = ux * s.x + uz * s.z, q = s.x * s.x + s.z * s.z - b * b;
      if (q < R * R) t = Math.max(t, b + Math.sqrt(R * R - q));
    }
    const foot = landmarkFoot(a);
    assert.ok(t >= 0.75 * foot && t <= foot + 0.5, `dir ${i}: stop ${t} foot ${foot}`);
    assert.ok(landmarkHeight(t, a, LANDMARK.radius, LANDMARK.height, LANDMARK.spur) <= 0.3, `dir ${i} climbs`);
  }
});

test('neighbouring body circles overlap so the player cannot slip between them', () => {
  const s = landmarkSolids(PLAYER_R);
  s.forEach((a, i) => {
    const b = s[(i + 1) % s.length];
    assert.ok(Math.hypot(a.x - b.x, a.z - b.z) < a.r + b.r + 2 * PLAYER_R, `gap after ${i}`);
  });
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
