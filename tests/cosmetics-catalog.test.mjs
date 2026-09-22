// tests/cosmetics-catalog.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SLOTS, ITEMS, itemsOf, findItem } from '../js/cosmetics/catalog.js';

test('슬롯 4개 · 품목 18종 — 스펙 §4 수치 그대로', () => {
  assert.deepEqual([...SLOTS], ['head', 'neck', 'back', 'trail']);
  assert.equal(ITEMS.length, 18);
  assert.equal(itemsOf('head').length, 7);
  assert.equal(itemsOf('neck').length, 3);
  assert.equal(itemsOf('back').length, 3);
  assert.equal(itemsOf('trail').length, 5);
});

test('id 는 중복되지 않는다 — 세이브 키이자 트래킹 축이다', () => {
  const ids = ITEMS.map(i => i.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('현금 칸은 전부 null — 이번엔 결제를 안 붙인다(스펙 §0)', () => {
  for (const it of ITEMS) {
    assert.equal(it.price.cash, null, `${it.id} 의 cash 가 null 이 아니다`);
    assert.ok(Number.isInteger(it.price.coins) && it.price.coins > 0, `${it.id} 코인 가격`);
  }
});

test('꾸미기 최저가가 일꾼 초빙료(120🪙)보다 훨씬 비싸다 — 집 증축을 밀어내면 안 된다(§2-2)', () => {
  assert.ok(Math.min(...ITEMS.map(i => i.price.coins)) >= 600);
});

test('머리 장식은 earSafe 를 반드시 갖는다 — 귀 처리 규칙(§3-3)', () => {
  for (const it of itemsOf('head')) assert.ok(['low', 'dome'].includes(it.earSafe), it.id);
  assert.equal(itemsOf('head').filter(i => i.earSafe === 'dome').length, 4);
});

test('가방류는 side 앵커, 망토만 back — 🦊여우 꼬리 회피(§3-3)', () => {
  assert.equal(findItem('pack').anchor, 'side');
  assert.equal(findItem('basket').anchor, 'side');
  assert.equal(findItem('cape').anchor, 'back');
});

test('발자국은 등급이 오를수록 비싸다(§4-4)', () => {
  const t = itemsOf('trail');
  assert.deepEqual(t.map(i => i.id), ['paw', 'drop', 'flower', 'star', 'sparkle']);
  assert.deepEqual(t.map(i => i.tier), ['기본', '기본', '고급', '특별', '특별']);
  for (let i = 1; i < t.length; i++) assert.ok(t[i].price.coins > t[i - 1].price.coins);
});

test('findItem: 없는 id 는 null', () => {
  assert.equal(findItem('nope'), null);
  assert.equal(findItem('hat_straw'), null, '있지도 않은 옛 id');
  assert.equal(findItem('straw_hat').slot, 'head');
});
