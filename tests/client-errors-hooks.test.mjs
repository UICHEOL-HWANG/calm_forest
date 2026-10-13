import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installErrorHooks, makeSender } from '../js/client-errors-hooks.js';

// 스펙: dev/active/client-logs/client-logs-plan.md §1 — 오류 훅·전송·나갈 때 비우기

function rig({ fetchImpl } = {}) {
  const win = new EventTarget();
  const doc = new EventTarget();
  doc.visibilityState = 'visible';
  const reported = [];
  const flushes = [];
  const reporter = { report: e => reported.push(e), flush: o => { flushes.push(o || {}); return Promise.resolve(true); } };
  const calls = [];
  const con = { error: (...a) => calls.push(a) };
  const baseFetch = fetchImpl || (async (url) => ({ ok: true, status: 200, url: String(url) }));
  const scope = { fetch: baseFetch };
  const off = installErrorHooks({ win, doc, reporter, consoleObj: con, fetchScope: scope, endpoint: '/api/logs' });
  return { win, doc, reported, flushes, con, calls, scope, off };
}

test('잡히지 않은 오류를 메시지·스택과 함께 보고한다', () => {
  const { win, reported } = rig();
  const ev = new Event('error');
  Object.assign(ev, { message: 'boom', filename: 'https://calmforest.cloud/js/game.js?v=1', lineno: 10, colno: 2, error: { stack: 'Error: boom\n at x' } });
  win.dispatchEvent(ev);
  assert.equal(reported.length, 1);
  assert.equal(reported[0].kind, 'error');
  assert.equal(reported[0].msg, 'boom');
  assert.match(reported[0].url, /game\.js/);
  assert.match(reported[0].stack, /at x/);
});

test('리소스(스크립트·이미지) 로드 실패는 resource 로 보고한다', () => {
  const { win, reported } = rig();
  const ev = new Event('error');
  Object.defineProperty(ev, 'target', { value: { tagName: 'IMG', src: 'https://calmforest.cloud/img/a.png' } });
  win.dispatchEvent(ev);
  assert.equal(reported[0].kind, 'resource');
  assert.equal(reported[0].url, 'https://calmforest.cloud/img/a.png');
});

test('data:·blob: 리소스 실패는 무시한다', () => {
  const { win, reported } = rig();
  const ev = new Event('error');
  Object.defineProperty(ev, 'target', { value: { tagName: 'IMG', src: 'data:image/png;base64,AAAA' } });
  win.dispatchEvent(ev);
  assert.equal(reported.length, 0);
});

test('처리 안 된 Promise 거부를 보고한다', () => {
  const { win, reported } = rig();
  const ev = new Event('unhandledrejection');
  ev.reason = new Error('nope');
  win.dispatchEvent(ev);
  assert.equal(reported[0].kind, 'rejection');
  assert.equal(reported[0].msg, 'nope');
});

test('console.error 는 원래대로 찍으면서 보고도 한다', () => {
  const { con, calls, reported } = rig();
  con.error('[save] 실패', { code: 'PGRST' });
  assert.equal(calls.length, 1);
  assert.equal(reported[0].kind, 'console');
  assert.match(reported[0].msg, /\[save\] 실패/);
});

test('fetch 가 404·5xx 를 받으면 http 로 보고하고 응답은 그대로 돌려준다', async () => {
  const { scope, reported } = rig({ fetchImpl: async (url) => ({ ok: false, status: String(url).includes('missing') ? 404 : 503 }) });
  const r1 = await scope.fetch('/api/missing?x=1');
  await scope.fetch('/api/slow', { method: 'POST' });
  assert.equal(r1.status, 404);
  assert.deepEqual(reported.map(r => [r.kind, r.status]), [['http', 404], ['http', 503]]);
  assert.equal(reported[0].url, '/api/missing?x=1');   // 쿼리는 수집기(report)에서 버린다
  assert.match(reported[1].msg, /POST/);
});

