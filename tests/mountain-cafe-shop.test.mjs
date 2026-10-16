import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CAFE_TABS, CAFE_ITEMS, cafeItem, itemsOfTab } from '../js/mountain/cafe-catalog.js';
import { rowOf, buyCafe, pickSled } from '../js/mountain/cafe-shop.js';

const base = (o = {}) => ({ coins: 5000, cos: { owned: [], equipped: {} }, hut: { sleds: ['basic'], sled: 'basic' }, perfect: false, ...o });

test('four tabs, eleven products and the basic sled row in the spec order', () => {
  assert.deepEqual(CAFE_TABS.map(t => t[0]), ['drink', 'sled', 'wear', 'gift']);
  assert.deepEqual(CAFE_ITEMS.map(i => i.id), ['cocoa', 'yuzu', 'basic', 'sky', 'forest', 'starry', 'earmuff', 'snowflake', 'sled_pack', 'snowglobe', 'hutmodel', 'summitflag']);
  assert.deepEqual(itemsOfTab('sled').map(i => i.id), ['basic', 'sky', 'forest', 'starry']);
  assert.equal(rowOf(cafeItem('basic'), base()).kind, 'riding');
  assert.equal(rowOf(cafeItem('basic'), base({ hut: { sleds: ['basic', 'sky'], sled: 'sky' } })).kind, 'ride');
});

test('prices follow the spec table', () => {
  const p = Object.fromEntries(CAFE_ITEMS.map(i => [i.id, i.coins]));
  assert.deepEqual(p, { cocoa: 10, yuzu: 10, basic: 0, sky: 400, forest: 400, starry: 900, earmuff: 1000, snowflake: 1200, sled_pack: 1400, snowglobe: 150, hutmodel: 300, summitflag: 250 });
});

test('drinks and souvenirs can be bought again and again', () => {
  let st = base();
  for (let i = 0; i < 3; i++) { const r = buyCafe(st, 'cocoa'); assert.equal(r.ok, true); st = r.st; }
  assert.equal(st.coins, 5000 - 30);
  assert.deepEqual(buyCafe(st, 'snowglobe').grant, { type: 'house', id: 'snowglobe' });
  assert.deepEqual(buyCafe(st, 'summitflag').grant, { type: 'outdoor', id: 'summitflag' });
  assert.equal(buyCafe(st, 'yuzu').grant.cup, cafeItem('yuzu').cup);
});

test('a sled colour is bought once, then ridden', () => {
  const st0 = base();
  const r = buyCafe(st0, 'sky');
  assert.equal(r.ok, true);
  assert.deepEqual(r.st.hut, { sleds: ['basic', 'sky'], sled: 'sky' });
  assert.deepEqual(st0.hut, { sleds: ['basic'], sled: 'basic' });
  assert.equal(buyCafe(r.st, 'sky').why, 'owned');
  assert.equal(rowOf(cafeItem('sky'), r.st).kind, 'riding');
  const back = pickSled(r.st, 'basic');
  assert.equal(back.hut.sled, 'basic');
  assert.equal(rowOf(cafeItem('sky'), back).kind, 'ride');
  assert.equal(pickSled(back, 'forest').hut.sled, 'basic');
});

test('the starry sled is locked until a perfect 12-flag finish', () => {
  assert.equal(rowOf(cafeItem('starry'), base()).kind, 'locked');
  assert.equal(buyCafe(base(), 'starry').why, 'locked');
  assert.equal(buyCafe(base({ perfect: true }), 'starry').ok, true);
});

test('wearables go to the cosmetics state, are equipped and owned once', () => {
  const r = buyCafe(base(), 'earmuff');
  assert.equal(r.ok, true);
  assert.deepEqual(r.st.cos.owned, ['earmuff']);
  assert.equal(r.st.cos.equipped.head, 'earmuff');
  assert.deepEqual(r.grant, { type: 'cos', id: 'earmuff' });
  assert.equal(rowOf(cafeItem('earmuff'), r.st).label, '구매 완료');
  assert.equal(buyCafe(r.st, 'earmuff').why, 'owned');
});

test('not enough coins is refused without changing state', () => {
  const st = base({ coins: 5 });
  const r = buyCafe(st, 'cocoa');
  assert.equal(r.ok, false);
  assert.equal(r.why, 'poor');
  assert.equal(r.st, st);
});

test('row labels use the shop button format', () => {
  assert.equal(rowOf(cafeItem('sled_pack'), base()).label, '1,400🪙');
  assert.equal(rowOf(cafeItem('cocoa'), base()).label, '10🪙');
  assert.equal(rowOf(cafeItem('starry'), base()).label, '🏁 깃발 12개 모두 지나 완주하면 열려요');
  assert.equal(rowOf(cafeItem('starry'), base()).disabled, true);
});
