import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three/three.module.js';
import { STAGE_POS, SPOT_R } from '../js/data/concert.js';
import { STAGE_SOLIDS, DECK_H, buildConcertStage } from '../js/spaces/concert-stage-art.js';

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
