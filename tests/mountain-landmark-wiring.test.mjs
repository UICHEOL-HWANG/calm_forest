import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gameSource } from './helpers/game-source.mjs';

const src = gameSource();
const read = p => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const mtn = read('js/spaces/mountain.js');
const spawn = mtn.slice(mtn.indexOf('export function spawnMountainGate'), mtn.indexOf('function ensureMountainSpace'));

test('spawnMountainGate places the landmark mountain at its centre and no arch', () => {
  assert.match(mtn, /import \{ buildLandmark \} from '\.\.\/mountain\/landmark\.js';/);
  assert.doesNotMatch(mtn, /gate-art|buildGateArt/);
  assert.match(spawn, /const art = buildLandmark\(THREE\);/);
  assert.match(spawn, /art\.position\.copy\(MOUNTAIN_LANDMARK\);/);
});

test('the mountain body is a solid circle so the player cannot walk into it', () => {
  const r = +mtn.match(/const LANDMARK_SOLID_R = ([\d.]+);/)[1];
  assert.ok(r >= 7 && r <= 8);
  assert.match(spawn, /solidCircle\(MOUNTAIN_LANDMARK\.x, MOUNTAIN_LANDMARK\.z, LANDMARK_SOLID_R\);/);
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
