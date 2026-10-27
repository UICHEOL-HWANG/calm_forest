import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HOMI_SKIN_OF, homiSkinOf } from '../js/cosmetics/homi-skin-rules.js';
import { HOE_SKINS } from '../js/forage/hoe-skins.js';
import { readFileSync } from 'node:fs';
import { SLOTS, itemsOf, findItem } from '../js/cosmetics/catalog.js';
import { emptyCosmetics } from '../js/cosmetics/equip.js';
import { wardrobeTabVisible } from '../js/cosmetics/wardrobe.js';
import { PRICE_IDS } from '../js/shop/price-ids.js';
import { BUNDLES, bundleById, bundleGrant, bundleCardMode, bundleCopy, BUNDLE_COPY } from '../js/shop/bundles.js';
import { revealModeOf, revealCardOf, REVEAL_COPY } from '../js/shop/reveal-pose.js';
import { ledgerRows, priceIndex } from '../functions/api/_paddle.js';
import { buildPlan } from '../scripts/lib/paddle-seed.mjs';
import { shopRows, bundleShopRows, SLOT_KO } from '../scripts/lib/shop-rows.mjs';
import { SHOP_COPY } from '../scripts/lib/shop-copy.mjs';
import { EN } from '../js/i18n-en.js';

test('homiSkinOf maps the equipped homi item to its hoe skin', () => {
  assert.equal(homiSkinOf({ equipped: { homi: 'homi_najeon' } }), 'najeon');
  assert.equal(homiSkinOf({ equipped: { homi: 'homi_coral' } }), 'coral');
  assert.equal(homiSkinOf({ equipped: { homi: 'homi_whale' } }), 'whale');
  assert.equal(homiSkinOf({ equipped: { homi: null } }), null);
  assert.equal(homiSkinOf({ equipped: { homi: 'toString' } }), null);
  assert.equal(homiSkinOf({ equipped: { homi: 'tools_moon' } }), null);
  assert.equal(homiSkinOf({ equipped: {} }), null);
  assert.equal(homiSkinOf(null), null);
  assert.equal(homiSkinOf(undefined), null);
});

test('every homi skin id exists in the hoe art', () => {
  assert.ok(Object.isFrozen(HOMI_SKIN_OF));
  for (const skin of Object.values(HOMI_SKIN_OF)) assert.ok(HOE_SKINS.includes(skin), skin);
});

const HOMI_IDS = ['homi_najeon', 'homi_coral', 'homi_whale'];
const trio = bundleById('homi_trio');
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

test('homi slot holds three cash-only skins at 1,500 won', () => {
  assert.ok(SLOTS.includes('homi'));
  assert.deepEqual(itemsOf('homi').filter(i => !i.set).map(i => i.id), HOMI_IDS);
  assert.deepEqual(Object.keys(HOMI_SKIN_OF), [...HOMI_IDS, 'homi_mudset']);
  for (const id of HOMI_IDS) {
    const it = findItem(id);
    assert.equal(it.premium, true);
    assert.equal(it.price.won, 1500);
    assert.equal(it.price.coins, null);
    assert.equal(it.price.cash.label, '₩1,500');
    assert.equal(it.price.cash.priceId, PRICE_IDS[id]);
    assert.ok(EN[it.name], it.name);
  }
  assert.equal(findItem('mudflat_set'), null);
  assert.equal(PRICE_IDS.mudflat_set, 'pri_01m5yj5rg2kebcpax83hckb2k1');
});

test('live price ids are wired for the three skins and the trio', () => {
  assert.equal(PRICE_IDS.homi_najeon, 'pri_01m5yj5pa4wkbkss123en74c71');
  assert.equal(PRICE_IDS.homi_coral, 'pri_01m5yj5pycvkeec9x65fm1zyvr');
  assert.equal(PRICE_IDS.homi_whale, 'pri_01m5yj5qewvy1rn6r3qjs0maca');
  assert.equal(PRICE_IDS.homi_trio, 'pri_01m5yj5qzq2thcttma947mxtht');
  assert.deepEqual(priceIndex().get(PRICE_IDS.homi_trio), { itemId: 'homi_trio', kind: 'bundle' });
  assert.deepEqual(priceIndex().get(PRICE_IDS.homi_coral), { itemId: 'homi_coral', kind: 'cosmetic' });
});

test('wardrobe homi tab: always on web, elsewhere only once something is owned', () => {
  assert.equal(wardrobeTabVisible('homi', emptyCosmetics(), 'web'), true);
  assert.equal(wardrobeTabVisible('homi', emptyCosmetics(), 'toss'), false);
  const owning = { owned: ['homi_whale'], equipped: { ...emptyCosmetics().equipped, homi: 'homi_whale' } };
  for (const p of ['toss', 'android', 'ios', 'itch']) assert.equal(wardrobeTabVisible('homi', owning, p), true, p);
});

test('homi_trio is a fixed-only bundle that grants all three skins', () => {
  assert.equal(trio.won, 3500);
  assert.deepEqual([...trio.fixed], HOMI_IDS);
  assert.deepEqual([...trio.choose], []);
  assert.equal(trio.listWon, 4500);
  assert.deepEqual(bundleGrant(trio, undefined), HOMI_IDS);
  assert.deepEqual(bundleGrant(trio, 'tools_moon'), HOMI_IDS);
  assert.ok(bundleGrant(trio, null).every(Boolean));
  assert.equal(bundleCopy(trio).title, '호미 스킨 3종 묶음');
  assert.equal(bundleCopy(bundleById('welcome_box')), BUNDLE_COPY);
  for (const ko of Object.values(bundleCopy(trio))) {
    assert.ok(EN[ko], ko);
    assert.ok(!ko.includes('—'), ko);
  }
});

