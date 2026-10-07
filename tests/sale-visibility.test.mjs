import { test } from 'node:test';
import assert from 'node:assert/strict';
import { catalogVisible, SALE_WINDOWS } from '../js/shop/sale-window.js';

const item = { id: 'x', sale: 'halloween' };
const KST = (y, m, d, h = 0, mi = 0, s = 0) => Date.UTC(y, m - 1, d, h, mi, s) - 9 * 3600 * 1000;
const IN = KST(2026, 10, 25, 12), BEFORE = KST(2026, 10, 23, 23, 59, 59), AFTER = KST(2026, 11, 3, 0, 0, 0);

test('sale 키가 없으면 늘 보인다', () => {
  assert.equal(catalogVisible({ id: 'sofa' }, { now: AFTER }), true);
});
test('기간 안이면 보인다', () => {
  assert.equal(catalogVisible(item, { now: IN }), true);
});
test('기간 밖 + 보관분 0 이면 숨는다(전·후 모두)', () => {
  assert.equal(catalogVisible(item, { stored: 0, now: BEFORE }), false);
  assert.equal(catalogVisible(item, { stored: 0, now: AFTER }), false);
});
test('기간 밖이어도 보관분이 있으면 보인다', () => {
  assert.equal(catalogVisible(item, { stored: 1, now: AFTER }), true);
});
test('끝나는 날 23:59:59 까지는 열려 있다', () => {
  assert.equal(catalogVisible(item, { now: KST(2026, 11, 2, 23, 59, 59) }), true);
});
test('모르는 sale 키는 닫히지만 보관분은 보인다', () => {
  assert.equal(catalogVisible({ sale: 'nope' }, { now: IN }), false);
  assert.equal(catalogVisible({ sale: 'nope' }, { stored: 2, now: IN }), true);
});
test('창은 SALE_WINDOWS 한 곳이다', () => {
  assert.ok(SALE_WINDOWS.halloween.from && SALE_WINDOWS.halloween.to);
});
