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

test('verifySignature — 빈 secret / 비문자 secret → bad_sig(throw 안 함)', async () => {
  assert.deepEqual(await verifySignature({ header: 'ts=1;h1=' + 'a'.repeat(64), rawBody: '{}', secret: '', now: NOW }), { ok: false, reason: 'bad_sig' });
  assert.deepEqual(await verifySignature({ header: 'ts=1;h1=' + 'a'.repeat(64), rawBody: '{}', secret: undefined, now: NOW }), { ok: false, reason: 'bad_sig' });
  assert.deepEqual(await verifySignature({ header: 'ts=1;h1=' + 'a'.repeat(64), rawBody: '{}', secret: null, now: NOW }), { ok: false, reason: 'bad_sig' });
});

test('verifySignature — 비문자 rawBody → bad_sig(throw 안 함)', async () => {
  const body = '{}';
  assert.deepEqual(await verifySignature({ header: await sign(body), rawBody: undefined, secret: SECRET, now: NOW }), { ok: false, reason: 'bad_sig' });
  assert.deepEqual(await verifySignature({ header: await sign(body), rawBody: null, secret: SECRET, now: NOW }), { ok: false, reason: 'bad_sig' });
});

test('verifySignature — 두 h1 중 두 번째만 유효(키 교체) → ok', async () => {
  const body = '{}';
  const garbage = 'f'.repeat(64);
  const valid = await hmacHex(SECRET, `${NOW}:${body}`);
  const header = `ts=${NOW};h1=${garbage};h1=${valid}`;
  assert.deepEqual(await verifySignature({ header, rawBody: body, secret: SECRET, now: NOW }), { ok: true });
});

test('verifySignature — ts 경계: NOW - 300 정확히 → ok, NOW - 301 → stale, NOW + 301 → stale', async () => {
  const body = '{}';
  assert.equal((await verifySignature({ header: await sign(body, NOW - 300), rawBody: body, secret: SECRET, now: NOW })).ok, true);
  assert.equal((await verifySignature({ header: await sign(body, NOW + 300), rawBody: body, secret: SECRET, now: NOW })).ok, true);
  assert.equal((await verifySignature({ header: await sign(body, NOW - 301), rawBody: body, secret: SECRET, now: NOW })).reason, 'stale');
  assert.equal((await verifySignature({ header: await sign(body, NOW + 301), rawBody: body, secret: SECRET, now: NOW })).reason, 'stale');
});

test('verifySignature — 틀린 secret → bad_sig', async () => {
  const body = '{}';
  const header = await sign(body);
  assert.deepEqual(await verifySignature({ header, rawBody: body, secret: 'wrong_secret', now: NOW }), { ok: false, reason: 'bad_sig' });
});

test('parseSignature — 63자 h1 / 비hex h1 → null (2/2 규칙)', () => {
  assert.equal(parseSignature('ts=123;h1=' + 'a'.repeat(63)), null);
  assert.equal(parseSignature('ts=123;h1=' + 'g'.repeat(64)), null);
});

test('verifySignature — 63자 h1 / 비hex h1 → bad_header', async () => {
  const body = '{}';
  assert.equal((await verifySignature({ header: 'ts=123;h1=' + 'a'.repeat(63), rawBody: body, secret: SECRET, now: NOW })).reason, 'bad_header');
  assert.equal((await verifySignature({ header: 'ts=123;h1=' + 'g'.repeat(64), rawBody: body, secret: SECRET, now: NOW })).reason, 'bad_header');
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
  assert.equal(r.event_id, 'txn_1:pri_hat');
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

test('ledgerRows — 멱등 키는 transaction id 기준 — notification_id 가 달라도(재전송·다중 엔드포인트) 같은 event_id', () => {
  const mk = (nid) => ledgerRows({ event_type: 'transaction.completed', notification_id: nid, occurred_at: '2026-09-30T01:02:03.000Z', data: { id: 'txn_1', currency_code: 'KRW', custom_data: { user_id: UID }, details: { totals: { total: '2500' } }, items: [{ price: { id: 'pri_hat' } }] } }, idx).rows[0].event_id;
  assert.equal(mk('ntf_1'), 'txn_1:pri_hat');
  assert.equal(mk('ntf_2'), 'txn_1:pri_hat');
  assert.equal(mk(undefined), 'txn_1:pri_hat');
});

test('ledgerRows — d.id 없으면 no_ids', () => {
  assert.deepEqual(ledgerRows({ event_type: 'transaction.completed', notification_id: 'ntf_1', occurred_at: '2026-09-30T01:02:03.000Z', data: { id: undefined, currency_code: 'KRW', custom_data: { user_id: UID }, details: { totals: { total: '2500' } }, items: [{ price: { id: 'pri_hat' } }] } }, idx), { rows: [], skipped: ['no_ids'] });
  assert.deepEqual(ledgerRows({ event_type: 'transaction.completed', notification_id: 'ntf_1', occurred_at: '2026-09-30T01:02:03.000Z', data: { id: '', currency_code: 'KRW', custom_data: { user_id: UID }, details: { totals: { total: '2500' } }, items: [{ price: { id: 'pri_hat' } }] } }, idx), { rows: [], skipped: ['no_ids'] });
});

test('ledgerRows — 같은 price_id 항목 여러 개 → 1행만 (dedupe)', () => {
  const { rows, skipped } = ledgerRows(txnEvt({ items: [{ price: { id: 'pri_hat' }, quantity: 2 }, { price: { id: 'pri_hat' }, quantity: 1 }] }), idx);
  assert.deepEqual(skipped, []);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].event_id, 'txn_1:pri_hat');
});

test('ledgerRows — details 없으면 amount null', () => {
  const { rows } = ledgerRows({ event_type: 'transaction.completed', notification_id: 'ntf_1', occurred_at: '2026-09-30T01:02:03.000Z', data: { id: 'txn_1', currency_code: 'KRW', custom_data: { user_id: UID }, details: {}, items: [{ price: { id: 'pri_hat' } }] } }, idx);
  assert.equal(rows[0].amount, null);
});

test('ledgerRows — total 빈 문자열이면 amount null', () => {
  const { rows } = ledgerRows({ event_type: 'transaction.completed', notification_id: 'ntf_1', occurred_at: '2026-09-30T01:02:03.000Z', data: { id: 'txn_1', currency_code: 'KRW', custom_data: { user_id: UID }, details: { totals: { total: '' } }, items: [{ price: { id: 'pri_hat' } }] } }, idx);
  assert.equal(rows[0].amount, null);
});

test('revokeTarget — refund/chargeback 이 approved 일 때만', () => {
  const adj = (action, status, type = 'adjustment.updated') => ({ event_type: type, occurred_at: '2026-10-01T00:00:00.000Z', data: { action, status, transaction_id: 'txn_1' } });
  assert.deepEqual(revokeTarget(adj('refund', 'approved')), { transaction_id: 'txn_1', revoked_at: '2026-10-01T00:00:00.000Z' });
  assert.deepEqual(revokeTarget(adj('chargeback', 'approved', 'adjustment.created')), { transaction_id: 'txn_1', revoked_at: '2026-10-01T00:00:00.000Z' });
  assert.equal(revokeTarget(adj('refund', 'pending_approval')), null);
  assert.equal(revokeTarget(adj('credit', 'approved')), null);
  assert.equal(revokeTarget({ event_type: 'transaction.completed', data: {} }), null);
});
