import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three/three.module.js';
import { findItem } from '../js/cosmetics/catalog.js';
import { shopRows } from '../js/cosmetics/sprout.js';
import { ownedIn } from '../js/cosmetics/wardrobe.js';
import { buildCosmetic } from '../js/cosmetics/art.js';
import { buildTrailMark, markMaterial, TRAIL_UNLIT } from '../js/cosmetics/trail.js';
import { AU } from '../js/cosmetics/art-aurora-pick.js';
import { sideAnchor } from '../js/cosmetics/anchors.js';

const IDS = ['au_aurora_band', 'au_fur_muff', 'au_sled_pack', 'au_aurora_trail'];
const PRICES = [1200, 1000, 1500, 1600];
const bs = [0.9, 1.08, 0.9], R = 0.52, bodyY = R * bs[1] + 0.02;
const K = { R, HR: 0.37, HY: 1.26, bs, bodyY, side: sideAnchor(bs, R, bodyY), neckR: 0.37 * 0.92 };
const luma = h => (0.2126 * ((h >> 16) & 255) + 0.7152 * ((h >> 8) & 255) + 0.0722 * (h & 255)) / 255;

test('aurora pick cosmetics are in the catalog with group daily and coin prices', () => {
  IDS.forEach((id, i) => {
    const it = findItem(id);
    assert.ok(it, id);
    assert.equal(it.group, 'daily');
    assert.equal(it.price.coins, PRICES[i], id);
    assert.ok(!it.premium);
  });
  assert.deepEqual(IDS.map(id => findItem(id).slot), ['head', 'neck', 'back', 'trail']);
  assert.equal(findItem('au_sled_pack').anchor, 'back');
  assert.equal(findItem('au_aurora_trail').tier, '특별');
  assert.equal(findItem('au_aurora_band').earSafe, 'low');
});

test('normal shop tabs never list aurora pick items, wardrobe does once owned', () => {
  for (const slot of ['head', 'neck', 'back', 'trail']) assert.ok(!shopRows(slot).some(i => IDS.includes(i.id)), slot);
  assert.ok(ownedIn({ owned: IDS, equipped: {} }, 'back').some(i => i.id === 'au_sled_pack'));
});

test('aurora pick wearables build merged meshes', () => {
  for (const id of IDS.slice(0, 3)) {
    const g = buildCosmetic(THREE, id, K);
    assert.ok(g, id);
    let n = 0; g.traverse(o => { if (o.isMesh) n++; });
    assert.ok(n >= 1 && n <= 8, `${id} ${n}`);
    assert.ok(g.children.every(c => c.isMesh), `${id}: nested groups block merging`);
  }
});

test('sled pack keeps its height order across tails', () => {
  const box = tail => new THREE.Box3().setFromObject(buildCosmetic(THREE, 'au_sled_pack', { ...K, tail: { type: tail } }));
  const chick = box('feather'), fox = box('bushy');
  assert.ok(chick.min.y < fox.min.y, String(chick.min.y));
  assert.ok(box('curl').max.y > fox.max.y && fox.max.y > box('stub').max.y);
});

test('aurora trail is one unlit two-sided curtain mesh that stands up', () => {
  assert.ok(TRAIL_UNLIT.has('au_aurora_trail'));
  const g = buildTrailMark(THREE, 'au_aurora_trail', 1);
  const meshes = []; g.traverse(o => { if (o.isMesh) meshes.push(o); });
  assert.equal(meshes.length, 1);
  assert.equal(meshes[0].material.type, 'MeshBasicMaterial');
  assert.equal(meshes[0].material.transparent, true);
  const geo = meshes[0].geometry, box = new THREE.Box3().setFromObject(g);
  assert.equal(geo.attributes.color.itemSize, 4);
  assert.ok(box.max.y > 0.1 && box.min.y >= 0, `${box.min.y} ${box.max.y}`);
  assert.ok(geo.attributes.position.count >= 2 * 3 * 2 * 20 * 2, String(geo.attributes.position.count));
  assert.equal(markMaterial(THREE, 'tr_steam_trail', 1).type, 'MeshStandardMaterial');
});

test('aurora pick colors stay under bloom threshold', () => {
  for (const [k, c] of Object.entries(AU)) assert.ok(luma(c) <= 0.85, `${k} ${luma(c).toFixed(3)}`);
});

test('aurora pick art has no comments', async () => {
  const { readFileSync } = await import('node:fs');
  assert.doesNotMatch(readFileSync(new URL('../js/cosmetics/art-aurora-pick.js', import.meta.url), 'utf8'), /^\s*\/\/|\/\*/m);
});
