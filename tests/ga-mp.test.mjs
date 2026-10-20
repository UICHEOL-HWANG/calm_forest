import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mpParams, mpUserProps, createMpQueue, mpGtag, MP_MAX_EVENTS } from '../js/ga-mp.js';
import { onRequestPost, MP_MEASUREMENT_ID } from '../functions/api/ga-mp.js';

const src = rel => readFileSync(new URL('../' + rel, import.meta.url), 'utf8');

test('mpParams — null·undefined 는 빼고, 문자열은 100자, 불리언은 숫자로', () => {
  assert.deepEqual(mpParams({ a: 'x'.repeat(150), b: null, c: undefined, d: true, e: 3, f: { o: 1 } }),
    { a: 'x'.repeat(100), d: 1, e: 3 });
});

test('mpUserProps — {key: {value}} 모양, 값은 36자', () => {
  assert.deepEqual(mpUserProps({ platform: 'ios', lang: 'ko', long: 'y'.repeat(50), none: null }),
    { platform: { value: 'ios' }, lang: { value: 'ko' }, long: { value: 'y'.repeat(36) } });
});

test('큐 — session_id·engagement_time_msec 를 붙이고 25개마다 끊어 보낸다', () => {
  const sent = [];
  let t = 1_700_000_000_000;
  const q = createMpQueue({ clientId: 'c-1', send: b => sent.push(b), now: () => t, sessionStart: t });
  q.setUser('uid-1');
  q.setProps({ platform: 'ios' });
  for (let i = 0; i < MP_MAX_EVENTS + 2; i++) { t += 500; q.push('harvest_crop', { crop: 'carrot' }); }
  assert.equal(sent.length, 1, '25개가 차면 바로 보낸다');
  assert.equal(sent[0].events.length, MP_MAX_EVENTS);
  assert.equal(sent[0].client_id, 'c-1');
  assert.equal(sent[0].user_id, 'uid-1');
  assert.deepEqual(sent[0].user_properties, { platform: { value: 'ios' } });
  const ev = sent[0].events[0];
  assert.equal(ev.name, 'harvest_crop');
  assert.equal(ev.params.session_id, String(Math.floor(1_700_000_000_000 / 1000)));
  assert.equal(ev.params.engagement_time_msec, 500);
  q.flush();
  assert.equal(sent.length, 2);
  assert.equal(sent[1].events.length, 2);
  q.flush();
  assert.equal(sent.length, 2, '빈 큐는 보내지 않는다');
});

test('큐 — 이름이 GA4 규칙에 안 맞으면 버린다', () => {
  const sent = [];
  const q = createMpQueue({ clientId: 'c-1', send: b => sent.push(b), now: () => 0, sessionStart: 0 });
  q.push('1bad', {}); q.push('session_start', {}); q.push('ok_event', {});
  q.flush();
  assert.deepEqual(sent[0].events.map(e => e.name), ['ok_event']);
});

test('파라미터는 23개까지만 싣고 session_id·engagement_time_msec 로 25개를 넘지 않는다', () => {
  const many = Object.fromEntries(Array.from({ length: 30 }, (_, i) => [`p${i}`, i]));
  assert.equal(Object.keys(mpParams(many)).length, 23);
  const sent = [];
  const q = createMpQueue({ clientId: 'c-1', send: b => sent.push(b), now: () => 0, sessionStart: 0 });
  q.push('big', many); q.flush();
  assert.equal(Object.keys(sent[0].events[0].params).length, 25);
});

test('보내기가 실패하면 그 배치를 다시 넣고, 다음 flush 때 같이 보낸다(상한 100개)', async () => {
  const sent = [];
  let fail = true;
  const q = createMpQueue({ clientId: 'c-1', send: async b => { sent.push(b); return !fail; }, now: () => 0, sessionStart: 0 });
  q.push('a', {}); await q.flush();
  fail = false;
  q.push('b', {}); await q.flush();
  assert.deepEqual(sent[1].events.map(e => e.name), ['a', 'b']);
  fail = true;
  for (let i = 0; i < 300; i++) q.push('x', {});
  await q.flush();
  assert.ok(q.pending() <= 100);
});

