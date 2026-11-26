import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three/three.module.js';
import { STAGE_POS, SPOT_R } from '../js/data/concert.js';
import { STAGE_SOLIDS, SEAT_SOLIDS, DECK_H, buildConcertStage } from '../js/spaces/concert-stage-art.js';
import { readFileSync } from 'node:fs';

const gap = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const NEAR = [
  { name: 'coop', x: -4.5, z: 11.5, r: 2.4 },
  { name: 'rancher', x: -6.5, z: 12.8, r: 0.7 },
  { name: 'kiln spot', x: -7.5, z: 14, r: 0.8 },
  { name: 'cafe building', x: 4, z: 12.8, r: 3.3 },
  { name: 'neighbor gate', x: -4, z: 25, r: 2.2 },
  { name: 'forest', x: -18, z: 23, r: 9 },
];

test('the stage keeps clear of nearby facilities', () => {
  for (const f of NEAR) assert.ok(gap(STAGE_POS, f) > f.r + 2.0, `${f.name} ${gap(STAGE_POS, f)}`);
});

test('colliders leave the performer spot and the front approach open', () => {
  assert.ok(STAGE_SOLIDS.length >= 1);
  for (const [x, z, r] of STAGE_SOLIDS) {
    assert.ok(gap({ x, z }, STAGE_POS) > r + 0.6, 'performer spot');
    assert.ok(gap({ x, z }, { x: STAGE_POS.x, z: STAGE_POS.z + SPOT_R }) > r + 0.5, 'front approach');
    assert.ok(z <= STAGE_POS.z, 'colliders sit behind the performer');
  }
});

test('the stage has lamps, a band and seats', () => {
  const g = buildConcertStage(THREE);
  assert.ok(g.userData.lamps.length >= 2);
  assert.ok(g.userData.band.length >= 2 && g.userData.band.length <= 3);
  assert.ok(g.userData.seats.length >= 2);
  assert.ok(DECK_H > 0 && DECK_H <= 0.2);
  for (const lamp of g.userData.lamps) assert.equal(lamp.emissiveIntensity, 0);
});

test('benches are solid, and the front approach stays open', () => {
  const seats = buildConcertStage(THREE).userData.seats;
  assert.equal(SEAT_SOLIDS.length, seats.length);
  seats.forEach((s, i) => {
    const [x, z, r] = SEAT_SOLIDS[i];
    assert.ok(gap({ x, z }, s) < 0.01 && r >= 0.55, 'covers the bench');
    assert.ok(gap({ x, z }, { x: STAGE_POS.x, z: STAGE_POS.z + SPOT_R }) > r + 0.5, 'front approach');
  });
  const src = readFileSync(new URL('../js/concert/index.js', import.meta.url), 'utf8');
  assert.match(src, /\[\.\.\.STAGE_SOLIDS, \.\.\.SEAT_SOLIDS\]\.forEach\(\(\[x, z, r\]\) => d\.solidCircle\(x, z, r\)\)/);
});

test('the merchant first visit waits while the player is at the stage or playing', () => {
  const src = readFileSync(new URL('../js/spaces/npc.js', import.meta.url), 'utf8');
  const fn = src.slice(src.indexOf('export function updateMerchantVisit'), src.indexOf('const WELCOME_LINES'));
  assert.match(fn, /if \(!inVillage2\(\)\) return;[^\n]*\n\s*if \(concertBusy\(\)\) return;/);
  assert.match(fn, /if \(concertBusy\(\)\) \{ v\.t = 0; return; \}/);
  const idx = readFileSync(new URL('../js/concert/index.js', import.meta.url), 'utf8');
  assert.match(idx, /export const concertBusy = \(\) => !!show \|\| spot;/);
});
