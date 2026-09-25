// 📱 pgs-auth Worker — Play Games authCode → Supabase 세션
import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker, { exchangeCode, fetchPlayerId, pgsIdentity } from '../pgs-auth/src/index.js';

const ENV = {
  SUPABASE_URL: 'https://sb.test', SUPABASE_ANON_KEY: 'anon', SUPABASE_SERVICE_KEY: 'service',
  PGS_CLIENT_ID: 'server.apps.googleusercontent.com', PGS_CLIENT_SECRET: 'shh', PGS_USER_SECRET: 'salt',
};
const res = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const post = (body) => new Request('https://pgs.test/', { method: 'POST', body: JSON.stringify(body) });

// 경로별 응답을 정해 두고 호출 기록을 남기는 가짜 fetch
function fakeFetch(routes) {
  const calls = [];
  const fn = async (url, init = {}) => {
    calls.push({ url: String(url), init });
    for (const [prefix, handler] of routes) if (String(url).startsWith(prefix)) return handler(init, calls);
    throw new Error('unexpected fetch ' + url);
  };
  fn.calls = calls;
  return fn;
}

test('exchangeCode — 구글 토큰 엔드포인트에 폼으로 보낸다(redirect_uri 빈 값)', async () => {
  const f = fakeFetch([['https://oauth2.googleapis.com/token', () => res(200, { access_token: 'at' })]]);
  const at = await exchangeCode({ fetch: f, clientId: 'cid', clientSecret: 'sec', code: 'c1' });
  assert.equal(at, 'at');
  const body = new URLSearchParams(f.calls[0].init.body);
  assert.equal(body.get('code'), 'c1');
  assert.equal(body.get('grant_type'), 'authorization_code');
  assert.equal(body.get('redirect_uri'), '');
  assert.equal(body.get('client_secret'), 'sec');
});

test('exchangeCode — 구글이 거절하면 401', async () => {
  const f = fakeFetch([['https://oauth2.googleapis.com/token', () => res(400, { error: 'invalid_grant' })]]);
  await assert.rejects(exchangeCode({ fetch: f, clientId: 'c', clientSecret: 's', code: 'bad' }), (e) => e.status === 401);
});

test('fetchPlayerId — players/me 의 id', async () => {
  const f = fakeFetch([['https://games.googleapis.com/games/v1/players/me', (init) => {
    assert.equal(init.headers.Authorization, 'Bearer at');
    return res(200, { id: 'P123', displayName: 'x' });
  }]]);
  assert.equal(await fetchPlayerId({ fetch: f, accessToken: 'at' }), 'P123');
});

test('pgsIdentity — 결정적이고, 원본 playerId 를 드러내지 않는다', async () => {
  const a = await pgsIdentity('salt', 'P123');
  const b = await pgsIdentity('salt', 'P123');
  assert.deepEqual(a, b);
  assert.match(a.email, /^pgs-[0-9a-f]{32}@pgs\.calmforest\.local$/);
  assert.ok(!a.email.includes('P123'));
  assert.match(a.password, /^[0-9a-f]{64}$/);
  assert.notEqual((await pgsIdentity('other', 'P123')).password, a.password);
});

function happyRoutes({ existing }) {
  let created = false;
  return fakeFetch([
    ['https://oauth2.googleapis.com/token', () => res(200, { access_token: 'at' })],
    ['https://games.googleapis.com/games/v1/players/me', () => res(200, { id: 'P123' })],
    ['https://sb.test/auth/v1/token?grant_type=password', () =>
      (existing || created) ? res(200, { access_token: 'sat', refresh_token: 'srt' }) : res(400, { error: 'invalid_grant' })],
    ['https://sb.test/auth/v1/admin/users', () => { created = true; return res(200, { id: 'u' }); }],
  ]);
}

