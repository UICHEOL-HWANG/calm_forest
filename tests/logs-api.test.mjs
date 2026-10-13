import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { sanitizeBatch, onRequestPost, MAX_LOG_BODY } from '../functions/api/logs.js';

// 스펙: dev/active/client-logs/client-logs-plan.md §1 — Worker 수신부
const UUID = 'e6cccc8e-1553-43a7-abf5-60c0576202e2';
const NOW = Date.now();
const EV = (o = {}) => ({ id: '0b6f3c7a-1111-4222-8333-444455556666', ts: NOW, kind: 'error', msg: 'boom', ...o });

test('정상 묶음을 DB 행으로 바꾼다(ctx 는 행마다 펼친다)', () => {
  const rows = sanitizeBatch({ v: 1, ctx: { platform: 'android', uid: 'e6cccc8e', path: '/' }, events: [EV()], suppressed: 4 });
  assert.equal(rows.length, 1);
  assert.deepEqual(rows[0], { id: EV().id, ts: NOW, kind: 'error', msg: 'boom', stack: null, url: null, status: null, platform: 'android', uid8: 'e6cccc8e', path: '/', suppressed: 4 });
});

test('서버에서도 한 번 더 가린다(옛 클라이언트·조작된 요청 대비)', () => {
  const [r] = sanitizeBatch({ v: 1, ctx: {}, events: [EV({ msg: `x ${UUID} a@b.co`, url: '/api/x?token=abc' })] });
  assert.ok(!r.msg.includes(UUID));
  assert.ok(!r.msg.includes('a@b.co'));
  assert.equal(r.url, '/api/x');
});

test('형식이 틀린 묶음은 빈 배열(400 이 아니라 버림 — 기기가 같은 걸 계속 재전송하지 않게)', () => {
  for (const bad of [null, 'x', { v: 2, events: [] }, { v: 1, events: 'x' }, { v: 1 }]) {
    assert.deepEqual(sanitizeBatch(bad), [], JSON.stringify(bad));
  }
});

test('이벤트는 20개까지만, 잘못된 항목만 골라 버린다', () => {
  const many = Array.from({ length: 30 }, (_, i) => EV({ id: `0b6f3c7a-1111-4222-8333-${String(i).padStart(12, '0')}` }));
  assert.equal(sanitizeBatch({ v: 1, ctx: {}, events: many }).length, 20);
  const mixed = [EV(), EV({ id: 'not-a-uuid' }), EV({ id: '0b6f3c7a-1111-4222-8333-444455550000', kind: 'hack' })];
  assert.equal(sanitizeBatch({ v: 1, ctx: {}, events: mixed }).length, 1);
});

test('모르는 플랫폼·이상한 uid 는 null 로', () => {
  const [r] = sanitizeBatch({ v: 1, ctx: { platform: 'pc', uid: 'DROP TABLE' }, events: [EV()] });
  assert.equal(r.platform, null);
  assert.equal(r.uid8, null);
});

test('길이는 DB CHECK 보다 짧게 자른다', () => {
  const [r] = sanitizeBatch({ v: 1, ctx: { path: '/'.repeat(500) }, events: [EV({ msg: 'm'.repeat(5000), stack: 's'.repeat(5000), url: 'u'.repeat(5000), status: 99999 })] });
  assert.ok(r.msg.length <= 600 && r.stack.length <= 1100 && r.url.length <= 320 && r.path.length <= 120);
  assert.equal(r.status, null);
});

// ── 핸들러 ──
function env(fetchLog) {
  return { SUPABASE_URL: 'https://db.example', SUPABASE_SERVICE_KEY: 'svc', __fetch: fetchLog };
}
const req = (body, headers = {}) => new Request('https://calmforest.cloud/api/logs', { method: 'POST', body, headers });

test('본문이 크면 파싱 전에 거른다(413)', async () => {
  const res = await onRequestPost({ request: req('x', { 'content-length': String(MAX_LOG_BODY + 1) }), env: env() });
  assert.equal(res.status, 413);
});

test('정상 묶음은 RPC 한 번으로 적재하고 200', async () => {
  const calls = [];
  const fetchFn = async (url, init) => { calls.push({ url, init }); return new Response('1', { status: 200 }); };
  const res = await onRequestPost({ request: req(JSON.stringify({ v: 1, ctx: {}, events: [EV()] })), env: env(), fetchFn });
  assert.equal(res.status, 200);
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /\/rest\/v1\/rpc\/ingest_client_errors$/);
  assert.equal(calls[0].init.headers.authorization, 'Bearer svc');
  assert.equal(JSON.parse(calls[0].init.body).rows.length, 1);
});

