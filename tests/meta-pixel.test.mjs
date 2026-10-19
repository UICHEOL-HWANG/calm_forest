// tests/meta-pixel.test.mjs — 📣 Meta Pixel 규칙 · 결제 연결(2026-10-19)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fbcFromSearch, metaEventFor, purchaseParams, isFreshSignup, FRESH_SIGNUP_MS, attributionData } from '../js/meta-pixel-rules.js';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

test('fbcFromSearch — fbclid 가 있으면 fb.1.<ms>.<fbclid>, 없거나 이상한 값이면 null', () => {
  assert.equal(fbcFromSearch('?utm_source=meta&fbclid=IwAR0abc_-9', 1700000000000), 'fb.1.1700000000000.IwAR0abc_-9');
  assert.equal(fbcFromSearch('?utm_source=meta', 1), null);
  assert.equal(fbcFromSearch('', 1), null);
  assert.equal(fbcFromSearch('?fbclid=<script>', 1), null);
});

test('metaEventFor — GA4 이벤트 → Meta 표준 이벤트(대응 없는 건 null)', () => {
  assert.equal(metaEventFor('premium_row_view', { kind: 'cosmetic' }).event, 'ViewContent');
  assert.deepEqual(metaEventFor('cosmetic_tryon', { item_id: 'hat1' }).params.content_ids, ['hat1']);
  const ic = metaEventFor('cash_checkout_open', { item_id: 'cape', kind: 'cosmetic', price_id: 'pri_1' });
  assert.equal(ic.event, 'InitiateCheckout');
  assert.deepEqual(ic.params.content_ids, ['cape']);
  assert.equal(ic.params.num_items, 1);
  assert.equal(metaEventFor('paddle_step', { step: 'payment_selected', item_id: 'cape' }).event, 'AddPaymentInfo');
  assert.equal(metaEventFor('paddle_step', { step: 'loaded' }), null);
  assert.equal(metaEventFor('cash_checkout_done', { item_id: 'cape' }), null);   // Purchase 는 Paddle 데이터로만
  assert.equal(metaEventFor('chop_tree', {}), null);
});

test('purchaseParams — 금액·통화·거래 id(eventID) · 이메일·국가는 싣지 않는다', () => {
  const data = { transaction_id: 'txn_01', currency_code: 'KRW', totals: { total: 3300 },
    customer: { email: 'a@b.c', address: { country_code: 'KR' } } };
  const p = purchaseParams(data, { itemId: 'cape', kind: 'cosmetic' });
  assert.equal(p.eventId, 'txn_01');
  assert.equal(p.params.value, 3300);
  assert.equal(p.params.currency, 'KRW');
  assert.deepEqual(p.params.content_ids, ['cape']);
  assert.doesNotMatch(JSON.stringify(p), /a@b\.c|"KR"/);
  assert.equal(purchaseParams({ totals: { total: 1 } }), null);   // 거래 id 없으면 보내지 않는다
  assert.equal(purchaseParams({ transaction_id: 'txn_2' }).params.value, undefined);   // 금액 모르면 value 없이
});

test('isFreshSignup — 가입 30분 안의 진입만', () => {
  const now = Date.parse('2026-10-19T12:00:00Z');
  assert.equal(isFreshSignup('2026-10-19T11:59:00Z', now), true);
  assert.equal(isFreshSignup(new Date(now - FRESH_SIGNUP_MS - 1).toISOString(), now), false);
  assert.equal(isFreshSignup(null, now), false);
  assert.equal(isFreshSignup('2026-10-19T12:05:00Z', now), false);   // 시계 어긋남(미래)은 제외
});

test('attributionData — fbc·fbp·jid·client_id·utm, 빈 값은 뺀다', () => {
  const a = attributionData({ fbc: 'fb.1.1.x', fbp: null, clientId: 'c1',
    touch: { jid: 'j1', utm: { source: 'meta', medium: 'paid', campaign: 'launch', content: '' } } });
  assert.deepEqual(a, { fbc: 'fb.1.1.x', jid: 'j1', cid: 'c1', utm_source: 'meta', utm_medium: 'paid', utm_campaign: 'launch' });
  assert.deepEqual(attributionData({}), {});
});

test('연결 — paddle.js 가 customData.attr 를 싣고 completed 에서 Purchase · index.html 이 부팅·훅·가입', () => {
  const paddle = read('../js/shop/paddle.js'), html = read('../index.html'), cfg = read('../js/config.js');
  assert.match(paddle, /customData: \{ user_id: userId, item_id: itemId, kind, attr: safeAttr\(\) \}/);
  assert.match(paddle, /metaPurchase\(ev\.data, c\)/);
  assert.match(html, /bootMetaPixel\(\); onTrack\(metaFromTrack\)/);
  assert.match(html, /metaSignup\(\{ userId: authState\.userId/);
  assert.match(cfg, /META_PIXEL_ID:/);
});
