import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from '../vendor/three/three.module.js';
import { findItem } from '../js/cosmetics/catalog.js';
import { buildCosmetic } from '../js/cosmetics/art.js';
import { buildTrailMark } from '../js/cosmetics/trail.js';
import { PRICE_IDS } from '../js/shop/price-ids.js';

const K = { R: 0.5, HR: 0.38, HY: 1.15, bs: 1, bodyY: 0.55, side: { x: 0.5, y: 0.6, z: 0 }, neckR: 0.3 };

test('three hut-only wearables with spec prices', () => {
  assert.deepEqual(['earmuff', 'snowflake', 'sled_pack'].map(id => [findItem(id).slot, findItem(id).price.coins, findItem(id).shop]),
    [['head', 1000, 'hut'], ['trail', 1200, 'hut'], ['back', 1400, 'hut']]);
  assert.equal(findItem('earmuff').earSafe, 'low');
  assert.equal(findItem('sled_pack').anchor, 'back');
  for (const id of ['earmuff', 'snowflake', 'sled_pack']) assert.ok(id in PRICE_IDS && PRICE_IDS[id] === null);
});

test('wearables build meshes and the snowflake trail is not empty', () => {
  for (const id of ['earmuff', 'sled_pack']) {
    const g = buildCosmetic(THREE, id, K);
    let n = 0; g.traverse(o => { if (o.isMesh) n++; });
    assert.ok(n >= 1 && n <= 3, `${id} ${n}`);
  }
  let marks = 0; buildTrailMark(THREE, 'snowflake', 1).traverse(o => { if (o.isMesh) marks++; });
  assert.ok(marks >= 1);
});

test('the village cosmetics shop hides hut items', () => {
  const src = readFileSync(new URL('../js/spaces/cafe.js', import.meta.url), 'utf8');
  assert.match(src, /const rowsOf = slot => itemsOf\(slot\)\.filter\(i => !i\.shop\);/);
  const draw = src.slice(src.indexOf('export function drawCosMenu'));
  assert.doesNotMatch(draw, /itemsOf\(cosTab\)/);
  assert.doesNotMatch(draw, /itemsOf\(id\)/);
});