test('400·409 같은 정상 흐름 응답은 보고하지 않는다(23505 중복 등)', async () => {
  const { scope, reported } = rig({ fetchImpl: async () => ({ ok: false, status: 409 }) });
  await scope.fetch('/rest/v1/x');
  assert.equal(reported.length, 0);
});

test('네트워크 실패는 network 로 보고하고 예외는 다시 던진다', async () => {
  const { scope, reported } = rig({ fetchImpl: async () => { throw new TypeError('Failed to fetch'); } });
  await assert.rejects(() => scope.fetch('/api/x'), TypeError);
  assert.equal(reported[0].kind, 'network');
});

test('로그 전송 자체(/api/logs)는 보고하지 않는다 — 무한 루프 방지', async () => {
  const { scope, reported } = rig({ fetchImpl: async () => ({ ok: false, status: 503 }) });
  await scope.fetch('https://calmforest.cloud/api/logs');
  assert.equal(reported.length, 0);
});

test('화면이 숨겨지거나 페이지를 떠나면 beacon 으로 비운다', () => {
  const { doc, win, flushes } = rig();
  doc.visibilityState = 'hidden';
  doc.dispatchEvent(new Event('visibilitychange'));
  win.dispatchEvent(new Event('pagehide'));
  assert.deepEqual(flushes, [{ beacon: true }, { beacon: true }]);
});

test('훅을 풀면 원래 console.error·fetch 로 돌아간다', () => {
  const { con, scope, off } = rig();
  const wrappedErr = con.error, wrappedFetch = scope.fetch;
  off();
  assert.notEqual(con.error, wrappedErr);
  assert.notEqual(scope.fetch, wrappedFetch);
});

test('보고 중 예외가 나도 앱 흐름을 막지 않는다', () => {
  const win = new EventTarget(); const doc = new EventTarget();
  const con = { error() {} };
  installErrorHooks({ win, doc, reporter: { report() { throw new Error('x'); }, flush: async () => true }, consoleObj: con, fetchScope: { fetch: async () => ({ status: 200 }) }, endpoint: '/api/logs' });
  assert.doesNotThrow(() => con.error('a'));
});

// ── 전송기 ──
test('beacon 이면 sendBeacon, 아니면 keepalive POST 로 보낸다', async () => {
  const beacons = [];
  const posts = [];
  const send = makeSender({
    endpoint: '/api/logs',
    beaconFn: (url, blob) => { beacons.push(url); return true; },
    fetchFn: async (url, init) => { posts.push({ url, init }); return { ok: true }; },
  });
  assert.equal(await send({ a: 1 }, { beacon: true }), true);
  assert.equal(await send({ a: 1 }, { beacon: false }), true);
  assert.deepEqual(beacons, ['/api/logs']);
  assert.equal(posts[0].init.method, 'POST');
  assert.equal(posts[0].init.keepalive, true);
});

test('sendBeacon 이 없거나 거절하면 fetch 로 대신 보낸다', async () => {
  const posts = [];
  const send = makeSender({ endpoint: '/api/logs', beaconFn: () => false, fetchFn: async (u, i) => { posts.push(i); return { ok: true }; } });
  assert.equal(await send({}, { beacon: true }), true);
  assert.equal(posts.length, 1);
});

test('서버가 5xx·429 면 false(다음에 재시도), 400·413 이면 drop(버림)', async () => {
  const mk = status => makeSender({ endpoint: '/api/logs', beaconFn: null, fetchFn: async () => ({ ok: false, status }) });
  assert.equal(await mk(500)({}, {}), false);
  assert.equal(await mk(503)({}, {}), false);
  assert.equal(await mk(429)({}, {}), false);
  assert.equal(await mk(400)({}, {}), 'drop');
  assert.equal(await mk(413)({}, {}), 'drop');
});

test('응답이 오지 않으면 시간 제한으로 끊는다(전송 중 상태 고착 방지)', async () => {
  const send = makeSender({ endpoint: '/api/logs', beaconFn: null, timeoutMs: 30,
    fetchFn: (u, init) => new Promise((_, rej) => init.signal.addEventListener('abort', () => rej(new Error('aborted')))) });
  assert.equal(await send({}, {}), false);
});
