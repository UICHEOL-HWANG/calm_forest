// tests/checkout-funnel.test.mjs — 💳 결제 퍼널·이탈 트래킹(2026-10-02)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { STEPS, stepOf, startFunnel, advance, stepProps, closeProps } from '../js/shop/checkout-funnel.js';
import { checkoutEventRow, FUNNEL_EVENTS } from '../functions/api/_paddle.js';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const UID = '11111111-2222-3333-4444-555555555555';

test('단계 사다리 — 뜸 → 이메일 → 결제수단 → 결제 시도 → 완료', () => {
  assert.deepEqual(STEPS.map(s => s.id), ['loaded', 'customer', 'payment_selected', 'payment_initiated', 'completed']);
  assert.equal(stepOf('checkout.loaded').id, 'loaded');
  assert.equal(stepOf('checkout.customer.created').id, 'customer');
  assert.equal(stepOf('checkout.customer.updated').id, 'customer');
  assert.equal(stepOf('checkout.payment.selected').id, 'payment_selected');
  assert.equal(stepOf('checkout.payment.initiated').id, 'payment_initiated');
  assert.equal(stepOf('checkout.payment.failed').id, 'payment_failed');
  assert.equal(stepOf('checkout.completed').id, 'completed');
  assert.equal(stepOf('checkout.items.updated'), null);   // 퍼널 단계가 아닌 이벤트는 무시
});

test('advance — 새 객체를 돌려준다(불변) · 최고 단계는 내려가지 않는다 · 실패는 횟수로 센다', () => {
  const s0 = startFunnel(1000);
  const s1 = advance(s0, 'checkout.loaded', 1200);
  assert.notEqual(s1, s0); assert.equal(s0.last, null);
  const s2 = advance(advance(s1, 'checkout.payment.initiated', 3000), 'checkout.payment.failed', 3500);
  assert.equal(s2.max, 'payment_initiated');
  assert.equal(s2.last, 'payment_failed');
  assert.equal(s2.failures, 1);
  const s3 = advance(s2, 'checkout.customer.updated', 4000);   // 실패 후 이메일을 고쳐도 최고 단계는 유지
  assert.equal(s3.max, 'payment_initiated'); assert.equal(s3.last, 'customer');
});

test('stepProps — GA4 에 보낼 값만: 단계·순위·경과·결제수단 종류·오류 코드. 이메일·국가·고객 id 는 빠진다', () => {
  const ev = { name: 'checkout.payment.failed', data: { customer: { email: 'a@b.c', id: 'ctm_1', address: { country_code: 'KR' } },
    payment: { method_details: { type: 'card' } } }, error: { type: 'payment_error', code: 'declined', detail: 'Card declined for a@b.c' } };
  const s = advance(startFunnel(0), 'checkout.payment.failed', 2500);
  const p = stepProps(ev, s);
  assert.deepEqual(p, { step: 'payment_failed', step_rank: 4, ms_since_open: 2500, method: 'card', error_code: 'declined' });
  assert.doesNotMatch(JSON.stringify(p), /@|ctm_|KR/);
});

test('closeProps — 닫을 때 마지막·최고 단계, 실패 횟수, 머문 시간', () => {
  let s = startFunnel(0);
  s = advance(s, 'checkout.loaded', 500);
  s = advance(s, 'checkout.customer.created', 4000);
  assert.deepEqual(closeProps(s, 9000), { last_step: 'customer', max_step: 'customer', max_rank: 2, payment_failures: 0, dwell_ms: 9000 });
  assert.deepEqual(closeProps(startFunnel(0), 300), { last_step: 'none', max_step: 'none', max_rank: 0, payment_failures: 0, dwell_ms: 300 });
});

test('서버 — transaction.* 알림만 checkout_events 행으로(이메일·고객 정보 없이)', () => {
  assert.ok(FUNNEL_EVENTS.includes('transaction.created'));
  assert.ok(FUNNEL_EVENTS.includes('transaction.payment_failed'));
  const idx = new Map([['pri_x', { itemId: 'tools_moon', kind: 'cosmetic' }]]);
  const evt = { event_id: 'evt_1', event_type: 'transaction.payment_failed', occurred_at: '2026-10-02T06:00:00Z',
    data: { id: 'txn_1', status: 'ready', origin: 'web', currency_code: 'KRW', custom_data: { user_id: UID },
      customer_id: 'ctm_9', items: [{ price: { id: 'pri_x' } }], details: { totals: { total: '5000' } },
      payments: [{ status: 'error', error_code: 'declined', method_details: { type: 'card' } }] } };
  const row = checkoutEventRow(evt, idx);
  assert.deepEqual(row, { event_id: 'evt_1', event_type: 'transaction.payment_failed', transaction_id: 'txn_1', status: 'ready',
    user_id: UID, item_ids: ['tools_moon'], origin: 'web', amount: 5000, currency: 'KRW', method: 'card', error_code: 'declined',
    occurred_at: '2026-10-02T06:00:00Z' });
  assert.doesNotMatch(JSON.stringify(row), /ctm_/);
  assert.equal(checkoutEventRow({ event_type: 'adjustment.created', data: {} }, idx), null);
  assert.equal(checkoutEventRow({ ...evt, data: { ...evt.data, custom_data: { user_id: 'nope' } } }, idx).user_id, null);   // 잘못된 uid 는 버린다
});

test('웹훅 — checkout_events 적재 실패는 로그만(구매 원장·200 을 막지 않는다)', () => {
  const src = read('../functions/api/paddle-webhook.js');
  assert.match(src, /checkoutEventRow\(/);
  assert.match(src, /checkout_events\?on_conflict=event_id/);
  assert.match(src, /funnel_insert_fail/);
});

test('클라이언트 — 결제창 단계 GA4(paddle_step) · 닫힘에 마지막 단계 · 입어보기(cosmetic_tryon)', () => {
  const paddle = read('../js/shop/paddle.js'), cafe = read('../js/spaces/cafe.js');
  assert.match(paddle, /handlers\.onStep\(/);
  assert.match(cafe, /trackEvent\('paddle_step'/);
  assert.match(cafe, /trackEvent\('cash_checkout_close', \{ item_id: c\.itemId, kind: c\.kind, \.\.\.closeProps\(/);
  assert.match(cafe, /trackEvent\('cosmetic_tryon'/);
});

test('SQL — checkout_events 테이블(이벤트 id 멱등, RLS 켜고 정책 없음 = 서비스 키 전용)', () => {
  const sql = read('../sql/migrations/migrate_checkout_events.sql');
  assert.match(sql, /create table if not exists public\.checkout_events/);
  assert.match(sql, /event_id\s+text not null unique/);
  assert.match(sql, /enable row level security/);
  assert.doesNotMatch(sql, /email/);
});
