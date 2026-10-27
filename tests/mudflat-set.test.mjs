import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from '../vendor/three/three.module.js';
import { findItem } from '../js/cosmetics/catalog.js';
import { homiSkinOf } from '../js/cosmetics/homi-skin-rules.js';
import { PRICE_IDS } from '../js/shop/price-ids.js';
import { bundleById, bundleGrant, bundleCardMode } from '../js/shop/bundles.js';
import { premiumRowMode, gatedRow } from '../js/shop/premium-row.js';
import { ledgerRows } from '../functions/api/_paddle.js';
import { MUD_GEAR, buildMudGear, stepBoots } from '../js/forage/mudflat-set-art.js';

const read = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const set = bundleById('mudflat_set');
const K = { R: .55, bs: [1, 1.05, 1], bodyY: .6 };
const mat = c => new THREE.MeshStandardMaterial({ color: c });

test('the mudflat set is a 3,900 won bundle of the mud hoe and the basket with boots', () => {
  assert.equal(set.won, 3900);
  assert.deepEqual(bundleGrant(set), ['homi_mudset', MUD_GEAR]);
  assert.equal(PRICE_IDS.mudflat_set, 'pri_01m5yj5rg2kebcpax83hckb2k1');
  assert.equal(findItem('homi_mudset').slot, 'homi');
  assert.equal(findItem(MUD_GEAR).slot, 'back');
  assert.equal(findItem(MUD_GEAR).anchor, 'root');
  assert.equal(homiSkinOf({ equipped: { homi: 'homi_mudset' } }), 'mudset');
});

test('set parts are never sold alone and only show once owned', () => {
  for (const id of ['homi_mudset', MUD_GEAR]) {
    const it = findItem(id);
    assert.equal(it.premium, undefined);
    assert.equal(it.price.cash, null);
    assert.ok(!(id in PRICE_IDS));
    assert.ok(gatedRow(it));
    const ctx = { platform: 'web', online: true, isGuest: false, tokenSet: true, storeOpen: true };
    assert.equal(premiumRowMode(it, { ...ctx, owned: false }), 'hidden');
    assert.equal(premiumRowMode(it, { ...ctx, owned: true }), 'owned');
  }
});

test('the set card hides once either part is owned and off the web', () => {
  const ctx = (o = {}) => ({ owned: [], platform: 'web', online: true, isGuest: false, tokenSet: true, storeOpen: true, ...o });
  assert.equal(bundleCardMode(set, ctx()), 'buy');
  assert.equal(bundleCardMode(set, ctx({ owned: ['homi_mudset'] })), 'hidden');
  assert.equal(bundleCardMode(set, ctx({ owned: [MUD_GEAR] })), 'hidden');
  assert.equal(bundleCardMode(set, ctx({ platform: 'ios' })), 'hidden');
});

test('webhook books the set and both parts', () => {
  const uid = '3f2b1c9e-8a7d-4e6f-9b0a-1c2d3e4f5a6b', pid = PRICE_IDS.mudflat_set;
  const { rows, skipped } = ledgerRows({
    event_type: 'transaction.completed', occurred_at: '2026-10-27T01:02:03.000Z',
    data: { id: 'txn_m', currency_code: 'KRW', custom_data: { user_id: uid, item_id: 'mudflat_set', kind: 'bundle' },
            details: { totals: { total: '3900' } }, items: [{ price: { id: pid }, quantity: 1 }] },
  });
  assert.deepEqual(skipped, []);
  assert.deepEqual(rows.map(r => [r.item_id, r.kind, r.amount]), [
    ['mudflat_set', 'bundle', 3900], ['homi_mudset', 'cosmetic', null], [MUD_GEAR, 'cosmetic', null],
  ]);
});

test('the server guard protects both parts', () => {
  const sql = read('sql/migrations/migrate_homi_skins.sql');
  for (const id of ['homi_mudset', MUD_GEAR]) assert.ok(sql.includes(`'${id}'`), id);
});

test('boots stay on the ground while the body hops and step one at a time', () => {
  const g = buildMudGear(THREE, mat, K), boots = g.userData.boots;
  assert.equal(boots.children.length, 2);
  stepBoots(boots, 0, false, .05);
  for (const b of boots.children) assert.ok(Math.abs(b.position.y - (b.userData.baseY - .05)) < 1e-9);
  stepBoots(boots, Math.PI / 2, true, .07);
  const [l, r] = boots.children.map(b => b.position.y - (b.userData.baseY - .07));
  assert.ok(l > .09 && Math.abs(r) < 1e-9, 'left lifts, right stays down');
  for (const b of boots.children) assert.ok(Math.abs(b.position.z) < K.R * K.bs[2] * .2, 'under the body, not in front');
});

test('the character wears the gear and waddles only while the boots are on', () => {
  const game = read('js/game.js');
  assert.match(game, /root: \{ x: 0, y: 0, z: 0 \}/);
  assert.equal((game.match(/it\.id === MUD_GEAR \? buildMudGear\(THREE, clayMat, /g) || []).length, 2);
  assert.match(game, /Math\.abs\(Math\.sin\(walkPhase\)\) \* \(mudBoots \? 0\.07 : 0\.18\)/);
  assert.match(game, /if \(mudBoots\) stepBoots\(mudBoots, walkPhase, moving, playerAnchor\.position\.y\);/);
});

test('boots are corrected after every body move in the frame and reset on the boat', () => {
  const game = read('js/game.js');
  const body = game.slice(game.indexOf('function updatePlayer('), game.indexOf('\n}\n', game.indexOf('function updatePlayer(')) + 3);
  assert.ok(body.trimEnd().endsWith('if (mudBoots) stepBoots(mudBoots, walkPhase, moving, playerAnchor.position.y);\n}'));
  assert.match(body, /if \(mudBoots\) stepBoots\(mudBoots, 0, false, playerAnchor\.position\.y\);\n    return updateBoatRun/);
});

test('rebuilding the gear frees the old geometry and reuses materials', () => {
  assert.match(read('js/game.js'), /disposeSkin\(charAnchors\.root\);\n  for \(const a of Object\.values\(charAnchors\)\) a\.clear\(\);/);
  const a = buildMudGear(THREE, mat, K), b = buildMudGear(THREE, mat, K);
  const meshes = g => { const out = []; g.traverse(o => o.isMesh && out.push(o)); return out; };
  assert.ok(meshes(a).every(o => o.userData.skinOwned));
  assert.equal(meshes(a)[0].material, meshes(b)[0].material);
});
