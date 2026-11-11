import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GIFTS } from '../js/data/npcs.js';
import {
  WRAP_COST, WRAP_LOVE, WRAP_PAPERS, keptGiftId, parseKeptGift, keepLove, giftLove,
  restoreGifts, addGift, takeGift, wrapKept, keptGiftList, objParticle,
} from '../js/spaces/carve-gift.js';

const DESIGNS = [
  { id: 'fish', name: '목각 물고기', ico: '🐟' },
  { id: 'star', name: '돌 별 장식', ico: '⭐' },
];

test('wrap costs 15 coins and adds one heart, three papers', () => {
  assert.equal(WRAP_COST, 15);
  assert.equal(WRAP_LOVE, 1);
  assert.deepEqual(WRAP_PAPERS.map(p => [p.id, p.name]), [['kraft', '크라프트'], ['floral', '꽃무늬'], ['starry', '별밤']]);
});

test('kept gift ids round-trip with tier and paper', () => {
  assert.equal(keptGiftId('fish', 'master'), 'cv:fish:master');
  assert.equal(keptGiftId('fish', 'master', 'floral'), 'cv:fish:master:floral');
  assert.deepEqual(parseKeptGift('cv:fish:master'), { design: 'fish', tier: 'master', paper: null });
  assert.deepEqual(parseKeptGift('cv:star:rough:starry'), { design: 'star', tier: 'rough', paper: 'starry' });
  for (const bad of ['bouquet', 'cv:fish', 'cv:fish:gold', 'cv:fish:master:glitter', 'cv::master', 'cv:Fish:master', 'cv:fish:master:floral:x', null, 7]) {
    assert.equal(parseKeptGift(bad), null, String(bad));
  }
});

test('love: kept +1, masterpiece +2, wrapped one more', () => {
  assert.equal(keepLove('master'), 2);
  for (const t of ['fine', 'decent', 'rough']) assert.equal(keepLove(t), 1);
  assert.equal(giftLove('cv:fish:master', GIFTS), 2);
  assert.equal(giftLove('cv:fish:master:kraft', GIFTS), 3);
  assert.equal(giftLove('cv:fish:fine', GIFTS), 1);
  assert.equal(giftLove('cv:fish:decent:starry', GIFTS), 2);
  assert.equal(giftLove('bouquet', GIFTS), 1);
  assert.equal(giftLove('necklace', GIFTS), 2);
  assert.equal(giftLove('star_jar', GIFTS), 2);
  assert.equal(giftLove('nope', GIFTS), 0);
});

test('restoreGifts keeps old saves and drops broken counts', () => {
  assert.deepEqual(restoreGifts({ bouquet: 2, necklace: 1 }), { bouquet: 2, necklace: 1 });
  assert.deepEqual(restoreGifts({ bouquet: 2.7, fruit: 0, fishset: -1, woodtoy: 'x', 'cv:fish:master:floral': 1, future_gift: 3 }),
    { bouquet: 2, 'cv:fish:master:floral': 1, future_gift: 3 });
  assert.deepEqual(restoreGifts(undefined), {});
  assert.deepEqual(restoreGifts(null), {});
  assert.deepEqual(restoreGifts([1, 2]), {});
  assert.deepEqual(restoreGifts('bouquet'), {});
  assert.deepEqual(restoreGifts({ bouquet: Infinity }), {});
});

test('addGift and takeGift return new objects', () => {
  const g = { bouquet: 1 };
  const a = addGift(g, 'cv:fish:master');
  assert.deepEqual(a, { bouquet: 1, 'cv:fish:master': 1 });
  assert.deepEqual(g, { bouquet: 1 });
  assert.deepEqual(takeGift(a, 'cv:fish:master'), { bouquet: 1 });
  assert.deepEqual(takeGift(a, 'bouquet'), { 'cv:fish:master': 1 });
  assert.equal(takeGift(a, 'fruit'), null);
});

test('wrapKept turns one plain kept gift into a wrapped one', () => {
  const g = { 'cv:fish:master': 2 };
  const w = wrapKept(g, 'cv:fish:master', 'floral');
  assert.deepEqual(w, { 'cv:fish:master': 1, 'cv:fish:master:floral': 1 });
  assert.deepEqual(g, { 'cv:fish:master': 2 });
  assert.equal(wrapKept(g, 'cv:fish:master', 'glitter'), null);
  assert.equal(wrapKept(g, 'cv:fish:fine', 'kraft'), null);
  assert.equal(wrapKept({ 'cv:fish:master:kraft': 1 }, 'cv:fish:master:kraft', 'floral'), null);
  assert.equal(wrapKept({ bouquet: 1 }, 'bouquet', 'kraft'), null);
});

test('keptGiftList lists kept carvings with love, highest first', () => {
  const list = keptGiftList({ bouquet: 2, 'cv:star:fine': 1, 'cv:fish:master:floral': 1, 'cv:fish:master': 0, 'cv:gone:fine': 1 }, DESIGNS);
  assert.deepEqual(list.map(e => [e.id, e.n, e.love, e.ico, e.name, e.paper]), [
    ['cv:fish:master:floral', 1, 3, '🐟', '목각 물고기', 'floral'],
    ['cv:star:fine', 1, 1, '⭐', '돌 별 장식', null],
  ]);
  assert.deepEqual(keptGiftList({}, DESIGNS), []);
});

test('object particle follows the last syllable', () => {
  assert.equal(objParticle('목각 물고기'), '를');
  assert.equal(objParticle('하트 장식'), '을');
  assert.equal(objParticle('돌 찻잔'), '을');
  assert.equal(objParticle('아기 나무'), '를');
  assert.equal(objParticle('Fish'), '을(를)');
});

test('five new gift recipes with real inventory keys and love', () => {
  const byId = Object.fromEntries(GIFTS.map(g => [g.id, g]));
  const fresh = GIFTS.filter(g => g.isNew);
  assert.deepEqual(fresh.map(g => [g.ico, g.name]), [['🍯', '꿀단지'], ['🏮', '반딧불 등'], ['🥧', '사과 파이'], ['🌰', '군밤 봉지'], ['🫙', '별빛 유리병']]);
  assert.deepEqual(byId.honeypot.cost, { honey: 2, wood: 2 });
  assert.deepEqual(byId.firefly_lamp.cost, { bug: 2, wood: 3 });
  assert.deepEqual(byId.apple_pie.cost, { flour: 1, apple: 2 });
  assert.deepEqual(byId.chestnut_bag.cost, { roast_chestnut: 3 });
  assert.deepEqual(byId.star_jar.cost, { star: 2, glow: 1 });
  assert.deepEqual(fresh.map(g => giftLove(g.id, GIFTS)), [1, 1, 1, 1, 2]);
  assert.equal(GIFTS.length, 10);
  assert.equal(GIFTS.filter(g => !g.isNew).length, 5);
  for (const g of GIFTS) assert.equal(parseKeptGift(g.id), null);
});
