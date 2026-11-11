import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sellQty, clampQty, itemName, sellList } from '../js/shop/sell-rules.js';

test('sellQty: true 는 가진 만큼 전부', () => {
  assert.equal(sellQty(44, true), 44);
});

test('sellQty: 숫자는 1..보유 사이로 자른다', () => {
  assert.equal(sellQty(44, 10), 10);
  assert.equal(sellQty(44, 99), 44);
  assert.equal(sellQty(44, 0), 1);
  assert.equal(sellQty(44, -3), 1);
  assert.equal(sellQty(44, 2.7), 2);
});

test('sellQty: 예전 호출(false·undefined)은 1개', () => {
  assert.equal(sellQty(5, false), 1);
  assert.equal(sellQty(5, undefined), 1);
  assert.equal(sellQty(5, 'x'), 1);
});

test('sellQty: 가진 게 없으면 0', () => {
  assert.equal(sellQty(0, true), 0);
  assert.equal(sellQty(0, 3), 0);
  assert.equal(sellQty(undefined, 1), 0);
});

test('clampQty: 수량 칸은 1..보유, 보유 0이면 0', () => {
  assert.equal(clampQty(5, 8), 5);
  assert.equal(clampQty(9, 8), 8);
  assert.equal(clampQty(0, 8), 1);
  assert.equal(clampQty(NaN, 8), 1);
  assert.equal(clampQty(3, 0), 0);
});

test('itemName: 라벨 앞 이모지를 떼고 이름만', () => {
  assert.equal(itemName('🌾밀가루'), '밀가루');
  assert.equal(itemName('⚫숯'), '숯');
  assert.equal(itemName('🐚바지락'), '바지락');
  assert.equal(itemName('목재'), '목재');
  assert.equal(itemName('🌾밀 씨앗'), '밀 씨앗');
  assert.equal(itemName(''), '');
  assert.equal(itemName(undefined), '');
});

test('sellList: 가진 품목만, 시세 높은 순, 이름 정리', () => {
  const market = [
    { k: 'mf_cockle', ico: '🐚', label: '🐚꼬막', price: 4, rate: 30 },
    { k: 'gem', ico: '💎', label: '보석', price: 50, rate: 25 },
    { k: 'apple', ico: '🍎', label: '🍎사과', price: 9, rate: 18 },
    { k: 'wood', ico: '🪵', label: '목재', price: 2, rate: -15 },
  ];
  const inv = { wood: 44, apple: 5, mf_cockle: 2, gem: 0, coins: 80 };
  const list = sellList(market, inv);
  assert.deepEqual(list.map(i => i.k), ['mf_cockle', 'apple', 'wood']);
  assert.deepEqual(list[0], { k: 'mf_cockle', ico: '🐚', name: '꼬막', price: 4, rate: 30, have: 2 });
});

test('sellList: 넘겨받은 배열을 바꾸지 않고 시세 순으로 다시 정렬한다', () => {
  const market = [
    { k: 'wood', ico: '🪵', label: '목재', price: 2, rate: -15 },
    { k: 'apple', ico: '🍎', label: '🍎사과', price: 9, rate: 18 },
  ];
  const before = JSON.stringify(market);
  const list = sellList(market, { wood: 1, apple: 1 });
  assert.deepEqual(list.map(i => i.k), ['apple', 'wood']);
  assert.equal(JSON.stringify(market), before);
});

test('sellList: 가방이 비면 빈 배열', () => {
  assert.deepEqual(sellList([{ k: 'wood', ico: '🪵', label: '목재', price: 2, rate: 0 }], {}), []);
  assert.deepEqual(sellList([], { wood: 3 }), []);
});
