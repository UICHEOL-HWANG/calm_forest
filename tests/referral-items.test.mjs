// tests/referral-items.test.mjs — 🤝 추천 보상 4종: 카탈로그 · 판매 숨김 · 원장 → 소유 · SQL 목록 일치
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ITEMS, findItem } from '../js/cosmetics/catalog.js';
import { canBuy, emptyCosmetics } from '../js/cosmetics/equip.js';
import { themeOf } from '../js/cosmetics/tool-skin-rules.js';
import { premiumRowMode } from '../js/shop/premium-row.js';
import { applyPurchases } from '../js/shop/entitlements.js';
import { REWARD_DECOR } from '../js/data/reward-decor.js';

const SQL = readFileSync(new URL('../sql/migrations/migrate_referrals.sql', import.meta.url), 'utf8');
const ids = (body) => [...body.matchAll(/'([a-z_]+)'/g)].map(m => m[1]);

test('꾸미기 3종 — 추천 전용(reward), 현금 상품(premium) 아님, 가격 없음', () => {
  const pin = findItem('friend_pin'), wing = findItem('friend_wing'), star = findItem('tools_star');
  assert.equal(pin.slot, 'head'); assert.equal(pin.earSafe, 'low');
  assert.equal(wing.slot, 'back'); assert.equal(wing.anchor, 'back');
  assert.equal(star.slot, 'tools');
  for (const it of [pin, wing, star]) {
    assert.equal(it.reward, 'referral', it.id);
    assert.equal(!!it.premium, false, `${it.id} — Paddle·가격 페이지에 끼면 안 된다`);
    assert.deepEqual(it.price, { coins: null, won: null, cash: null }, it.id);
    assert.equal(canBuy(emptyCosmetics(), 999999, it.id).ok, false, `${it.id} 은 코인으로 못 산다`);
  }
  assert.equal(themeOf('tools_star'), 'star');
});

test('상점 — 안 받은 추천 보상은 어떤 플랫폼에서도 행이 없다 · 받았으면 보유로 보인다', () => {
  const ctx = { owned: false, platform: 'web', online: true, isGuest: false, tokenSet: true, storeOpen: true, now: Date.now() };
  for (const id of ['friend_pin', 'friend_wing', 'tools_star']) {
    assert.equal(premiumRowMode(findItem(id), ctx), 'hidden', id);
    assert.equal(premiumRowMode(findItem(id), { ...ctx, owned: true, platform: 'toss' }), 'owned', id);
  }
});

test('야외 장식 무지개 우정 아치 — 작업대 비판매(hidden) · 추천 보상', () => {
  const arch = REWARD_DECOR.find(d => d.id === 'friendarch');
  assert.ok(arch);
  assert.equal(arch.hidden, true);
  assert.equal(arch.reward, 'referral');
  const cat = readFileSync(new URL('../js/data/catalog.js', import.meta.url), 'utf8');
  assert.match(cat, /^\s*\.\.\.REWARD_DECOR,/m, 'OUTDOOR 가 보상 장식을 펼쳐 넣는다');
});

const gs = (o = {}) => ({
  cosmetics: { owned: [], equipped: { head: null, neck: null, back: null, trail: null, skin: null, tools: null } },
  pets: {}, pet: null, cashOwned: [], outdoor: [], outdoorStored: {}, ...o,
});
const row = (item_id, revoked_at = null) => ({ item_id, kind: 'x', revoked_at });

test('원장 → 소유: 꾸미기는 owned, 아치는 🧺 보관함에 1개', () => {
  const r = applyPurchases(gs({ outdoorStored: { bench: 2 } }), [row('tools_star'), row('friendarch')]);
  assert.deepEqual(r.granted, [{ item_id: 'tools_star', kind: 'cosmetic' }, { item_id: 'friendarch', kind: 'decor' }]);
  assert.deepEqual(r.patch.cosmetics.owned, ['tools_star']);
  assert.deepEqual(r.patch.outdoorStored, { bench: 2, friendarch: 1 });
  assert.deepEqual(r.patch.cashOwned, ['tools_star', 'friendarch']);
});

test('원장 → 소유: 꾸미기만 오가면 patch 에 outdoor·outdoorStored 를 싣지 않는다(배열 교체 방지)', () => {
  const r = applyPurchases(gs(), [row('tools_star')]);
  assert.ok(!('outdoor' in r.patch) && !('outdoorStored' in r.patch));
});

test('원장 → 소유: 이미 마당에 세운 아치는 보관함에 또 넣지 않는다', () => {
  const r = applyPurchases(gs({ outdoor: [{ id: 'friendarch', x: 1, z: 2 }] }), [row('friendarch')]);
  assert.deepEqual(r.patch.outdoorStored, {});
  assert.deepEqual(r.patch.outdoor, [{ id: 'friendarch', x: 1, z: 2 }]);
});

test('원장 → 소유: 아치 회수는 마당·보관함 둘 다에서 뺀다', () => {
  const r = applyPurchases(gs({ outdoor: [{ id: 'friendarch', x: 1, z: 2 }, { id: 'fence', x: 0, z: 0 }], outdoorStored: { friendarch: 1 }, cashOwned: ['friendarch'] }),
    [row('friendarch', '2026-10-09T00:00:00Z')]);
  assert.deepEqual(r.revoked, [{ item_id: 'friendarch', kind: 'decor' }]);
  assert.deepEqual(r.patch.outdoor, [{ id: 'fence', x: 0, z: 0 }]);
  assert.deepEqual(r.patch.outdoorStored, {});
});

test('SQL — 단계 보상 · 웰컴 · 장식 가드 목록이 카탈로그와 맞는다', () => {
  const tiers = SQL.match(/_referral_tiers\(\)[\s\S]*?values ([^\n]*)/)[1];
  assert.deepEqual([...tiers.matchAll(/\((\d), '([a-z_]+)', '([a-z]+)'\)/g)].map(m => [+m[1], m[2], m[3]]),
    [[1, 'tools_star', 'cosmetic'], [3, 'friendarch', 'decor'], [5, 'friend_wing', 'cosmetic']]);
  assert.match(SQL, /'friend_pin', 'cosmetic', 'referral'/);
  const decor = SQL.match(/_reward_decor_ids\(\)[\s\S]*?array\[([\s\S]*?)\]::text\[\]/)[1];
  assert.deepEqual(ids(decor), REWARD_DECOR.map(d => d.id));
  const rewardItems = ITEMS.filter(i => i.reward).map(i => i.id).sort();
  assert.deepEqual(rewardItems, ['friend_pin', 'friend_wing', 'tools_star']);
});