test('기존 유저 → 바로 로그인 세션 반환(생성 안 함)', async () => {
  const f = happyRoutes({ existing: true });
  const r = await worker.handle(post({ authCode: 'c1' }), ENV, { fetch: f });
  assert.equal(r.status, 200);
  assert.deepEqual(await r.json(), { access_token: 'sat', refresh_token: 'srt' });
  assert.ok(!f.calls.some(c => c.url.includes('/admin/users')));
});

test('첫 진입 → pgs 메타데이터로 생성 후 로그인', async () => {
  const f = happyRoutes({ existing: false });
  const r = await worker.handle(post({ authCode: 'c1' }), ENV, { fetch: f });
  assert.equal(r.status, 200);
  const create = f.calls.find(c => c.url.includes('/admin/users'));
  const body = JSON.parse(create.init.body);
  assert.equal(body.user_metadata.pgs, true);
  assert.equal(body.email_confirm, true);
  assert.equal(create.init.headers.Authorization, 'Bearer service');
});

test('authCode 없으면 400 · POST 아니면 405 · OPTIONS 는 204', async () => {
  const f = fakeFetch([]);
  assert.equal((await worker.handle(post({}), ENV, { fetch: f })).status, 400);
  assert.equal((await worker.handle(new Request('https://pgs.test/'), ENV, { fetch: f })).status, 405);
  assert.equal((await worker.handle(new Request('https://pgs.test/', { method: 'OPTIONS' }), ENV, { fetch: f })).status, 204);
});

test('시크릿 미설정이면 500(구글 호출 전에 멈춘다)', async () => {
  const f = fakeFetch([]);
  const r = await worker.handle(post({ authCode: 'c1' }), { ...ENV, PGS_CLIENT_SECRET: '' }, { fetch: f });
  assert.equal(r.status, 500);
  assert.equal(f.calls.length, 0);
});

// ── 보안 리뷰 반영(2026-09-25) ──
test('동시 요청 경합 — 생성이 "이미 있음"으로 실패해도 로그인으로 이어간다', async () => {
  let signIns = 0;
  const f = fakeFetch([
    ['https://oauth2.googleapis.com/token', () => res(200, { access_token: 'at' })],
    ['https://games.googleapis.com/games/v1/players/me', () => res(200, { id: 'P123' })],
    ['https://sb.test/auth/v1/token?grant_type=password', () =>
      ++signIns === 1 ? res(400, { error: 'invalid_grant' }) : res(200, { access_token: 'sat', refresh_token: 'srt' })],
    ['https://sb.test/auth/v1/admin/users', () => res(422, { code: 'email_exists', msg: 'already registered' })],
  ]);
  const r = await worker.handle(post({ authCode: 'c1' }), ENV, { fetch: f });
  assert.equal(r.status, 200);
});

test('클라이언트 응답에 구글·Supabase 응답 원문을 싣지 않는다', async () => {
  const f = fakeFetch([['https://oauth2.googleapis.com/token', () => res(400, { error: 'invalid_grant', secret_detail: 'LEAKME' })]]);
  const r = await worker.handle(post({ authCode: 'bad' }), ENV, { fetch: f });
  assert.equal(r.status, 401);
  const body = await r.text();
  assert.ok(!body.includes('LEAKME'), body);
});

test('SUPABASE_ANON_KEY 미설정도 500', async () => {
  const r = await worker.handle(post({ authCode: 'c1' }), { ...ENV, SUPABASE_ANON_KEY: '' }, { fetch: fakeFetch([]) });
  assert.equal(r.status, 500);
});

test('속도 제한 바인딩이 거절하면 429 — 구글 호출 없이', async () => {
  const f = fakeFetch([]);
  const env = { ...ENV, PGS_LIMITER: { limit: async ({ key }) => ({ success: key !== '1.2.3.4' }) } };
  const req = new Request('https://pgs.test/', { method: 'POST', body: JSON.stringify({ authCode: 'c1' }), headers: { 'CF-Connecting-IP': '1.2.3.4' } });
  const r = await worker.handle(req, env, { fetch: f });
  assert.equal(r.status, 429);
  assert.equal(f.calls.length, 0);
});
