import { test } from 'node:test';
import assert from 'node:assert/strict';
import { maskText, stripUrl, createErrorReporter, ERR_STORE_KEY } from '../js/client-errors.js';

// 스펙: dev/active/client-logs/client-logs-plan.md (§1 구조 · §3 원칙)

const UUID = 'e6cccc8e-1553-43a7-abf5-60c0576202e2';

function memStorage(init = {}) {
  const m = new Map(Object.entries(init));
  return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k), _m: m };
}

function rig(over = {}) {
  let t = 1_000_000;
  const sent = [];
  let ok = true;
  const storage = over.storage || memStorage();
  const r = createErrorReporter({
    send: async (body, opts) => { sent.push({ body, opts }); return ok; },
    storage,
    now: () => t,
    newId: (() => { let i = 0; return () => `id${++i}`; })(),
    context: () => ({ platform: 'web', uid: UUID }),
    ...over,
  });
  return { r, sent, storage, tick: ms => { t += ms; }, fail: () => { ok = false; }, recover: () => { ok = true; } };
}

// ── 마스킹 ──
test('UUID 는 앞 8자만 남긴다', () => {
  assert.equal(maskText(`세션 연결 완료 ${UUID}`), '세션 연결 완료 e6cccc8e…');
});

test('이메일·JWT·API 키·Bearer 토큰은 지운다', () => {
  const s = maskText('a@b.co eyJhbGciOi.eyJzdWIiOiIx.c2lnbmF0dXJl sb_secret_abc123XYZ sk-ant-api03-xyz Bearer abc.def');
  assert.ok(!s.includes('a@b.co'));
  assert.ok(!s.includes('eyJhbGciOi'));
  assert.ok(!s.includes('sb_secret_abc123XYZ'));
  assert.ok(!s.includes('sk-ant-api03-xyz'));
  assert.ok(!s.includes('abc.def'));
});

test('너무 긴 문자열은 자른다', () => {
  assert.ok(maskText('x'.repeat(5000), 500).length <= 501);
});

test('문자열이 아니어도 던지지 않는다', () => {
  assert.equal(typeof maskText(undefined), 'string');
  assert.equal(typeof maskText({ a: 1 }), 'string');
});

test('URL 은 쿼리·해시를 버린다(토큰이 쿼리에 실려 오는 경우)', () => {
  assert.equal(stripUrl('https://x.supabase.co/rest/v1/saves?select=*&apikey=sb_publishable_x#a'), 'https://x.supabase.co/rest/v1/saves');
  assert.equal(stripUrl('/api/logs?x=1'), '/api/logs');
});

// ── 기록·전송 ──
test('보고한 오류는 마스킹되고 사용자 UUID 는 앞 8자만 실린다', async () => {
  const { r, sent } = rig();
  r.report({ kind: 'error', msg: `boom ${UUID}`, stack: 'at a@b.co' });
  await r.flush();
  assert.equal(sent.length, 1);
  const { body } = sent[0];
  assert.equal(body.ctx.uid, 'e6cccc8e');
  assert.equal(body.events[0].msg, 'boom e6cccc8e…');
  assert.ok(!JSON.stringify(body).includes(UUID));
  assert.ok(!JSON.stringify(body).includes('a@b.co'));
  assert.equal(body.events[0].id, 'id1');
});

test('같은 오류가 반복되면 3번까지만 담고 나머지는 횟수로 센다', async () => {
  const { r, sent } = rig();
  for (let i = 0; i < 50; i++) r.report({ kind: 'error', msg: 'per-frame' });
  await r.flush();
  const ev = sent[0].body.events;
  assert.equal(ev.length, 3);
  assert.equal(sent[0].body.suppressed, 47);
});

test('묶음이 maxBatch 에 차면 바로 보낸다', async () => {
  const { r, sent } = rig({ maxBatch: 5 });
  for (let i = 0; i < 5; i++) r.report({ kind: 'error', msg: `e${i}` });
  await new Promise(res => setImmediate(res));
  assert.equal(sent.length, 1);
  assert.equal(sent[0].body.events.length, 5);
});

