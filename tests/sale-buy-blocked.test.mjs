import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buyBlocked, SALE_ENDED_MSG } from '../js/shop/sale-window.js';

const def = { id: 'x', sale: 'halloween' };
const KST = (y, m, d, h = 0, mi = 0, s = 0) => Date.UTC(y, m - 1, d, h, mi, s) - 9 * 3600 * 1000;
const IN = KST(2026, 10, 25, 12), BEFORE = KST(2026, 10, 23, 23, 59, 59), AFTER = KST(2026, 11, 3, 0, 0, 0);

test('기간 안에는 어떤 경우에도 막지 않는다', () => {
  assert.equal(buyBlocked({ def, now: IN }), false);
});
test('기간 밖(전·후) 신규 구매는 막는다', () => {
  assert.equal(buyBlocked({ def, now: BEFORE }), true);
  assert.equal(buyBlocked({ def, now: AFTER }), true);
});
test('silent·free·fromStore 는 각각 단독으로 통과시킨다', () => {
  assert.equal(buyBlocked({ def, now: AFTER, silent: true }), false);
  assert.equal(buyBlocked({ def, now: AFTER, free: true }), false);
  assert.equal(buyBlocked({ def, now: AFTER, fromStore: true }), false);
});
test('sale 이 없는 항목은 기간 밖에서도 막지 않는다', () => {
  assert.equal(buyBlocked({ def: { id: 'sofa' }, now: AFTER }), false);
});
test('def 가 없으면 막지 않는다', () => {
  assert.equal(buyBlocked({ now: AFTER }), false);
  assert.equal(buyBlocked(), false);
});
test('모르는 sale 키는 신규 구매를 막는다(닫는 쪽으로 틀린다)', () => {
  assert.equal(buyBlocked({ def: { sale: 'nope' }, now: IN }), true);
  assert.equal(buyBlocked({ def: { sale: 'nope' }, now: IN, fromStore: true }), false);
});
test('토스트 문구는 한 곳(SALE_ENDED_MSG)이다', () => {
  assert.equal(SALE_ENDED_MSG, '🎃 할로윈 장식 판매가 끝났어요');
});
