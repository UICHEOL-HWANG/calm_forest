import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three/three.module.js';
import { findItem } from '../js/cosmetics/catalog.js';
import { shopRows } from '../js/cosmetics/sprout.js';
import { ownedIn } from '../js/cosmetics/wardrobe.js';
import { buildCosmetic } from '../js/cosmetics/art.js';
import { buildTrailMark } from '../js/cosmetics/trail.js';
import { TR } from '../js/cosmetics/art-train-pick.js';
import { sideAnchor } from '../js/cosmetics/anchors.js';

const IDS = ['tr_conductor_cap', 'tr_ticket_charm', 'tr_suitcase_pack', 'tr_steam_trail'];
const PRICES = [1200, 1000, 1500, 1600];
const bs = [0.9, 1.08, 0.9], R = 0.52, bodyY = R * bs[1] + 0.02;
const K = { R, HR: 0.37, HY: 1.26, bs, bodyY, side: sideAnchor(bs, R, bodyY), neckR: 0.37 * 0.92 };
const luma = h => (0.2126 * ((h >> 16) & 255) + 0.7152 * ((h >> 8) & 255) + 0.0722 * (h & 255)) / 255;

test('train pick cosmetics are in the catalog with group daily and coin prices', () => {
  IDS.forEach((id, i) => {
    const it = findItem(id);
    assert.ok(it, id);
    assert.equal(it.group, 'daily');
    assert.equal(it.price.coins, PRICES[i], id);
    assert.ok(!it.premium);
  });
  assert.deepEqual(IDS.map(id => findItem(id).slot), ['head', 'neck', 'back', 'trail']);
  assert.equal(findItem('tr_suitcase_pack').anchor, 'back');
  assert.equal(findItem('tr_steam_trail').tier, '특별');
  assert.equal(findItem('tr_conductor_cap').earSafe, 'dome');
});

test('normal shop tabs never list train pick items, wardrobe does once owned', () => {
  for (const slot of ['head', 'neck', 'back', 'trail']) assert.ok(!shopRows(slot).some(i => IDS.includes(i.id)), slot);
  assert.ok(ownedIn({ owned: IDS, equipped: {} }, 'back').some(i => i.id === 'tr_suitcase_pack'));
});

test('train pick wearables build merged meshes', () => {
  for (const id of IDS.slice(0, 3)) {
    const g = buildCosmetic(THREE, id, K);
    assert.ok(g, id);
    let n = 0; g.traverse(o => { if (o.isMesh) n++; });
    assert.ok(n >= 1 && n <= 8, `${id} ${n}`);
    assert.ok(g.children.every(c => c.isMesh), `${id}: nested groups block merging`);
  }
});

test('conductor cap hugs the dome no lower than the shipped cap, visor in front', () => {
  const box = new THREE.Box3().setFromObject(buildCosmetic(THREE, 'tr_conductor_cap', K));
  const cap = new THREE.Box3().setFromObject(buildCosmetic(THREE, 'cap', K));
  assert.ok(box.min.y >= cap.min.y - 0.01, String(box.min.y / K.HR));
  assert.ok(box.max.y < K.HR * 1.1, String(box.max.y / K.HR));
  assert.ok(box.max.z > K.HR * 1.0, String(box.max.z / K.HR));
});

test('suitcase pack sits at the waist for the chick feather tail and keeps other heights', () => {
  const box = tail => new THREE.Box3().setFromObject(buildCosmetic(THREE, 'tr_suitcase_pack', { ...K, tail: { type: tail } }));
  const chick = box('feather'), fox = box('bushy');
  assert.ok(chick.min.y < fox.min.y - R * 0.45, String(chick.min.y));
  assert.ok(chick.max.y <= fox.max.y);
  assert.ok(box('curl').max.y > fox.max.y && fox.max.y > box('stub').max.y);
});

test('steam trail bakes into one mesh', () => {
  const g = buildTrailMark(THREE, 'tr_steam_trail', 1);
  const meshes = []; g.traverse(o => { if (o.isMesh) meshes.push(o); });
  assert.equal(meshes.length, 1);
  assert.ok(meshes[0].geometry.attributes.position.count > 20);
});

test('train pick colors stay under bloom threshold', () => {
  for (const [k, c] of Object.entries(TR)) assert.ok(luma(c) < 0.85, `${k} ${luma(c).toFixed(3)}`);
});
