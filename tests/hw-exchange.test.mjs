import { test } from 'node:test';
import assert from 'node:assert/strict';
import { REWARDS, BUNDLE_DAILY_LIMIT, rewardOf, checkExchange, applyExchange, normalizeBundles } from '../js/halloween/exchange.js';

const D = '2026-10-22';

test('보상표 — 한정 장식 3 · 생활 꾸러미 3 (스펙 §6)', () => {
  assert.deepEqual(REWARDS.filter(r => r.tab === 'decor').map(r => [r.id, r.cost]), [['ghostDoll', 8], ['candyBasket', 14], ['jackLamp', 20]]);
  assert.deepEqual(REWARDS.filter(r => r.tab === 'bundle').map(r => [r.id, r.cost]), [['hwCoins', 3], ['hwFert', 4], ['hwBait', 3]]);
  assert.deepEqual(rewardOf('hwCoins').give, { coins: 15 });
  assert.deepEqual(rewardOf('hwFert').give, { fert: 2 });
  assert.deepEqual(rewardOf('hwBait').give, { bait: 5 });
  assert.equal(BUNDLE_DAILY_LIMIT, 2);
});

test('checkExchange — 사탕이 모자라면 need 를 알려 준다', () => {
  assert.deepEqual(checkExchange({ candy: 5, bundles: null, open: true }, 'ghostDoll', D), { ok: false, reason: 'candy', need: 3 });
});

test('checkExchange — 기간 밖·모르는 보상은 막는다', () => {
  assert.equal(checkExchange({ candy: 99, open: false }, 'ghostDoll', D).reason, 'closed');
  assert.equal(checkExchange({ candy: 99, open: true }, 'nope', D).reason, 'unknown');
});

test('applyExchange — 장식은 사탕을 빼고 decor id 를 돌려준다', () => {
  const r = applyExchange({ candy: 10, bundles: null, open: true }, 'ghostDoll', D);
  assert.equal(r.ok, true);
  assert.equal(r.candy, 2);
  assert.equal(r.decor, 'ghostDoll');
  assert.equal(r.give, null);
});

test('applyExchange — 꾸러미는 하루 보상별 2번까지', () => {
  let s = { candy: 20, bundles: null, open: true };
  for (let i = 0; i < 2; i++) {
    const r = applyExchange(s, 'hwCoins', D);
    assert.equal(r.ok, true);
    assert.deepEqual(r.give, { coins: 15 });
    s = { ...s, candy: r.candy, bundles: r.bundles };
  }
  assert.equal(s.candy, 14);
  const third = applyExchange(s, 'hwCoins', D);
  assert.equal(third.ok, false);
  assert.equal(third.reason, 'limit');
  assert.equal(applyExchange(s, 'hwBait', D).ok, true, '다른 꾸러미는 따로 센다');
});

test('normalizeBundles — 날이 바뀌면 횟수가 초기화된다', () => {
  assert.deepEqual(normalizeBundles({ day: D, used: { hwCoins: 2 } }, '2026-10-23'), { day: '2026-10-23', used: {} });
  assert.deepEqual(normalizeBundles({ day: D, used: { hwCoins: 2, x: 'a' } }, D), { day: D, used: { hwCoins: 2 } });
  assert.deepEqual(normalizeBundles(undefined, D), { day: D, used: {} });
});

test('applyExchange — 얼린 입력도 깨지지 않는다(입력을 바꾸지 않는다)', () => {
  const s = Object.freeze({ candy: 20, bundles: Object.freeze({ day: D, used: Object.freeze({}) }), open: true });
  assert.equal(applyExchange(s, 'jackLamp', D).ok, true);
  assert.equal(applyExchange(s, 'hwFert', D).ok, true);
});
