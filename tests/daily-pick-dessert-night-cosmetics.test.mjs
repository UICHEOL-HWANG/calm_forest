import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three/three.module.js';
import { findItem } from '../js/cosmetics/catalog.js';
import { shopRows } from '../js/cosmetics/sprout.js';
import { ownedIn } from '../js/cosmetics/wardrobe.js';
import { buildCosmetic } from '../js/cosmetics/art.js';
import { buildTrailMark } from '../js/cosmetics/trail.js';
import { DS, packY } from '../js/cosmetics/art-dessert-pick.js';
import { NS } from '../js/cosmetics/art-night-pick.js';
import { sideAnchor } from '../js/cosmetics/anchors.js';

const SETS = {
  ds: ['ds_cake_hat', 'ds_macaron_brooch', 'ds_cupcake_pack', 'ds_cream_trail'],
  ns: ['ns_moon_pin', 'ns_galaxy_scarf', 'ns_star_lantern_pack', 'ns_meteor_trail'],
};
const IDS = [...SETS.ds, ...SETS.ns];
const PRICES = [1200, 1000, 1500, 1600];
const bs = [0.9, 1.08, 0.9], R = 0.52, bodyY = R * bs[1] + 0.02;
const K = { R, HR: 0.37, HY: 1.26, bs, bodyY, side: sideAnchor(bs, R, bodyY), neckR: 0.37 * 0.92 };
const luma = h => (0.2126 * ((h >> 16) & 255) + 0.7152 * ((h >> 8) & 255) + 0.0722 * (h & 255)) / 255;

test('dessert and night pick cosmetics are in the catalog with group daily and coin prices', () => {
  for (const ids of Object.values(SETS)) {
    ids.forEach((id, i) => {
      const it = findItem(id);
      assert.ok(it, id);
      assert.equal(it.group, 'daily');
      assert.equal(it.price.coins, PRICES[i], id);
      assert.ok(!it.premium);
    });
    assert.deepEqual(ids.map(id => findItem(id).slot), ['head', 'neck', 'back', 'trail']);
    assert.equal(findItem(ids[0]).earSafe, 'low');
    assert.equal(findItem(ids[2]).anchor, 'back');
    assert.equal(findItem(ids[3]).tier, '특별');
  }
});

test('normal shop tabs never list dessert or night pick items, wardrobe does once owned', () => {
  for (const slot of ['head', 'neck', 'back', 'trail']) {
    assert.ok(!shopRows(slot).some(i => IDS.includes(i.id)), slot);
  }
  const back = ownedIn({ owned: IDS, equipped: {} }, 'back').map(i => i.id);
  assert.ok(back.includes('ds_cupcake_pack') && back.includes('ns_star_lantern_pack'));
});

test('dessert and night pick wearables build merged meshes', () => {
  for (const id of [...SETS.ds.slice(0, 3), ...SETS.ns.slice(0, 3)]) {
    const g = buildCosmetic(THREE, id, K);
    assert.ok(g, id);
    let n = 0; g.traverse(o => { if (o.isMesh) n++; });
    assert.ok(n >= 1 && n <= 8, `${id} ${n}`);
    assert.ok(g.children.every(c => c.isMesh), `${id}: nested groups block merging`);
  }
});

test('cupcake pack height follows the tail of each of the 7 animals', () => {
  const tails = { fox: 'bushy', dog: 'curl', rabbit: 'puff', cat: 'long', bear: 'stub', panda: 'stub', chick: 'feather' };
  const want = { fox: 0.74, dog: 0.86, rabbit: 0.66, cat: 0.56, bear: 0.56, panda: 0.56, chick: -0.2 };
  for (const [id, type] of Object.entries(tails)) {
    assert.equal(packY({ tail: { type } }), want[id], id);
    assert.equal(packY({ tail: type }), want[id], id);
  }
  assert.equal(packY({}), 0.56);
  const top = tail => new THREE.Box3().setFromObject(buildCosmetic(THREE, 'ds_cupcake_pack', { ...K, tail: { type: tail } })).max.y;
  assert.ok(top('curl') > top('bushy') && top('bushy') > top('stub'));
});

test('cream and meteor trails bake into one mesh', () => {
  for (const id of ['ds_cream_trail', 'ns_meteor_trail']) {
    const g = buildTrailMark(THREE, id, 1);
    const meshes = []; g.traverse(o => { if (o.isMesh) meshes.push(o); });
    assert.equal(meshes.length, 1, id);
    assert.ok(meshes[0].geometry.attributes.position.count > 50, id);
  }
});

test('dessert and night pick colors stay under bloom threshold', () => {
  for (const [k, c] of [...Object.entries(DS), ...Object.entries(NS)]) assert.ok(luma(c) < 0.85, `${k} ${luma(c).toFixed(3)}`);
});
