import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three/three.module.js';
import { findItem } from '../js/cosmetics/catalog.js';
import { shopRows } from '../js/cosmetics/sprout.js';
import { ownedIn } from '../js/cosmetics/wardrobe.js';
import { buildCosmetic } from '../js/cosmetics/art.js';
import { buildTrailMark } from '../js/cosmetics/trail.js';
import { XM } from '../js/cosmetics/art-xmas-pick.js';
import { SP } from '../js/cosmetics/art-sea-pick.js';
import { sideAnchor } from '../js/cosmetics/anchors.js';

const SETS = {
  xm: ['xm_antler_band', 'xm_holly_tie', 'xm_gift_pack', 'xm_stardust_trail'],
  sp: ['sp_pirate_scarf', 'sp_anchor_necklace', 'sp_lighthouse_pack', 'sp_wave_trail'],
};
const IDS = [...SETS.xm, ...SETS.sp];
const PRICES = [1200, 1000, 1500, 1600];
const bs = [0.9, 1.08, 0.9], R = 0.52, bodyY = R * bs[1] + 0.02;
const K = { R, HR: 0.37, HY: 1.26, bs, bodyY, side: sideAnchor(bs, R, bodyY), neckR: 0.37 * 0.92 };
const luma = h => (0.2126 * ((h >> 16) & 255) + 0.7152 * ((h >> 8) & 255) + 0.0722 * (h & 255)) / 255;

test('xmas and sea pick cosmetics are in the catalog with group daily and coin prices', () => {
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
  assert.equal(findItem('xm_antler_band').earSafe, 'low');
  assert.equal(findItem('sp_pirate_scarf').earSafe, 'dome');
});

test('normal shop tabs never list xmas or sea pick items, wardrobe does once owned', () => {
  for (const slot of ['head', 'neck', 'back', 'trail']) {
    assert.ok(!shopRows(slot).some(i => IDS.includes(i.id)), slot);
  }
  const back = ownedIn({ owned: IDS, equipped: {} }, 'back').map(i => i.id);
  assert.ok(back.includes('xm_gift_pack') && back.includes('sp_lighthouse_pack'));
});

test('xmas and sea pick wearables build merged meshes', () => {
  for (const id of [...SETS.xm.slice(0, 3), ...SETS.sp.slice(0, 3)]) {
    const g = buildCosmetic(THREE, id, K);
    assert.ok(g, id);
    let n = 0; g.traverse(o => { if (o.isMesh) n++; });
    assert.ok(n >= 1 && n <= 8, `${id} ${n}`);
    assert.ok(g.children.every(c => c.isMesh), `${id}: nested groups block merging`);
  }
});

test('stardust and wave trails bake into one mesh', () => {
  for (const id of ['xm_stardust_trail', 'sp_wave_trail']) {
    const g = buildTrailMark(THREE, id, 1);
    const meshes = []; g.traverse(o => { if (o.isMesh) meshes.push(o); });
    assert.equal(meshes.length, 1, id);
    assert.ok(meshes[0].geometry.attributes.position.count > 50, id);
  }
});

test('xmas and sea pick colors stay under bloom threshold', () => {
  for (const [k, c] of [...Object.entries(XM), ...Object.entries(SP)]) assert.ok(luma(c) < 0.85, `${k} ${luma(c).toFixed(3)}`);
});