const ctx = (over = {}) => ({ owned: [], platform: 'web', online: true, isGuest: false, tokenSet: true, storeOpen: true, ...over });

test('homi_trio card: normal web gating, hidden once any skin is owned', () => {
  assert.equal(bundleCardMode(trio, ctx()), 'buy');
  assert.equal(bundleCardMode(trio, ctx({ isGuest: true })), 'login');
  assert.equal(bundleCardMode(trio, ctx({ online: false })), 'unavailable');
  for (const platform of ['toss', 'android', 'ios', 'itch']) assert.equal(bundleCardMode(trio, ctx({ platform })), 'hidden', platform);
  assert.equal(bundleCardMode(trio, ctx({ tokenSet: false })), 'hidden');
  assert.equal(bundleCardMode(trio, ctx({ storeOpen: false })), 'hidden');
  assert.equal(bundleCardMode(trio, ctx({ priceId: null })), 'hidden');
  for (const id of HOMI_IDS) assert.equal(bundleCardMode(trio, ctx({ owned: [id] })), 'hidden', id);
  assert.equal(bundleCardMode(trio, ctx({ owned: ['firefly'] })), 'buy');
});

test('webhook: one homi_trio payment books a marker row plus three cosmetic rows', () => {
  const uid = '3f2b1c9e-8a7d-4e6f-9b0a-1c2d3e4f5a6b';
  const pid = PRICE_IDS.homi_trio;
  const { rows, skipped } = ledgerRows({
    event_type: 'transaction.completed', occurred_at: '2026-10-27T01:02:03.000Z',
    data: { id: 'txn_h', currency_code: 'KRW', custom_data: { user_id: uid, item_id: 'homi_trio', kind: 'bundle' },
            details: { totals: { total: '3500' } }, items: [{ price: { id: pid }, quantity: 1 }] },
  });
  assert.deepEqual(skipped, []);
  assert.deepEqual(rows.map(r => [r.event_id, r.item_id, r.kind, r.amount]), [
    [`txn_h:${pid}`, 'homi_trio', 'bundle', 3500],
    [`txn_h:${pid}:homi_najeon`, 'homi_najeon', 'cosmetic', null],
    [`txn_h:${pid}:homi_coral`, 'homi_coral', 'cosmetic', null],
    [`txn_h:${pid}:homi_whale`, 'homi_whale', 'cosmetic', null],
  ]);
  for (const r of rows) assert.equal(r.user_id, uid);
});

test('purchase reveal: homi items use the box burst with their own card and copy', () => {
  for (const id of HOMI_IDS) {
    const it = findItem(id);
    assert.equal(revealModeOf(it), 'boxburst');
    assert.equal(revealCardOf(it).tag, 'PREMIUM · 호미');
    assert.ok(REVEAL_COPY[id].name && REVEAL_COPY[id].desc);
    assert.ok(EN[REVEAL_COPY[id].desc], id);
  }
  assert.ok(EN[revealCardOf(findItem('homi_coral')).cta]);
});

test('paddle seed and /shop rows describe homi items and the trio', () => {
  const plan = buildPlan(itemsOf('homi'), [], BUNDLES);
  const by = Object.fromEntries(plan.map(p => [p.itemId, p]));
  for (const id of HOMI_IDS) assert.equal(by[id].amount, '1500');
  assert.match(by.homi_najeon.description, /호미 스킨/);
  assert.equal(by.homi_trio.name, '호미 스킨 3종 묶음');
  assert.equal(by.homi_trio.amount, '3500');
  assert.equal(by.welcome_box.name, '숲 환영 상자');
  assert.equal(SLOT_KO.homi, '🪏 호미');
  assert.ok(shopRows(itemsOf('homi')).every(r => r.includes('🪏 호미') && r.includes('₩1,500')));
  const [, trioRow] = bundleShopRows(BUNDLES);
  assert.match(trioRow, /호미 스킨 3종 묶음/);
  assert.match(trioRow, /₩3,500/);
  for (const id of HOMI_IDS) {
    assert.ok(SHOP_COPY[id].length > 10);
    assert.ok(!SHOP_COPY[id].includes('—'));
    assert.match(SHOP_COPY[id], /캐는 성능은 그대로예요/);
  }
});

test('newest premium guard migration lists the homi skins', () => {
  const sql = read('sql/migrations/migrate_homi_skins.sql');
  for (const id of HOMI_IDS) assert.match(sql, new RegExp(`'${id}'`));
  assert.match(sql, /^begin;/);
  assert.match(sql, /revoke all on function public\._premium_cosmetic_ids\(\)/);
});

test('shop and wardrobe wiring: homi tab, hoe showcase, trio card, setCosTab', () => {
  const cafe = read('js/spaces/cafe.js');
  assert.match(cafe, /cosPreview\?\.showHomi\(cosTab === 'homi'\)/);
  assert.match(cafe, /hoeSkin \? \(\) => buildHoeShowcase\(hoeSkin\)/);
  assert.match(cafe, /drawTabBundles\(box, cosTab\)/);
  assert.match(cafe, /export function setCosTab\(id\)/);
  assert.match(read('js/spaces/wardrobe.js'), /preview\?\.showHomi\(slot === 'homi'\)/);
  const game = read('js/game.js');
  assert.match(game, /export function buildHoeShowcase\(skin\)/);
  assert.match(game, /setCosTab\(id\) \{ setCosTab\(id\); \}/);
  assert.match(game, /return \{ setAnimal, resize, refresh, showPet, showTrail, showTools, showHomi, stop, start \}/);
});
