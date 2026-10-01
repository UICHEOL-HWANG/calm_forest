// tests/cosmetics-wardrobe.test.mjs — 🐾 캐릭터·꾸미기 › 옷장 탭과 가게 버튼 규칙
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyCosmetics, buy, equip } from '../js/cosmetics/equip.js';
import { ownedIn, toggleWear, shopButton } from '../js/cosmetics/wardrobe.js';

const own = (...ids) => ids.reduce((c, id) => buy(c, 1e9, id).cos, emptyCosmetics());

test('ownedIn: 그 칸에서 **산 것만**, 카탈로그 순서대로', () => {
  const c = own('bell', 'beanie', 'star_pin', 'scarf');
  assert.deepEqual(ownedIn(c, 'head').map(it => it.id), ['beanie', 'star_pin']);
  assert.deepEqual(ownedIn(c, 'neck').map(it => it.id), ['scarf', 'bell']);
  assert.deepEqual(ownedIn(c, 'trail'), []);
});

test('ownedIn: 세이브에 이상한 값이 있어도 터지지 않는다', () => {
  assert.deepEqual(ownedIn(null, 'head'), []);
  assert.deepEqual(ownedIn({ owned: ['nope'] }, 'head'), []);
});

test('toggleWear: 안 입은 걸 누르면 입고, 입은 걸 누르면 벗는다', () => {
  const c = own('beanie', 'cap');
  const a = toggleWear(c, 'beanie');
  assert.equal(a.cos.equipped.head, 'beanie');
  assert.equal(a.action, 'on');
  const b = toggleWear(a.cos, 'cap');                      // 같은 칸은 갈아끼운다
  assert.equal(b.cos.equipped.head, 'cap');
  const d = toggleWear(b.cos, 'cap');
  assert.equal(d.cos.equipped.head, null);
  assert.equal(d.action, 'off');
  assert.equal(c.equipped.head, null, '원본은 그대로(불변)');
});

test('toggleWear: 안 산 것·모르는 id 는 아무것도 바꾸지 않는다', () => {
  const c = own('beanie');
  assert.equal(toggleWear(c, 'cap').action, null);
  assert.equal(toggleWear(c, 'cap').cos, c);
  assert.equal(toggleWear(c, 'nope').action, null);
});

test('shopButton: 안 산 건 가격, 산 건 입었든 안 입었든 "구매 완료"(비활성)', () => {
  const c = own('beanie');
  const cap = { id: 'cap', price: { coins: 1500 } };
  const beanie = { id: 'beanie', price: { coins: 1600 } };
  assert.deepEqual(shopButton(cap, c), { label: '1,500🪙', disabled: false });
  assert.deepEqual(shopButton(beanie, c), { label: '구매 완료', disabled: true });
  assert.deepEqual(shopButton(beanie, equip(c, 'beanie')), { label: '구매 완료', disabled: true });
});

test('shopButton: 현금 전용이면 코인 버튼이 없다(null)', () => {
  assert.equal(shopButton({ id: 'firefly', premium: true, price: { coins: null, won: 4000 } }, own()), null);
});
