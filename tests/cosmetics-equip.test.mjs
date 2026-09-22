// tests/cosmetics-equip.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyCosmetics, canBuy, buy, equip, unequip, equippedItems, sanitize } from '../js/cosmetics/equip.js';

test('emptyCosmetics: 아무것도 없고 네 슬롯이 비어 있다', () => {
  const c = emptyCosmetics();
  assert.deepEqual(c.owned, []);
  assert.deepEqual(c.equipped, { head: null, neck: null, back: null, trail: null });
});

test('canBuy: 모르는 id · 이미 보유 · 코인 부족', () => {
  const c = emptyCosmetics();
  assert.deepEqual(canBuy(c, 99999, 'nope'), { ok: false, why: 'unknown' });
  assert.deepEqual(canBuy(c, 599, 'star_pin'), { ok: false, why: 'poor' });
  assert.deepEqual(canBuy(c, 600, 'star_pin'), { ok: true, why: '' });
  const owned = buy(c, 600, 'star_pin').cos;
  assert.deepEqual(canBuy(owned, 99999, 'star_pin'), { ok: false, why: 'owned' });
});

test('buy: 코인을 깎고 보유에 넣는다 — 원본을 건드리지 않는다(불변)', () => {
  const c = emptyCosmetics();
  const r = buy(c, 1000, 'star_pin');
  assert.equal(r.bought, true);
  assert.equal(r.coins, 400);
  assert.deepEqual(r.cos.owned, ['star_pin']);
  assert.deepEqual(c.owned, [], '원본이 바뀌면 안 된다');
});

test('buy: 못 사면 코인도 보유도 그대로', () => {
  const c = emptyCosmetics();
  const r = buy(c, 100, 'star_pin');
  assert.equal(r.bought, false);
  assert.equal(r.coins, 100);
  assert.deepEqual(r.cos.owned, []);
});

test('equip: 보유한 것만 · 같은 슬롯은 갈아끼운다', () => {
  let c = buy(emptyCosmetics(), 9999, 'star_pin').cos;
  c = buy(c, 9999, 'flower_crown').cos;
  c = equip(c, 'star_pin');
  assert.equal(c.equipped.head, 'star_pin');
  c = equip(c, 'flower_crown');
  assert.equal(c.equipped.head, 'flower_crown', '같은 슬롯이면 교체된다');
  const before = { ...c.equipped };
  c = equip(c, 'beanie');
  assert.deepEqual(c.equipped, before, '안 산 것은 장착되지 않는다');
});

test('unequip: 그 슬롯만 비운다', () => {
  let c = equip(buy(emptyCosmetics(), 9999, 'scarf').cos, 'scarf');
  c = unequip(c, 'neck');
  assert.equal(c.equipped.neck, null);
});

test('equippedItems: 장착한 품목 객체들 — 렌더가 이걸 받아 그린다', () => {
  let c = buy(emptyCosmetics(), 9999, 'scarf').cos;
  c = equip(c, 'scarf');
  assert.deepEqual(equippedItems(c).map(i => i.id), ['scarf']);
  assert.deepEqual(equippedItems(emptyCosmetics()), []);
});

test('sanitize: 세이브의 낯선 id·중복·잘못된 슬롯을 걸러 낸다', () => {
  const c = sanitize({
    owned: ['scarf', 'scarf', 'ghost_item', 42],
    equipped: { head: 'scarf', neck: 'scarf', back: 'nope', trail: null, wing: 'x' },
  });
  assert.deepEqual(c.owned, ['scarf'], '중복·미등록·비문자열 제거');
  assert.equal(c.equipped.head, null, 'scarf 는 neck 이라 head 에 못 온다');
  assert.equal(c.equipped.neck, 'scarf');
  assert.equal(c.equipped.back, null, '카탈로그에 없는 id');
  assert.equal(c.equipped.wing, undefined, '없는 슬롯은 만들지 않는다');
});

test('sanitize: 안 산 것은 장착에서 뺀다 — 세이브 조작 방어', () => {
  const c = sanitize({ owned: [], equipped: { head: 'beanie', neck: null, back: null, trail: null } });
  assert.equal(c.equipped.head, null);
});

test('sanitize: null·잘못된 타입이면 빈 상태', () => {
  assert.deepEqual(sanitize(null), emptyCosmetics());
  assert.deepEqual(sanitize('x'), emptyCosmetics());
  assert.deepEqual(sanitize(undefined), emptyCosmetics());
});
