import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three/three.module.js';
import { findItem } from '../js/cosmetics/catalog.js';
import { shopRows } from '../js/cosmetics/sprout.js';
import { ownedIn } from '../js/cosmetics/wardrobe.js';
import { buildCosmetic } from '../js/cosmetics/art.js';
import { buildTrailMark } from '../js/cosmetics/trail.js';
import { SB } from '../js/cosmetics/art-spring-pick.js';
import { RN } from '../js/cosmetics/art-rain-pick.js';
import { sideAnchor } from '../js/cosmetics/anchors.js';

const SETS = {
  sb: ['sb_blossom_crown', 'sb_petal_ribbon', 'sb_picnic_pack', 'sb_petal_trail'],
  rn: ['rn_rain_hood', 'rn_drop_scarf', 'rn_frog_pack', 'rn_puddle_trail'],
};
const IDS = [...SETS.sb, ...SETS.rn];
const PRICES = [1200, 1000, 1500, 1600];
const bs = [0.9, 1.08, 0.9], R = 0.52, bodyY = R * bs[1] + 0.02;
const K = { R, HR: 0.37, HY: 1.26, bs, bodyY, side: sideAnchor(bs, R, bodyY), neckR: 0.37 * 0.92 };
const luma = h => (0.2126 * ((h >> 16) & 255) + 0.7152 * ((h >> 8) & 255) + 0.0722 * (h & 255)) / 255;

test('spring and rain pick cosmetics are in the catalog with group daily and coin prices', () => {
  for (const ids of Object.values(SETS)) {
    ids.forEach((id, i) => {
      const it = findItem(id);
      assert.ok(it, id);
      assert.equal(it.group, 'daily');
      assert.equal(it.price.coins, PRICES[i], id);
      assert.ok(!it.premium);
    });
    assert.deepEqual(ids.map(id => findItem(id).slot), ['head', 'neck', 'back', 'trail']);
    assert.equal(findItem(ids[2]).anchor, 'back');
    assert.equal(findItem(ids[3]).tier, '특별');
  }
  assert.equal(findItem('sb_blossom_crown').earSafe, 'low');
  assert.equal(findItem('rn_rain_hood').earSafe, 'dome');
});

test('normal shop tabs never list spring or rain pick items, wardrobe does once owned', () => {
  for (const slot of ['head', 'neck', 'back', 'trail']) {
    assert.ok(!shopRows(slot).some(i => IDS.includes(i.id)), slot);
  }
  const back = ownedIn({ owned: IDS, equipped: {} }, 'back').map(i => i.id);
  assert.ok(back.includes('sb_picnic_pack') && back.includes('rn_frog_pack'));
});

test('spring and rain pick wearables build merged meshes', () => {
  for (const id of [...SETS.sb.slice(0, 3), ...SETS.rn.slice(0, 3)]) {
    const g = buildCosmetic(THREE, id, K);
    assert.ok(g, id);
    let n = 0; g.traverse(o => { if (o.isMesh) n++; });
    assert.ok(n >= 1 && n <= 8, `${id} ${n}`);
    assert.ok(g.children.every(c => c.isMesh), `${id}: nested groups block merging`);
  }
});

test('daily packs sit at the waist for the chick feather tail and keep other heights', () => {
  for (const id of ['sb_picnic_pack', 'rn_frog_pack']) {
    const box = tail => new THREE.Box3().setFromObject(buildCosmetic(THREE, id, { ...K, tail: { type: tail } }));
    const chick = box('feather'), fox = box('bushy');
    assert.ok(chick.min.y < fox.min.y - R * 0.5, `${id} ${chick.min.y}`);
    assert.ok(chick.max.y <= fox.max.y, id);
    assert.ok(box('curl').max.y > fox.max.y && fox.max.y > box('stub').max.y, id);
  }
});

test('petal and puddle trails bake into one mesh', () => {
  for (const id of ['sb_petal_trail', 'rn_puddle_trail']) {
    const g = buildTrailMark(THREE, id, 1);
    const meshes = []; g.traverse(o => { if (o.isMesh) meshes.push(o); });
    assert.equal(meshes.length, 1, id);
    assert.ok(meshes[0].geometry.attributes.position.count > 50, id);
  }
});

test('spring and rain pick colors stay under bloom threshold', () => {
  for (const [k, c] of [...Object.entries(SB), ...Object.entries(RN)]) assert.ok(luma(c) < 0.85, `${k} ${luma(c).toFixed(3)}`);
});
