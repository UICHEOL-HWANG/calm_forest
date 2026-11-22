import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three/three.module.js';
import { findItem } from '../js/cosmetics/catalog.js';
import { shopRows } from '../js/cosmetics/sprout.js';
import { ownedIn } from '../js/cosmetics/wardrobe.js';
import { buildCosmetic } from '../js/cosmetics/art.js';
import { buildTrailMark } from '../js/cosmetics/trail.js';
import { KN, BEANIE_TOP, POM_R, POM_Y } from '../js/cosmetics/art-knit-pick.js';
import { sideAnchor } from '../js/cosmetics/anchors.js';

const IDS = ['kn_beanie', 'kn_scarf', 'kn_yarn_pack', 'kn_yarn_trail'];
const PRICES = [1200, 1000, 1500, 1600];
const bs = [0.9, 1.08, 0.9], R = 0.52, bodyY = R * bs[1] + 0.02;
const K = { R, HR: 0.37, HY: 1.26, bs, bodyY, side: sideAnchor(bs, R, bodyY), neckR: 0.37 * 0.92 };
const luma = h => (0.2126 * ((h >> 16) & 255) + 0.7152 * ((h >> 8) & 255) + 0.0722 * (h & 255)) / 255;

test('knit pick cosmetics are in the catalog with group daily and coin prices', () => {
  IDS.forEach((id, i) => {
    const it = findItem(id);
    assert.ok(it, id);
    assert.equal(it.group, 'daily');
    assert.equal(it.price.coins, PRICES[i], id);
    assert.ok(!it.premium);
  });
  assert.deepEqual(IDS.map(id => findItem(id).slot), ['head', 'neck', 'back', 'trail']);
  assert.equal(findItem('kn_yarn_pack').anchor, 'back');
  assert.equal(findItem('kn_yarn_trail').tier, '특별');
  assert.equal(findItem('kn_beanie').earSafe, 'dome');
});

test('normal shop tabs never list knit pick items, wardrobe does once owned', () => {
  for (const slot of ['head', 'neck', 'back', 'trail']) assert.ok(!shopRows(slot).some(i => IDS.includes(i.id)), slot);
  assert.ok(ownedIn({ owned: IDS, equipped: {} }, 'back').some(i => i.id === 'kn_yarn_pack'));
});

test('knit pick wearables build merged meshes', () => {
  for (const id of IDS.slice(0, 3)) {
    const g = buildCosmetic(THREE, id, K);
    assert.ok(g, id);
    let n = 0; g.traverse(o => { if (o.isMesh) n++; });
    assert.ok(n >= 1 && n <= 8, `${id} ${n}`);
    assert.ok(g.children.every(c => c.isMesh), `${id}: nested groups block merging`);
  }
});

test('beanie bottom clears the cat ear base and the chick comb tip stays outside the pom-pom', () => {
  const box = new THREE.Box3().setFromObject(buildCosmetic(THREE, 'kn_beanie', K));
  assert.ok(box.min.y >= K.HR * 0.47, String(box.min.y / K.HR));
  const comb = new THREE.Vector3(0, 1.14, 0.05), pomC = new THREE.Vector3(0, POM_Y, -0.02);
  assert.ok(comb.distanceTo(pomC) > POM_R, `${comb.distanceTo(pomC)} vs ${POM_R}`);
  assert.ok(POM_Y - BEANIE_TOP < POM_R, 'pom-pom sits on the crown');
});

test('yarn pack sits at the waist for the chick feather tail and keeps other heights', () => {
  const box = tail => new THREE.Box3().setFromObject(buildCosmetic(THREE, 'kn_yarn_pack', { ...K, tail: { type: tail } }));
  const chick = box('feather'), fox = box('bushy');
  assert.ok(chick.min.y < fox.min.y - R * 0.45, String(chick.min.y));
  assert.ok(chick.max.y <= fox.max.y);
  assert.ok(box('curl').max.y > fox.max.y && fox.max.y > box('stub').max.y);
});

test('yarn trail bakes into one mesh', () => {
  const g = buildTrailMark(THREE, 'kn_yarn_trail', 1);
  const meshes = []; g.traverse(o => { if (o.isMesh) meshes.push(o); });
  assert.equal(meshes.length, 1);
  assert.ok(meshes[0].geometry.attributes.position.count > 20);
});

test('knit pick colors stay under bloom threshold', () => {
  for (const [k, c] of Object.entries(KN)) assert.ok(luma(c) < 0.85, `${k} ${luma(c).toFixed(3)}`);
});
