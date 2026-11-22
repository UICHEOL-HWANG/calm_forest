import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three/three.module.js';
import { findItem } from '../js/cosmetics/catalog.js';
import { shopRows } from '../js/cosmetics/sprout.js';
import { ownedIn } from '../js/cosmetics/wardrobe.js';
import { buildCosmetic } from '../js/cosmetics/art.js';
import { buildTrailMark } from '../js/cosmetics/trail.js';
import { BK } from '../js/cosmetics/art-book-pick.js';
import { sideAnchor } from '../js/cosmetics/anchors.js';

const IDS = ['bk_round_glasses', 'bk_bookmark_charm', 'bk_book_pack', 'bk_paper_moth_trail'];
const PRICES = [1200, 1000, 1500, 1600];
const bs = [0.9, 1.08, 0.9], R = 0.52, bodyY = R * bs[1] + 0.02;
const K = { R, HR: 0.37, HY: 1.26, bs, bodyY, side: sideAnchor(bs, R, bodyY), neckR: 0.37 * 0.92 };
const luma = h => (0.2126 * ((h >> 16) & 255) + 0.7152 * ((h >> 8) & 255) + 0.0722 * (h & 255)) / 255;

test('book pick cosmetics are in the catalog with group daily and coin prices', () => {
  IDS.forEach((id, i) => {
    const it = findItem(id);
    assert.ok(it, id);
    assert.equal(it.group, 'daily');
    assert.equal(it.price.coins, PRICES[i], id);
    assert.ok(!it.premium);
  });
  assert.deepEqual(IDS.map(id => findItem(id).slot), ['head', 'neck', 'back', 'trail']);
  assert.equal(findItem('bk_book_pack').anchor, 'back');
  assert.equal(findItem('bk_paper_moth_trail').tier, '특별');
  assert.equal(findItem('bk_round_glasses').earSafe, 'low');
});

test('normal shop tabs never list book pick items, wardrobe does once owned', () => {
  for (const slot of ['head', 'neck', 'back', 'trail']) assert.ok(!shopRows(slot).some(i => IDS.includes(i.id)), slot);
  assert.ok(ownedIn({ owned: IDS, equipped: {} }, 'back').some(i => i.id === 'bk_book_pack'));
});

test('book pick wearables build merged meshes', () => {
  for (const id of IDS.slice(0, 3)) {
    const g = buildCosmetic(THREE, id, K);
    assert.ok(g, id);
    let n = 0; g.traverse(o => { if (o.isMesh) n++; });
    assert.ok(n >= 1 && n <= 8, `${id} ${n}`);
    assert.ok(g.children.every(c => c.isMesh), `${id}: nested groups block merging`);
  }
});

test('glasses sit in front of the face with see-through lenses', () => {
  const g = buildCosmetic(THREE, 'bk_round_glasses', K);
  const lenses = []; g.traverse(o => { if (o.isMesh && o.material.transparent) lenses.push(o); });
  assert.equal(lenses.length, 2);
  const box = new THREE.Box3().setFromObject(g);
  assert.ok(box.max.z > K.HR * 1.0 && box.max.z < K.HR * 1.2, String(box.max.z));
});

test('book pack sits at the waist for the chick feather tail and keeps other heights', () => {
  const box = tail => new THREE.Box3().setFromObject(buildCosmetic(THREE, 'bk_book_pack', { ...K, tail: { type: tail } }));
  const chick = box('feather'), fox = box('bushy');
  assert.ok(chick.min.y < fox.min.y - R * 0.45, String(chick.min.y));
  assert.ok(chick.max.y <= fox.max.y);
  assert.ok(box('curl').max.y > fox.max.y && fox.max.y > box('stub').max.y);
});

test('paper moth trail bakes into one mesh', () => {
  const g = buildTrailMark(THREE, 'bk_paper_moth_trail', 1);
  const meshes = []; g.traverse(o => { if (o.isMesh) meshes.push(o); });
  assert.equal(meshes.length, 1);
  assert.ok(meshes[0].geometry.attributes.position.count > 20);
});

test('book pick colors stay under bloom threshold', () => {
  for (const [k, c] of Object.entries(BK)) assert.ok(luma(c) < 0.85, `${k} ${luma(c).toFixed(3)}`);
});
