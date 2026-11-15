import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STAGE1_BUNDLE, PROMO_DECOR_IDS, KEYS, VIAS, normalizeGiftCode, readGiftParam, giftFromReferrer, nextClaims, settle } from '../js/promo-gift/rules.js';

test('상수', () => {
  assert.deepEqual({ ...STAGE1_BUNDLE }, { coins: 200, seed_wheat: 3, seed_corn: 3, seed_grape: 3, fert: 5, bait: 5 });
  assert.deepEqual([...PROMO_DECOR_IDS], ['promoballoon', 'promosuitcase']);
  assert.deepEqual({ ...KEYS }, { code: 'cf_gift_code', via: 'cf_gift_via', device: 'cf_gift_stage1_device', seen: 'cf_gift_link_seen' });
  assert.deepEqual([...VIAS], ['url', 'deeplink', 'referrer', 'toss', 'manual']);
});

test('normalizeGiftCode', () => {
  assert.equal(normalizeGiftCode(' autumn-24 '), 'AUTUMN24');
  assert.equal(normalizeGiftCode('ab cd'), 'ABCD');
  for (const bad of ['', null, undefined, 'ABC', 'A'.repeat(17), 'ABC!', '가나다라']) assert.equal(normalizeGiftCode(bad), null, String(bad));
});

test('readGiftParam — 경로·쿼리·전체 URL·스킴 URL', () => {
  assert.equal(readGiftParam('?gift=insta1'), 'INSTA1');
  assert.equal(readGiftParam('?utm_source=meta&gift=INSTA1#x'), 'INSTA1');
  assert.equal(readGiftParam('/g/INSTA1'), 'INSTA1');
  assert.equal(readGiftParam('https://calmforest.cloud/g/INSTA1?utm_source=x'), 'INSTA1');
  assert.equal(readGiftParam('intoss://calmforest?gift=INSTA1'), 'INSTA1');
  assert.equal(readGiftParam('?invite=ABCD2345'), null);
  assert.equal(readGiftParam('/i/ABCD2345'), null);
  assert.equal(readGiftParam(''), null);
  assert.equal(readGiftParam(null), null);
});

test('giftFromReferrer — 평문·인코딩', () => {
  assert.equal(giftFromReferrer('utm_source=web_banner&gift=INSTA1'), 'INSTA1');
  assert.equal(giftFromReferrer('utm_source%3Dweb_banner%26gift%3DINSTA1'), 'INSTA1');
  assert.equal(giftFromReferrer('utm_source=google-play&utm_medium=organic'), null);
  assert.equal(giftFromReferrer(''), null);
});

test('nextClaims', () => {
  assert.deepEqual(nextClaims({ hasCode: false, isGuest: true, provider: 'anonymous', stage1Device: false }), []);
  assert.deepEqual(nextClaims({ hasCode: true, isGuest: true, provider: 'offline', stage1Device: false }), []);
  assert.deepEqual(nextClaims({ hasCode: true, isGuest: true, provider: 'anonymous', stage1Device: false }), [1]);
  assert.deepEqual(nextClaims({ hasCode: true, isGuest: true, provider: 'anonymous', stage1Device: true }), []);
  assert.deepEqual(nextClaims({ hasCode: true, isGuest: false, provider: 'email', stage1Device: true }), [2]);
  assert.deepEqual(nextClaims({ hasCode: true, isGuest: false, provider: 'google', stage1Device: false }), [1, 2]);
});

test('settle — 결과별 코드 보관·기기 표시·창·중단', () => {
  assert.deepEqual(settle(1, null), { result: 'net_fail', keep: true, mark: false, show: null, stop: true });
  assert.deepEqual(settle(1, { error: 502 }), { result: 'net_fail', keep: true, mark: false, show: null, stop: true });
  assert.deepEqual(settle(1, { ok: true, new: true }), { result: 'new', keep: true, mark: true, show: 1, stop: false });
  assert.deepEqual(settle(1, { ok: true, new: false }), { result: 'dup', keep: true, mark: true, show: null, stop: false });
  assert.deepEqual(settle(2, { ok: true, new: true }), { result: 'new', keep: false, mark: false, show: 2, stop: false });
  assert.deepEqual(settle(2, { ok: true, new: false }), { result: 'dup', keep: false, mark: false, show: null, stop: false });
  assert.deepEqual(settle(2, { ok: false, reason: 'anonymous' }), { result: 'anonymous', keep: true, mark: false, show: null, stop: true });
  assert.deepEqual(settle(1, { ok: false, reason: 'not_started' }), { result: 'not_started', keep: true, mark: false, show: null, stop: true });
  for (const r of ['unknown', 'inactive', 'expired', 'full', 'bad_code']) {
    assert.deepEqual(settle(1, { ok: false, reason: r }), { result: r, keep: false, mark: false, show: null, stop: true }, r);
  }
});