test('버릴 것뿐이면 DB 를 부르지 않고 200', async () => {
  let called = false;
  const res = await onRequestPost({ request: req('{not json'), env: env(), fetchFn: async () => { called = true; } });
  assert.equal(res.status, 200);
  assert.equal(called, false);
});

test('RPC 가 4xx(형식·CHECK 위반)면 200 으로 버린다 — 기기가 같은 묶음을 계속 보내지 않게', async () => {
  const res = await onRequestPost({ request: req(JSON.stringify({ v: 1, ctx: {}, events: [EV()] })), env: env(), fetchFn: async () => new Response('x', { status: 400 }) });
  assert.equal(res.status, 200);
  assert.equal((await res.json()).dropped, true);
});

test('DB 가 실패하면 503 — 기기가 지우지 않고 다음에 다시 보낸다', async () => {
  const res = await onRequestPost({ request: req(JSON.stringify({ v: 1, ctx: {}, events: [EV()] })), env: env(), fetchFn: async () => new Response('x', { status: 500 }) });
  assert.equal(res.status, 503);
});

test('서비스 키가 없으면 503(조용히 200 으로 삼키지 않는다)', async () => {
  const res = await onRequestPost({ request: req(JSON.stringify({ v: 1, ctx: {}, events: [EV()] })), env: {}, fetchFn: async () => new Response('1') });
  assert.equal(res.status, 503);
});

test('worker/index.js 에 /api/logs 라우트가 등록돼 있다(404 사고 재발 방지)', () => {
  const src = readFileSync(new URL('../worker/index.js', import.meta.url), 'utf8');
  assert.match(src, /pathname === '\/api\/logs'/);
  assert.match(src, /from '\.\.\/functions\/api\/logs\.js'/);
});

// ── 리뷰 반영(2026-10-13) ──
test('반복으로 뺀 건수(suppressed)는 첫 행에만 싣는다(DAG 합계가 부풀지 않게)', () => {
  const ev2 = EV({ id: '0b6f3c7a-1111-4222-8333-444455557777' });
  const rows = sanitizeBatch({ v: 1, ctx: {}, events: [EV(), ev2], suppressed: 9 });
  assert.deepEqual(rows.map(r => r.suppressed), [9, 0]);
});

test('기기 시각(ts)이 지금 ±1년 밖이면 null(to_timestamp 범위 오류로 묶음 전체가 실패하지 않게)', () => {
  const [a] = sanitizeBatch({ v: 1, ctx: {}, events: [EV({ ts: 1e20 })] });
  const [b] = sanitizeBatch({ v: 1, ctx: {}, events: [EV({ ts: Date.now() })] });
  assert.equal(a.ts, null);
  assert.equal(typeof b.ts, 'number');
});

test('문자열이 아닌 msg·거대한 msg 도 빠르게 처리한다', () => {
  const t0 = performance.now();
  const rows = sanitizeBatch({ v: 1, ctx: {}, events: [EV({ msg: { a: 1 } }), EV({ id: '0b6f3c7a-1111-4222-8333-444455558888', msg: 'a'.repeat(60000) })] });
  assert.ok(performance.now() - t0 < 200);
  assert.equal(rows.length, 2);
});

test('content-length 없이 와도(청크 전송) 바이트 상한을 지킨다', async () => {
  const big = new TextEncoder().encode('가'.repeat(MAX_LOG_BODY));   // 3바이트 × 상한
  const stream = new ReadableStream({ start(c) { c.enqueue(big); c.close(); } });
  const request = new Request('https://calmforest.cloud/api/logs', { method: 'POST', body: stream, duplex: 'half' });
  const res = await onRequestPost({ request, env: env(), fetchFn: async () => new Response('1') });
  assert.equal(res.status, 413);
});

test('IP 당 요청 상한을 넘으면 429(기기는 다음에 다시)', async () => {
  const LOGS_LIMITER = { limit: async () => ({ success: false }) };
  let called = false;
  const res = await onRequestPost({ request: req(JSON.stringify({ v: 1, ctx: {}, events: [EV()] }), { 'cf-connecting-ip': '1.2.3.4' }),
    env: { ...env(), LOGS_LIMITER }, fetchFn: async () => { called = true; return new Response('1'); } });
  assert.equal(res.status, 429);
  assert.equal(called, false);
});
