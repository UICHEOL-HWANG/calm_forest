import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shopCueVisible } from '../js/spaces/shop-cue-rules.js';

test('시간이 남아 있고 숨김이 아니면 보인다', () => {
  assert.equal(shopCueVisible({ now: 10, until: 15, hidden: false }), true);
});

test('끝나는 순간까지는 보이고, 지나면 안 보인다', () => {
  assert.equal(shopCueVisible({ now: 15, until: 15, hidden: false }), true);
  assert.equal(shopCueVisible({ now: 15.01, until: 15, hidden: false }), false);
});

test('안내 중 숨김이면 시간이 남아도 안 보인다', () => {
  assert.equal(shopCueVisible({ now: 10, until: 15, hidden: true }), false);
});

test('숨김이 풀리면 남은 시간만큼 다시 보인다', () => {
  const until = 15;
  assert.equal(shopCueVisible({ now: 11, until, hidden: true }), false);
  assert.equal(shopCueVisible({ now: 12, until, hidden: false }), true);
  assert.equal(shopCueVisible({ now: 16, until, hidden: false }), false);
});

test('한 번도 띄운 적 없으면(until 0) 안 보인다', () => {
  assert.equal(shopCueVisible({ now: 3, until: 0, hidden: false }), false);
});
