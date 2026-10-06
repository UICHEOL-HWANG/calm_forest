// tests/halloween-sale-window.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SALE_WINDOWS, saleOpen, saleEndLabel, saleTagOf } from '../js/shop/sale-window.js';

const item = { id: 'pumpkin_glow', sale: 'halloween' };
const at = (iso) => Date.parse(iso);

test('sale 키가 없는 상품은 늘 열려 있다', () => {
  assert.equal(saleOpen({ id: 'firefly' }, at('2026-01-01T00:00:00Z')), true);
  assert.equal(saleOpen(null), true);
});

test('기간 전 — KST 10/23 23:59:59 는 닫힘, KST 10/24 00:00 에 열림', () => {
  assert.equal(saleOpen(item, at('2026-10-23T14:59:59Z')), false);   // = KST 10/23 23:59:59
  assert.equal(saleOpen(item, at('2026-10-23T15:00:00Z')), true);    // = KST 10/24 00:00:00
});

test('마지막 날(11/2) 끝까지 열려 있고 11/3 00:00 KST 에 닫힌다', () => {
  assert.equal(saleOpen(item, at('2026-11-02T14:59:59Z')), true);    // = KST 11/2 23:59:59
  assert.equal(saleOpen(item, at('2026-11-02T15:00:00Z')), false);   // = KST 11/3 00:00:00
});

test('모르는 시즌 키는 닫는다 — 오타로 상시 판매되지 않게', () => {
  assert.equal(saleOpen({ sale: 'halloweeen' }, at('2026-10-30T00:00:00Z')), false);
});

test('종료 날짜 라벨 — 11/2', () => {
  assert.equal(saleEndLabel(item), '11/2');
  assert.equal(saleEndLabel({ id: 'firefly' }), null);
  assert.ok(Object.isFrozen(SALE_WINDOWS));
});

test('시즌 태그 — 라벨과 날짜는 따로(날짜는 번역 안 함)', () => {
  assert.deepEqual(saleTagOf(item), { label: '🎃 할로윈 한정', until: '~11/2' });
  assert.equal(saleTagOf({ id: 'firefly' }), null);
});
