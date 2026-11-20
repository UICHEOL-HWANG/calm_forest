import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three/three.module.js';
import { findItem } from '../js/cosmetics/catalog.js';
import { shopRows } from '../js/cosmetics/sprout.js';
import { ownedIn } from '../js/cosmetics/wardrobe.js';
import { buildCosmetic } from '../js/cosmetics/art.js';
import { buildTrailMark } from '../js/cosmetics/trail.js';
import { WP } from '../js/cosmetics/art-winter-pick.js';
import { sideAnchor } from '../js/cosmetics/anchors.js';
import { DAILY_PICK_POOL } from '../js/data/daily-pick.js';

const IDS = ['wp_pompom_hat', 'wp_knit_scarf', 'wp_firewood', 'wp_boot_trail'];
const bs = [0.9, 1.08, 0.9], R = 0.52, bodyY = R * bs[1] + 0.02;
const K = { R, HR: 0.37, HY: 1.26, bs, bodyY, side: sideAnchor(bs, R, bodyY), neckR: 0.37 * 0.92 };
const luma = h => (0.2126 * ((h >> 16) & 255) + 0.7152 * ((h >> 8) & 255) + 0.0722 * (h & 255)) / 255;

test('daily cosmetics are in the catalog with group daily and pool prices', () => {
  const cos = DAILY_PICK_POOL.filter(p => p.kind === 'cos');
  assert.deepEqual(cos.map(p => p.id), IDS);
  for (const p of cos) {
    const it = findItem(p.id);
    assert.ok(it, p.id);
    assert.equal(it.group, 'daily');
    assert.equal(it.price.coins, p.price, p.id);
    assert.ok(!it.premium);
  }
  assert.deepEqual(IDS.map(id => findItem(id).slot), ['head', 'neck', 'back', 'trail']);
  assert.equal(findItem('wp_pompom_hat').earSafe, 'dome');
  assert.equal(findItem('wp_firewood').anchor, 'back');
});

test('normal shop tabs never list daily items, wardrobe does once owned', () => {
  for (const slot of ['head', 'neck', 'back', 'trail']) {
    assert.ok(!shopRows(slot).some(i => i.group === 'daily'), slot);
  }
  assert.ok(ownedIn({ owned: IDS, equipped: {} }, 'head').some(i => i.id === 'wp_pompom_hat'));
});

test('wearables build merged meshes', () => {
  for (const id of ['wp_pompom_hat', 'wp_knit_scarf', 'wp_firewood']) {
    const g = buildCosmetic(THREE, id, K);
    assert.ok(g, id);
    let n = 0; g.traverse(o => { if (o.isMesh) n++; });
    assert.ok(n >= 1 && n <= 8, `${id} ${n}`);
    assert.ok(g.children.every(c => c.isMesh), `${id}: nested groups block merging`);
  }
});

test('boot trail bakes into one mesh that keeps the heart heel', () => {
  const g = buildTrailMark(THREE, 'wp_boot_trail', 1);
  const meshes = []; g.traverse(o => { if (o.isMesh) meshes.push(o); });
  assert.equal(meshes.length, 1);
  const pos = meshes[0].geometry.attributes.position;
  let top = 0;
  for (let i = 0; i < pos.count; i++) if (Math.abs(pos.getY(i) - 0.012) < 1e-6) top++;
  assert.ok(top >= 9, `heart vertices ${top}`);
});

test('winter pick colors stay under bloom threshold', () => {
  for (const [k, c] of Object.entries(WP)) assert.ok(luma(c) < 0.85, `${k} ${luma(c).toFixed(3)}`);
});
