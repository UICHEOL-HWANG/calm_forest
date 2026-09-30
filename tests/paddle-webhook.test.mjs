// tests/paddle-webhook.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { onRequestPost } from '../functions/api/paddle-webhook.js';
import { hmacHex } from '../functions/api/_paddle.js';

const SECRET = 's3cret';
const NOW = 1_800_000_000;
const UID = '3f2b1c9e-8a7d-4e6f-9b0a-1c2d3e4f5a6b';
const env = { PADDLE_WEBHOOK_SECRET: SECRET, SUPABASE_URL: 'https://x.supabase.co', SUPABASE_SERVICE_KEY: 'svc' };

async function req(body, { ts = NOW, badSig = false } = {}) {
  const h1 = badSig ? 'f'.repeat(64) : await hmacHex(SECRET, `${ts}:${body}`);
  return new Request('https://calm.test/api/paddle-webhook', { method: 'POST', headers: { 'paddle-signature': `ts=${ts};h1=${h1}` }, body });
}
function fakeFetch(status = 201) {
  const calls = [];
  const f = async (url, init) => { calls.push({ url: String(url), init }); return new Response(status === 204 ? null : '', { status }); };   // 204 는 본문이 null 이어야 Response 가 만들어진다
  f.calls = calls; return f;
}
const txn = JSON.stringify({ event_type: 'transaction.completed', notification_id: 'ntf_1', occurred_at: '2026-09-30T00:00:00.000Z',
  data: { id: 'txn_1', currency_code: 'KRW', custom_data: { user_id: UID }, details: { totals: { total: '2500' } }, items: [{ price: { id: 'pri_unknown' } }] } });
const refund = JSON.stringify({ event_type: 'adjustment.updated', occurred_at: '2026-10-01T00:00:00.000Z', data: { action: 'refund', status: 'approved', transaction_id: 'txn_1' } });

test('시크릿이 없으면 503 — 배포 실수를 조용히 삼키지 않는다', async () => {
  const r = await onRequestPost({ request: await req(txn), env: { ...env, PADDLE_WEBHOOK_SECRET: '' }, fetchImpl: fakeFetch(), now: NOW });
  assert.equal(r.status, 503);
});

test('서명이 틀리면 401, DB 는 부르지 않는다', async () => {
  const f = fakeFetch();
  const r = await onRequestPost({ request: await req(txn, { badSig: true }), env, fetchImpl: f, now: NOW });
  assert.equal(r.status, 401);
  assert.equal(f.calls.length, 0);
});

test('JSON 이 아니면 400', async () => {
  const r = await onRequestPost({ request: await req('not json'), env, fetchImpl: fakeFetch(), now: NOW });
  assert.equal(r.status, 400);
});

test('모르는 price_id 만 있으면 200 + skipped, DB 는 부르지 않는다', async () => {
  const f = fakeFetch();
  const r = await onRequestPost({ request: await req(txn), env, fetchImpl: f, now: NOW });
  assert.equal(r.status, 200);
  assert.deepEqual((await r.json()).skipped, ['pri_unknown']);
  assert.equal(f.calls.length, 0);
});

test('알려진 price_id → purchases POST(ignore-duplicates), 200 + inserted:1', async () => {
  const f = fakeFetch(201);
  const idx = new Map([['pri_unknown', { itemId: 'straw_hat', kind: 'cosmetic' }]]);
  const r = await onRequestPost({ request: await req(txn), env: { ...env, __PRICE_INDEX: idx }, fetchImpl: f, now: NOW });
  assert.equal(r.status, 200);
  assert.equal((await r.json()).inserted, 1);
  assert.equal(f.calls[0].url, 'https://x.supabase.co/rest/v1/purchases?on_conflict=event_id');
  assert.equal(f.calls[0].init.method, 'POST');
  assert.equal(f.calls[0].init.headers.Prefer, 'resolution=ignore-duplicates,return=minimal');
  const rows = JSON.parse(f.calls[0].init.body);
  assert.equal(rows[0].event_id, 'ntf_1:pri_unknown');
  assert.equal(rows[0].item_id, 'straw_hat');
});

test('환불 승인 → purchases PATCH(revoked_at), 200', async () => {
  const f = fakeFetch(204);
  const r = await onRequestPost({ request: await req(refund), env, fetchImpl: f, now: NOW });
  assert.equal(r.status, 200);
  assert.equal(f.calls.length, 1);
  assert.equal(f.calls[0].url, 'https://x.supabase.co/rest/v1/purchases?transaction_id=eq.txn_1&revoked_at=is.null');
  assert.equal(f.calls[0].init.method, 'PATCH');
  assert.deepEqual(JSON.parse(f.calls[0].init.body), { revoked_at: '2026-10-01T00:00:00.000Z' });
  assert.equal(f.calls[0].init.headers.apikey, 'svc');
});

test('DB 가 실패하면 500 — Paddle 재시도에 맡긴다', async () => {
  const r = await onRequestPost({ request: await req(refund), env, fetchImpl: fakeFetch(500), now: NOW });
  assert.equal(r.status, 500);
});

test('POST 가 아니면 405', async () => {
  const r = await onRequestPost({ request: new Request('https://calm.test/api/paddle-webhook', { method: 'GET' }), env, fetchImpl: fakeFetch(), now: NOW });
  assert.equal(r.status, 405);
});
