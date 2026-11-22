import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three/three.module.js';
import { findItem } from '../js/cosmetics/catalog.js';
import { shopRows } from '../js/cosmetics/sprout.js';
import { ownedIn } from '../js/cosmetics/wardrobe.js';
import { buildCosmetic } from '../js/cosmetics/art.js';
import { buildTrailMark } from '../js/cosmetics/trail.js';
import { FP } from '../js/cosmetics/art-forest-pick.js';
import { sideAnchor } from '../js/cosmetics/anchors.js';

const IDS = ['fp_squirrel_band', 'fp_owl_kerchief', 'fp_hedgehog_pack', 'fp_acorn_trail'];
const PRICES = [1200, 1000, 1500, 1600];
const bs = [0.9, 1.08, 0.9], R = 0.52, bodyY = R * bs[1] + 0.02;
const K = { R, HR: 0.37, HY: 1.26, bs, bodyY, side: sideAnchor(bs, R, bodyY), neckR: 0.37 * 0.92 };
const luma = h => (0.2126 * ((h >> 16) & 255) + 0.7152 * ((h >> 8) & 255) + 0.0722 * (h & 255)) / 255;

test('forest pick cosmetics are in the catalog with group daily and coin prices', () => {
  IDS.forEach((id, i) => {
    const it = findItem(id);
    assert.ok(it, id);
    assert.equal(it.group, 'daily');
    assert.equal(it.price.coins, PRICES[i], id);
    assert.ok(!it.premium);
  });
  assert.deepEqual(IDS.map(id => findItem(id).slot), ['head', 'neck', 'back', 'trail']);
  assert.equal(findItem('fp_squirrel_band').earSafe, 'low');
  assert.equal(findItem('fp_hedgehog_pack').anchor, 'back');
  assert.equal(findItem('fp_acorn_trail').tier, '특별');
});

test('normal shop tabs never list forest pick items, wardrobe does once owned', () => {
  for (const slot of ['head', 'neck', 'back', 'trail']) {
    assert.ok(!shopRows(slot).some(i => IDS.includes(i.id)), slot);
  }
  assert.ok(ownedIn({ owned: IDS, equipped: {} }, 'back').some(i => i.id === 'fp_hedgehog_pack'));
});

test('forest pick wearables build merged meshes', () => {
  for (const id of IDS.slice(0, 3)) {
    const g = buildCosmetic(THREE, id, K);
    assert.ok(g, id);
    let n = 0; g.traverse(o => { if (o.isMesh) n++; });
    assert.ok(n >= 1 && n <= 8, `${id} ${n}`);
    assert.ok(g.children.every(c => c.isMesh), `${id}: nested groups block merging`);
  }
});

test('acorn trail bakes into one mesh', () => {
  const g = buildTrailMark(THREE, 'fp_acorn_trail', 1);
  const meshes = []; g.traverse(o => { if (o.isMesh) meshes.push(o); });
  assert.equal(meshes.length, 1);
  assert.ok(meshes[0].geometry.attributes.position.count > 50);
});

test('forest pick colors stay under bloom threshold', () => {
  for (const [k, c] of Object.entries(FP)) assert.ok(luma(c) < 0.85, `${k} ${luma(c).toFixed(3)}`);
});

test('도구 세트 4종은 코인 오늘의 꾸미기 전용, 테마가 연결된다', async () => {
  const { findItem } = await import('../js/cosmetics/catalog.js');
  const { shopRows } = await import('../js/cosmetics/sprout.js');
  const { themeOf } = await import('../js/cosmetics/tool-skin-rules.js');
  const { DAILY_PICK_POOL } = await import('../js/data/daily-pick.js');
  for (const id of ['tools_snowman', 'tools_squirrel', 'tools_candy', 'tools_octopus']) {
    const it = findItem(id);
    assert.ok(it, id);
    assert.equal(it.slot, 'tools');
    assert.equal(it.group, 'daily');
    assert.equal(it.premium, undefined);
    assert.equal(it.price.coins, DAILY_PICK_POOL.find(p => p.id === id).price);
    assert.equal(themeOf(id), id.slice(6));
    assert.ok(!shopRows('tools').some(r => r.id === id));
  }
});