test('전송 간격(minIntervalMs)보다 빨리 다시 보내지 않는다', async () => {
  const { r, sent, tick } = rig({ minIntervalMs: 30_000 });
  r.report({ kind: 'error', msg: 'a' });
  await r.flush();
  r.report({ kind: 'error', msg: 'b' });
  await r.flush();
  assert.equal(sent.length, 1);
  tick(30_000);
  await r.flush();
  assert.equal(sent.length, 2);
});

test('나갈 때(beacon)는 간격과 상관없이 보낸다', async () => {
  const { r, sent } = rig({ minIntervalMs: 30_000 });
  r.report({ kind: 'error', msg: 'a' });
  await r.flush();
  r.report({ kind: 'error', msg: 'b' });
  await r.flush({ beacon: true });
  assert.equal(sent.length, 2);
  assert.equal(sent[1].opts.beacon, true);
});

test('세션당 전송 상한(maxSends)을 넘기지 않는다(성공한 전송만 센다) — Workers 요청 한도 공유', async () => {
  const { r, sent, tick } = rig({ maxSends: 2, minIntervalMs: 0 });
  for (let i = 0; i < 5; i++) { r.report({ kind: 'error', msg: `m${i}` }); await r.flush(); tick(1); }
  assert.equal(sent.length, 2);
});

test('보낼 게 없으면 요청하지 않는다', async () => {
  const { r, sent } = rig();
  await r.flush();
  assert.equal(sent.length, 0);
});

// ── 유실 방지 ──
test('보내기 전 오류는 저장소에 남고, 다음 실행 때 다시 보낸다', async () => {
  const storage = memStorage();
  const a = rig({ storage });
  a.r.report({ kind: 'error', msg: 'crash-before-send' });
  assert.ok(storage.getItem(ERR_STORE_KEY).includes('crash-before-send'));

  const b = rig({ storage });          // 앱 재실행
  await b.r.flush();
  assert.equal(b.sent.length, 1);
  assert.equal(b.sent[0].body.events[0].msg, 'crash-before-send');
  assert.equal(storage.getItem(ERR_STORE_KEY), null);
});

test('전송 실패면 지우지 않고 다음에 다시 보낸다(같은 id — 서버가 중복 제거)', async () => {
  const { r, sent, fail, recover, tick } = rig({ minIntervalMs: 0 });
  r.report({ kind: 'error', msg: 'x' });
  fail();
  await r.flush();
  recover(); tick(30_000);
  await r.flush();
  assert.equal(sent.length, 2);
  assert.equal(sent[0].body.events[0].id, sent[1].body.events[0].id);
});

test('send 가 던져도 수집기는 죽지 않는다', async () => {
  const { r } = rig({ send: async () => { throw new Error('net'); } });
  r.report({ kind: 'error', msg: 'x' });
  await r.flush();
  assert.equal(r.pendingCount(), 1);
});

test('저장소에는 최대 50건만 남긴다(오래된 것부터 버림)', () => {
  const { r, storage } = rig({ maxBatch: 1000 });
  for (let i = 0; i < 80; i++) r.report({ kind: 'error', msg: `m${i}` });
  const saved = JSON.parse(storage.getItem(ERR_STORE_KEY));
  assert.equal(saved.length, 50);
  assert.equal(saved[0].msg, 'm30');
});

test('저장소가 깨져 있거나 접근이 막혀도 던지지 않는다', () => {
  assert.doesNotThrow(() => rig({ storage: memStorage({ [ERR_STORE_KEY]: '{not json' }) }));
  const blocked = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); }, removeItem() {} };
  assert.doesNotThrow(() => rig({ storage: blocked }).r.report({ kind: 'error', msg: 'x' }));
});

test('dev 세션(enabled=false)은 서버로 보내지 않는다', async () => {
  const { r, sent } = rig({ enabled: false });
  r.report({ kind: 'error', msg: 'x' });
  await r.flush({ beacon: true });
  assert.equal(sent.length, 0);
});

