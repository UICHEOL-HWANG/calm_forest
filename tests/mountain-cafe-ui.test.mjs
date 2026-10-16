import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buyCafe } from '../js/mountain/cafe-shop.js';
import { EN } from '../js/i18n-en.js';

globalThis.location = { search: '?lang=en', hostname: 'localhost', href: 'http://localhost/', reload() {} };
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
try { globalThis.navigator ??= { language: 'en-US', userAgent: 'node' }; } catch {}
const { applyCafeResult, CAFE_COPY } = await import('../js/mountain/cafe-ui.js');

const st = { coins: 2000, cos: { owned: [], equipped: {} }, hut: { sleds: ['basic'], sled: 'basic' }, perfect: false };
const gs = () => ({ inventory: { coins: 2000 }, cosmetics: { owned: [], equipped: {} }, mountain: { sled: {}, hut: { sleds: ['basic'], sled: 'basic' } }, house: { stored: {} }, outdoorStored: {} });

test('copy matches the spec table', () => {
  assert.deepEqual({ ...CAFE_COPY }, {
    title: '☕ 산장 카페', drink: '☕ 몸이 따뜻해졌어요', sled: '🛷 다음 판부터 이 썰매를 타요',
    gift: '🧺 보관함에 넣어 뒀어요', poor: '코인이 모자라요', close: '닫기',
  });
  for (const ko of ['☕ 산장 카페', '☕ 몸이 따뜻해졌어요', '🛷 다음 판부터 이 썰매를 타요', '🧺 보관함에 넣어 뒀어요', '🏁 깃발 12개 모두 지나 완주하면 열려요', '타기', '타는 중', '☕ 음료', '🧣 꾸미기', '🏔️ 기념품', '코코아', '유자차', '기본 썰매', '하늘 썰매', '숲 썰매', '별밤 썰매', '털 귀마개', '눈송이 발자국', '등에 멘 작은 썰매']) assert.ok(EN[ko], ko);
});

test('a souvenir lands in the right storage and coins drop', () => {
  const g = gs();
  const out = applyCafeResult(g, buyCafe(st, 'snowglobe'));
  assert.equal(g.inventory.coins, 1850);
  assert.equal(g.house.stored.snowglobe, 1);
  assert.equal(out.toast, CAFE_COPY.gift);
  applyCafeResult(g, buyCafe({ ...st, coins: 1850 }, 'summitflag'));
  assert.equal(g.outdoorStored.summitflag, 1);
});

test('a sled colour updates the saved hut state, a wearable the cosmetics', () => {
  const g = gs();
  applyCafeResult(g, buyCafe(st, 'sky'));
  assert.deepEqual(g.mountain.hut, { sleds: ['basic', 'sky'], sled: 'sky' });
  applyCafeResult(g, buyCafe({ ...st, coins: g.inventory.coins }, 'earmuff'));
  assert.equal(g.cosmetics.equipped.head, 'earmuff');
});

test('a drink asks for the sit moment with its cup colour', () => {
  const out = applyCafeResult(gs(), buyCafe(st, 'yuzu'));
  assert.equal(out.toast, CAFE_COPY.drink);
  assert.equal(out.drink.cup, 0xe2b23c);
});

test('a failed purchase only explains lack of coins', () => {
  const g = gs();
  assert.equal(applyCafeResult(g, buyCafe({ ...st, coins: 1 }, 'cocoa')).toast, CAFE_COPY.poor);
  assert.equal(g.inventory.coins, 2000);
});

test('the shop is a -modal so the game pauses behind it, and purchases hit the ledger', () => {
  assert.match(readFileSync(new URL('../js/mountain/cafe-ui.js', import.meta.url), 'utf8'), /\.id = 'hut-cafe-modal'/);
  const m = readFileSync(new URL('../js/spaces/mountain.js', import.meta.url), 'utf8');
  assert.match(m, /logEcon\('hut_cafe', id, -cafeItem\(id\)\.coins, gameState\.inventory\.coins\)/);
  assert.match(m, /trackEvent\('hut_cafe_buy', \{ item_id: id, tab, price_coins: cafeItem\(id\)\.coins, coins_after: gameState\.inventory\.coins \}\)/);
});

test('while seated the clamp pins the player to the seat', () => {
  const src = readFileSync(new URL('../js/mountain/cafe-room.js', import.meta.url), 'utf8');
  assert.match(src, /if \(seated\) \{ p\.x = seated\.x; p\.z = seated\.z; p\.y = 0; return; \}/);
  assert.match(src, /seated = \{ mug, steam, t: 4, x: origin\.x \+ seat\.x, z: origin\.z \+ seat\.z \}/);
});

test('sled rows keep each stat on one line and show a lock as a note, not a wide button', () => {
  const src = readFileSync(new URL('../js/mountain/cafe-ui.js', import.meta.url), 'utf8');
  assert.match(src, /\.hc-stats span\{white-space:nowrap\}/);
  assert.match(src, /row\.kind === 'locked'[\s\S]*?className = 'hc-lock'[\s\S]*?continue;/);
});