test('mpGtag — 기존 gtag 호출 모양(event·user_properties·user_id)을 큐로 옮긴다', () => {
  const sent = [];
  const q = createMpQueue({ clientId: 'c-1', send: b => sent.push(b), now: () => 0, sessionStart: 0 });
  const g = mpGtag(q);
  g('js', new Date());
  g('config', 'G-X');
  g('set', 'user_properties', { platform: 'ios' });
  g('set', { user_id: 'uid-9' });
  g('event', 'login', { method: 'apple' });
  q.flush();
  assert.equal(sent[0].user_id, 'uid-9');
  assert.deepEqual(sent[0].user_properties, { platform: { value: 'ios' } });
  assert.equal(sent[0].events[0].name, 'login');
  assert.equal(sent[0].events[0].params.method, 'apple');
});

const ENV = { GA4_MP_SECRET: 'sec' };
async function call(body, { origin = 'capacitor://app.calmforest.cloud', env = ENV, upstream = 204 } = {}) {
  const calls = [];
  const real = globalThis.fetch;
  globalThis.fetch = async (url, init = {}) => { calls.push({ url: String(url), init }); return new Response(null, { status: upstream }); };
  try {
    const headers = { 'content-type': 'application/json', 'cf-connecting-ip': '203.0.113.7' };
    if (origin) headers.origin = origin;
    const req = new Request('https://x/api/ga-mp', { method: 'POST', headers, body: typeof body === 'string' ? body : JSON.stringify(body) });
    const res = await onRequestPost({ request: req, env });
    return { status: res.status, calls };
  } finally { globalThis.fetch = real; }
}
const GOOD = { client_id: 'c-abc', user_id: 'uid-1', user_properties: { platform: { value: 'ios' } },
  events: [{ name: 'harvest_crop', params: { crop: 'carrot', session_id: '1700000000', engagement_time_msec: 500 } }] };

test('ga-mp — 앱 출처만, 비밀값이 없으면 503', async () => {
  assert.equal((await call(GOOD, { origin: 'https://evil.example' })).status, 403);
  assert.equal((await call(GOOD, { origin: null })).status, 403);
  assert.equal((await call(GOOD, { env: {} })).status, 503);
});

test('ga-mp — 형식 검사: 이벤트 0개·26개·나쁜 client_id 는 400', async () => {
  assert.equal((await call({ ...GOOD, events: [] })).status, 400);
  assert.equal((await call({ ...GOOD, events: Array(26).fill(GOOD.events[0]) })).status, 400);
  assert.equal((await call({ ...GOOD, client_id: 'x y<script>' })).status, 400);
  assert.equal((await call('nope')).status, 400);
});

test('ga-mp — GA4 로 넘길 때 측정 ID·비밀값·IP 를 서버가 붙이고, 이상한 이벤트·값은 걸러낸다', async () => {
  const r = await call({ ...GOOD, events: [...GOOD.events, { name: 'first_open', params: {} }, { name: 'x', params: { o: { deep: 1 } } }] });
  assert.equal(r.status, 204);
  const up = r.calls[0];
  assert.equal(up.url, `https://www.google-analytics.com/mp/collect?measurement_id=${MP_MEASUREMENT_ID}&api_secret=sec`);
  const body = JSON.parse(up.init.body);
  assert.deepEqual(body.events.map(e => e.name), ['harvest_crop', 'x']);
  assert.deepEqual(body.events[1].params, {});
  assert.equal(body.ip_override, '203.0.113.7');
  assert.equal(body.client_id, 'c-abc');
});

test('ga-mp — 결제·환불 이벤트는 앱에서 오지 않으므로 버리고, 32KB 넘는 본문은 413', async () => {
  const r = await call({ ...GOOD, events: [{ name: 'purchase', params: { value: 9999 } }, { name: 'refund', params: {} }, GOOD.events[0]] });
  assert.deepEqual(JSON.parse(r.calls[0].init.body).events.map(e => e.name), ['harvest_crop']);
  const big = { ...GOOD, events: [{ name: 'x', params: { s: 'a'.repeat(40000) } }] };
  assert.equal((await call(big)).status, 413);
});

test('연결 — iOS 는 gtag 대신 MP 큐, 워커 라우트·config 등록', () => {
  const a = src('js/analytics.js');
  assert.match(a, /PLATFORM === 'ios'/);
  assert.match(a, /window\.gtag = mpGtag\(q\)/);
  assert.ok(a.indexOf("PLATFORM === 'ios'") < a.indexOf('googletagmanager.com/gtag/js'), 'iOS 는 gtag.js 를 불러오기 전에 빠진다');
  assert.match(src('worker/index.js'), /pathname === '\/api\/ga-mp'/);
  assert.match(src('js/config.js'), /GA_MP_API: `\$\{API_BASE\}\/api\/ga-mp`/);
});