// ── 리뷰 반영(2026-10-13) ──
test('🛟 maskText 는 아주 긴 입력에도 빠르다(정규식 2차 시간 방지)', () => {
  for (const big of ['a'.repeat(60000), 'eyJ'.repeat(20000), 'a@'.repeat(30000)]) {
    const t0 = performance.now();
    maskText(big, 600);
    assert.ok(performance.now() - t0 < 100, `${big.slice(0, 6)}… ${performance.now() - t0}ms`);
  }
});

test('🛟 NUL·반쪽 서로게이트를 없애고 이모지를 반으로 자르지 않는다(DB jsonb 거부 방지)', () => {
  assert.ok(!maskText('a\u0000b').includes('\u0000'));
  assert.equal(maskText('x\uD83C'), 'x\uFFFD');
  const cut = maskText('🌿'.repeat(10), 3);
  assert.ok([...cut].every(ch => ch === '🌿' || ch === '…'), cut);
});

test('사파리·파이어폭스 스택(fn@https://…)의 함수 이름은 지우지 않는다', () => {
  assert.equal(maskText('openShop@https://calmforest.cloud/js/game.js:10:5'), 'openShop@https://calmforest.cloud/js/game.js:10:5');
});

test('토큰 필드·URL 쿼리 속 키는 가린다', () => {
  const s = maskText('{"refresh_token":"r3fr3sh","access_token":"acc"} https://x/y?apikey=K3Y&a=1');
  assert.ok(!s.includes('r3fr3sh') && !s.includes('acc"') && !s.includes('K3Y'), s);
});

test('스택 속 스크립트 URL 의 쿼리는 버린다', () => {
  assert.ok(!maskText('at go (https://x/js/game.js?v=3&t=abc:1:2)').includes('?v=3'));
});

test('반복으로 뺀 건수만 있고 보낼 오류가 없으면 보내지 않는다', async () => {
  const { r, sent } = rig({ minIntervalMs: 0 });
  for (let i = 0; i < 5; i++) r.report({ kind: 'error', msg: 'same' });
  await r.flush();
  for (let i = 0; i < 5; i++) r.report({ kind: 'error', msg: 'same' });
  await r.flush();
  assert.equal(sent.length, 1);
  assert.equal(sent[0].body.suppressed, 2);
});

test('실패 뒤에는 간격을 늘려 기다린다(backoff) — 실패는 전송 상한을 먹지 않는다', async () => {
  const { r, sent, fail, recover, tick } = rig({ minIntervalMs: 0, maxSends: 1 });
  r.report({ kind: 'error', msg: 'x' });
  fail();
  await r.flush();
  tick(1);
  await r.flush();
  assert.equal(sent.length, 1);            // backoff 중
  recover(); tick(60_000);
  await r.flush();
  assert.equal(sent.length, 2);            // 상한 1 이어도 앞의 실패는 세지 않았다
});

test("서버가 '버려라'(형식 오류·413)라고 하면 그 묶음을 지운다(대기열이 영원히 막히지 않게)", async () => {
  const { r, storage } = rig({ send: async () => 'drop' });
  r.report({ kind: 'error', msg: 'poison' });
  await r.flush();
  assert.equal(r.pendingCount(), 0);
  assert.equal(storage.getItem(ERR_STORE_KEY), null);
});

test('묶음이 너무 크면(한글 3바이트 포함) 나눠 보낸다', async () => {
  const { r, sent, tick } = rig({ minIntervalMs: 0, maxBatch: 1000, maxBodyBytes: 4000 });
  for (let i = 0; i < 20; i++) r.report({ kind: 'error', msg: `${i} ${'가'.repeat(150)}` });
  await r.flush();
  const bytes = new TextEncoder().encode(JSON.stringify(sent[0].body)).length;
  assert.ok(bytes <= 4000, String(bytes));
  assert.ok(sent[0].body.events.length < 20);
  assert.ok(r.pendingCount() > 0);
});

test('나갈 때 보내기(beacon)는 따로 상한이 있다', async () => {
  const { r, sent } = rig({ maxBeacons: 2 });
  for (let i = 0; i < 4; i++) { r.report({ kind: 'error', msg: `b${i}` }); await r.flush({ beacon: true }); }
  assert.equal(sent.length, 2);
});
