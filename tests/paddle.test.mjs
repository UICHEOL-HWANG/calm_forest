// tests/paddle.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSignature, hmacHex, verifySignature, priceIndex, ledgerRows, revokeTarget, TOLERANCE_SEC } from '../functions/api/_paddle.js';

const SECRET = 'pdl_ntfset_test_secret';
const NOW = 1_800_000_000;   // 초
async function sign(body, ts = NOW) { return `ts=${ts};h1=${await hmacHex(SECRET, `${ts}:${body}`)}`; }

test('parseSignature — ts 와 h1(여러 개 가능)을 읽는다, 형식이 틀리면 null', () => {
  assert.deepEqual(parseSignature('ts=123;h1=' + 'a'.repeat(64)), { ts: 123, h1: ['a'.repeat(64)] });
  assert.equal(parseSignature('ts=123;h1=' + 'a'.repeat(64) + ';h1=' + 'b'.repeat(64)).h1.length, 2);
  assert.equal(parseSignature('garbage'), null);
  assert.equal(parseSignature(null), null);
  assert.equal(parseSignature('ts=abc;h1=' + 'a'.repeat(64)), null);
});

test('verifySignature — 올바른 서명 통과', async () => {
  const body = '{"event_type":"transaction.completed"}';
  assert.deepEqual(await verifySignature({ header: await sign(body), rawBody: body, secret: SECRET, now: NOW }), { ok: true });
});

test('verifySignature — 바디가 한 글자라도 다르면 거부(원문으로 검증해야 하는 이유)', async () => {
  const body = '{"a":1}';
  const r = await verifySignature({ header: await sign(body), rawBody: '{"a": 1}', secret: SECRET, now: NOW });
  assert.deepEqual(r, { ok: false, reason: 'bad_sig' });
});

test('verifySignature — ts 가 5분 넘게 오래되면 거부, 5분 안이면 통과', async () => {
  const body = '{}';
  assert.equal(TOLERANCE_SEC, 300);
  assert.equal((await verifySignature({ header: await sign(body, NOW - 301), rawBody: body, secret: SECRET, now: NOW })).reason, 'stale');
  assert.equal((await verifySignature({ header: await sign(body, NOW - 299), rawBody: body, secret: SECRET, now: NOW })).ok, true);
});

test('verifySignature — 헤더 없음/깨짐은 bad_header', async () => {
  assert.equal((await verifySignature({ header: null, rawBody: '{}', secret: SECRET, now: NOW })).reason, 'bad_header');
});

test('priceIndex — cash 가 있는 항목만 priceId → {itemId, kind}', () => {
  const idx = priceIndex();
  for (const [pid, v] of idx) { assert.match(pid, /^pri_/); assert.ok(['cosmetic', 'pet'].includes(v.kind)); assert.equal(typeof v.itemId, 'string'); }
});

const UID = '3f2b1c9e-8a7d-4e6f-9b0a-1c2d3e4f5a6b';
const idx = new Map([['pri_hat', { itemId: 'straw_hat', kind: 'cosmetic' }], ['pri_leaf', { itemId: 'leaf', kind: 'pet' }]]);
const txnEvt = (over = {}) => ({
  event_type: 'transaction.completed', notification_id: 'ntf_1', occurred_at: '2026-09-30T01:02:03.000Z',
  data: { id: 'txn_1', currency_code: 'KRW', custom_data: { user_id: UID, item_id: 'straw_hat' },
          details: { totals: { total: '2500' } }, items: [{ price: { id: 'pri_hat' }, quantity: 1 }], ...over },
});

test('ledgerRows — transaction.completed → 항목당 1행, event_id = ntf:price', () => {
  const { rows, skipped } = ledgerRows(txnEvt(), idx);
  assert.deepEqual(skipped, []);
  assert.equal(rows.length, 1);
  const r = rows[0];
  assert.equal(r.event_id, 'ntf_1:pri_hat');
  assert.equal(r.transaction_id, 'txn_1');
  assert.equal(r.user_id, UID);
  assert.equal(r.item_id, 'straw_hat');
  assert.equal(r.kind, 'cosmetic');
  assert.equal(r.price_id, 'pri_hat');
  assert.equal(r.amount, 2500);
  assert.equal(r.currency, 'KRW');
  assert.equal(r.occurred_at, '2026-09-30T01:02:03.000Z');
  assert.equal(r.raw.id, 'txn_1');
});

test('ledgerRows — item 은 custom_data 가 아니라 price_id 로 정한다', () => {
  const { rows } = ledgerRows(txnEvt({ custom_data: { user_id: UID, item_id: 'sparkle' } }), idx);
  assert.equal(rows[0].item_id, 'straw_hat');
});

test('ledgerRows — 모르는 price_id 는 skipped 로, 나머지는 기록', () => {
  const { rows, skipped } = ledgerRows(txnEvt({ items: [{ price: { id: 'pri_zzz' } }, { price: { id: 'pri_leaf' } }] }), idx);
  assert.deepEqual(skipped, ['pri_zzz']);
  assert.deepEqual(rows.map(r => [r.item_id, r.kind]), [['leaf', 'pet']]);
});

test('ledgerRows — user_id 가 없거나 uuid 가 아니면 행 없음(no_user)', () => {
  assert.deepEqual(ledgerRows(txnEvt({ custom_data: {} }), idx), { rows: [], skipped: ['no_user'] });
  assert.deepEqual(ledgerRows(txnEvt({ custom_data: { user_id: 'not-a-uuid' } }), idx), { rows: [], skipped: ['no_user'] });
});

test('ledgerRows — 다른 이벤트는 빈 결과', () => {
  assert.deepEqual(ledgerRows({ event_type: 'transaction.paid', data: {} }, idx), { rows: [], skipped: [] });
});

test('revokeTarget — refund/chargeback 이 approved 일 때만', () => {
  const adj = (action, status, type = 'adjustment.updated') => ({ event_type: type, occurred_at: '2026-10-01T00:00:00.000Z', data: { action, status, transaction_id: 'txn_1' } });
  assert.deepEqual(revokeTarget(adj('refund', 'approved')), { transaction_id: 'txn_1', revoked_at: '2026-10-01T00:00:00.000Z' });
  assert.deepEqual(revokeTarget(adj('chargeback', 'approved', 'adjustment.created')), { transaction_id: 'txn_1', revoked_at: '2026-10-01T00:00:00.000Z' });
  assert.equal(revokeTarget(adj('refund', 'pending_approval')), null);
  assert.equal(revokeTarget(adj('credit', 'approved')), null);
  assert.equal(revokeTarget({ event_type: 'transaction.completed', data: {} }), null);
});
