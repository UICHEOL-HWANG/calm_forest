// tests/cosmetics-catalog.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SLOTS, ITEMS, itemsOf, findItem } from '../js/cosmetics/catalog.js';

test('슬롯 7개 · 품목 61종(🪏 호미 3 + 🦀 갯벌 세트 구성품 2 + 코인 18 + 프리미엄 자국 2 + 스킨 2 + 도구 세트 3 + 🎃 할로윈 10 + 🍁 2차 11 + 🤝 초대 보상 3 + 🌱 새싹반 3 + ⛏️ 광부 보상 1)', () => {
  assert.deepEqual([...SLOTS], ['head', 'neck', 'back', 'trail', 'skin', 'tools', 'homi']);
  assert.equal(ITEMS.length, 61);
  assert.equal(itemsOf('head').length, 13);
  assert.equal(itemsOf('neck').length, 4);
  assert.equal(itemsOf('back').length, 11);
  assert.equal(itemsOf('trail').length, 12);
  assert.equal(itemsOf('skin').length, 6);
  assert.equal(itemsOf('tools').length, 11);
  assert.equal(itemsOf('homi').length, 4);
  assert.equal(ITEMS.filter(i => i.reward).length, 3);
});

test('🧥 스킨 2종 — 현금 전용(won), 정령 ₩10,000 · 인형 ₩9,000', () => {
  const s = findItem('forest_spirit'), p = findItem('plush_doll');
  assert.equal(s.slot, 'skin'); assert.equal(s.name, '숲의 정령'); assert.equal(s.ico, '🌿');
  assert.equal(s.price.won, 10000); assert.equal(s.price.coins, null); assert.equal(s.premium, true);
  assert.equal(p.slot, 'skin'); assert.equal(p.name, '플러시 인형'); assert.equal(p.ico, '🧸');
  assert.equal(p.price.won, 9000); assert.equal(p.price.coins, null); assert.equal(p.premium, true);
});

test('id 는 중복되지 않는다 — 세이브 키이자 트래킹 축이다', () => {
  const ids = ITEMS.map(i => i.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('가격 — coins 와 won 중 정확히 하나. 현금 칸은 null 이거나 {priceId,label}', () => {
  for (const it of ITEMS) {
    const c = it.price.cash;
    assert.ok(c === null || (typeof c.priceId === 'string' && typeof c.label === 'string'), `${it.id} 의 cash 형태`);
    const hasCoins = Number.isInteger(it.price.coins) && it.price.coins > 0;
    const hasWon = Number.isInteger(it.price.won) && it.price.won > 0;
    if (it.reward || it.quest || it.set) {
      assert.ok(!hasCoins && !hasWon && c === null && !it.premium, `${it.id}: 보상은 가격 없음`);
      continue;
    }
    assert.ok(hasCoins !== hasWon, `${it.id}: coins/won 중 하나만`);
    assert.equal(!!it.premium, hasWon, `${it.id}: premium ⇔ won`);
  }
});

test('꾸미기 최저가가 일꾼 초빙료(120🪙)보다 훨씬 비싸다 — 집 증축을 밀어내면 안 된다(§2-2) · 🌱 새싹반은 예외', () => {
  assert.ok(Math.min(...ITEMS.filter(i => !i.premium && !i.reward && !i.quest && !i.set && i.group !== 'sprout').map(i => i.price.coins)) >= 600);
});

test('🌱 새싹반 3종 — 머리·목·가방 하나씩, 50·70·100🪙, 일꾼 초빙료(120🪙) 아래', () => {
  const sp = ITEMS.filter(i => i.group === 'sprout');
  assert.deepEqual(sp.map(i => [i.id, i.slot, i.price.coins]),
    [['kinder_hat', 'head', 50], ['tulip_tag', 'neck', 70], ['kinder_bag', 'back', 100]]);
  assert.ok(sp.every(i => !i.premium && i.price.coins < 120));
  assert.equal(findItem('kinder_hat').earSafe, 'dome');
  assert.equal(findItem('kinder_bag').anchor, 'side');
});

test('머리 장식은 earSafe 를 반드시 갖는다 — 귀 처리 규칙(§3-3)', () => {
  for (const it of itemsOf('head')) assert.ok(['low', 'dome'].includes(it.earSafe), it.id);
  assert.equal(itemsOf('head').filter(i => i.earSafe === 'dome').length, 6);
});

test('가방류는 side 앵커, 망토만 back — 🦊여우 꼬리 회피(§3-3)', () => {
  assert.equal(findItem('pack').anchor, 'side');
  assert.equal(findItem('basket').anchor, 'side');
  assert.equal(findItem('cape').anchor, 'back');
});

test('발자국 — 프리미엄 2개가 맨 앞, 코인 자국은 등급이 오를수록 비싸다(§4-4)', () => {
  const t = itemsOf('trail');
  assert.deepEqual(t.map(i => i.id), ['firefly', 'rainbow', 'pumpkin_glow', 'bat_swirl', 'maple_trail', 'bubble_trail', 'paw', 'drop', 'flower', 'star', 'sparkle', 'snowflake']);
  const coin = t.filter(i => !i.premium && !i.shop);
  assert.deepEqual(coin.map(i => i.tier), ['기본', '기본', '고급', '특별', '특별']);
  for (let i = 1; i < coin.length; i++) assert.ok(coin[i].price.coins > coin[i - 1].price.coins);
});

test('프리미엄 자국 — 원화 가격, 코인 없음(2026-10-01 스펙 §2-1)', () => {
  assert.deepEqual([findItem('firefly').price.won, findItem('rainbow').price.won], [4000, 3000]);
  assert.equal(findItem('firefly').price.coins, null);
  assert.equal(findItem('firefly').tier, '프리미엄');
});

test('findItem: 없는 id 는 null', () => {
  assert.equal(findItem('nope'), null);
  assert.equal(findItem('hat_straw'), null, '있지도 않은 옛 id');
  assert.equal(findItem('straw_hat').slot, 'head');
});

test('⛏️ 광부 헬멧 — 광부 아저씨 보상, 팔지 않고 서버 보안 가드 대상도 아니다', () => {
  const it = findItem('miner_lamp');
  assert.equal(it.slot, 'head'); assert.equal(it.ico, '⛏️'); assert.equal(it.name, '광부 헬멧');
  assert.equal(it.earSafe, 'dome'); assert.equal(it.quest, 'delve');
  assert.deepEqual(it.price, { coins: null, won: null, cash: null });
  assert.ok(!it.premium && !it.reward);
  assert.deepEqual(ITEMS.filter(i => i.quest).map(i => i.id), ['miner_lamp']);
});
