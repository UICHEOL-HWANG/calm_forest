// tests/cosmetics-equip.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyCosmetics, canBuy, buy, equip, unequip, equippedItems, sanitize } from '../js/cosmetics/equip.js';

test('emptyCosmetics: 아무것도 없고 여섯 슬롯이 비어 있다', () => {
  const c = emptyCosmetics();
  assert.deepEqual(c.owned, []);
  assert.deepEqual(c.equipped, { head: null, neck: null, back: null, trail: null, skin: null, tools: null });
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

test('sanitize: 중복·비문자열·잘못된 슬롯을 걸러 낸다', () => {
  const c = sanitize({
    owned: ['scarf', 'scarf', 42],
    equipped: { head: 'scarf', neck: 'scarf', back: 'nope', trail: null, wing: 'x' },
  });
  assert.deepEqual(c.owned, ['scarf']);
  assert.equal(c.equipped.head, null);
  assert.equal(c.equipped.neck, 'scarf');
  assert.equal(c.equipped.back, null);
  assert.equal(c.equipped.wing, undefined);
});

test('sanitize: 모르는 id 는 소유 목록에 남긴다 · 장착은 하지 않는다', () => {
  const c = sanitize({ owned: ['scarf', 'future_hat'], equipped: { head: 'future_hat', neck: 'scarf' } });
  assert.deepEqual(c.owned, ['scarf', 'future_hat']);
  assert.equal(c.equipped.head, null);
  assert.equal(c.equipped.neck, 'scarf');
});

test('sanitize: 모르는 id 는 id 모양 문자열만 · 개수 상한', () => {
  const junk = ['<script>', 'A B', 'x'.repeat(65), ''];
  const many = Array.from({ length: 300 }, (_, i) => `future_${i}`);
  const c = sanitize({ owned: [...junk, ...many], equipped: {} });
  assert.ok(c.owned.every(id => /^[a-z0-9_]{1,64}$/.test(id)));
  assert.ok(c.owned.length <= 128);
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

test('canBuy: 현금 전용은 코인으로 못 산다', () => {
  assert.deepEqual(canBuy(emptyCosmetics(), 1e9, 'firefly'), { ok: false, why: 'cash-only' });
});

test('sanitize — 옛 세이브(equipped.skin 없음)는 skin=null 로 채운다', () => {
  const out = sanitize({ owned: ['cap'], equipped: { head: 'cap' } });
  assert.equal(out.equipped.skin, null);
  assert.equal(out.equipped.head, 'cap');
});

test('sanitize — 안 산 스킨이 장착돼 있으면 벗긴다 · 산 스킨은 남긴다', () => {
  assert.equal(sanitize({ owned: [], equipped: { skin: 'plush_doll' } }).equipped.skin, null);
  assert.equal(sanitize({ owned: ['plush_doll'], equipped: { skin: 'plush_doll' } }).equipped.skin, 'plush_doll');
});

test('equip — 스킨은 다른 칸과 함께 입는다(모자를 벗기지 않는다)', () => {
  const cos = { owned: ['cap', 'forest_spirit'], equipped: { head: 'cap', neck: null, back: null, trail: null, skin: null } };
  const out = equip(cos, 'forest_spirit');
  assert.equal(out.equipped.skin, 'forest_spirit');
  assert.equal(out.equipped.head, 'cap');
});
