// tests/referral-api.test.mjs — 🤝 POST /api/referral (functions/api/referral.js)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { onRequestPost, REWARD_NOTICE } from '../functions/api/referral.js';

const UID = '3f2b1c9e-8a7d-4e6f-9b0a-1c2d3e4f5a6b';
const env = { SUPABASE_URL: 'https://x.supabase.co', SUPABASE_ANON_KEY: 'anon', SUPABASE_SERVICE_KEY: 'svc' };

function req(body, { token = 'tok' } = {}) {
  const headers = { 'content-type': 'application/json' };
  if (token) headers.authorization = `Bearer ${token}`;
  return new Request('https://calm.test/api/referral', { method: 'POST', headers, body: typeof body === 'string' ? body : JSON.stringify(body) });
}

/** 경로별 응답을 정해 두는 가짜 fetch. user=null 이면 토큰 검증 실패 */
function fakeFetch({ user = { id: UID, is_anonymous: false }, rpc = {}, rpcStatus = 200, noticeStatus = 201 } = {}) {
  const calls = [];
  const f = async (url, init = {}) => {
    const u = String(url);
    calls.push({ url: u, init, body: init.body ? JSON.parse(init.body) : null });
    if (u.endsWith('/auth/v1/user')) return user ? new Response(JSON.stringify(user), { status: 200 }) : new Response('', { status: 401 });
    const m = u.match(/\/rest\/v1\/rpc\/(\w+)$/);
    if (m) return new Response(JSON.stringify(rpc[m[1]] ?? null), { status: rpcStatus });
    if (u.endsWith('/rest/v1/notices')) return new Response('', { status: noticeStatus });
    return new Response('', { status: 404 });
  };
  f.calls = calls;
  return f;
}
const call = (f, body, opts) => onRequestPost({ request: req(body, opts), env, fetchImpl: f });

test('서비스 키가 없으면 503', async () => {
  const r = await onRequestPost({ request: req({ action: 'code' }), env: { ...env, SUPABASE_SERVICE_KEY: '' }, fetchImpl: fakeFetch() });
  assert.equal(r.status, 503);
});

test('토큰이 없거나 익명이면 401 — RPC 는 부르지 않는다', async () => {
  const f1 = fakeFetch();
  assert.equal((await call(f1, { action: 'code' }, { token: null })).status, 401);
  const f2 = fakeFetch({ user: { id: UID, is_anonymous: true } });
  assert.equal((await call(f2, { action: 'claim' })).status, 401);
  assert.ok(!f2.calls.some(c => c.url.includes('/rpc/')));
});

test('모르는 action·JSON 아님은 400', async () => {
  assert.equal((await call(fakeFetch(), { action: 'nope' })).status, 400);
  assert.equal((await call(fakeFetch(), 'not json')).status, 400);
});

test('code — 검증된 uid 로 referral_get_code 를 부른다(본문 uid 무시)', async () => {
  const f = fakeFetch({ rpc: { referral_get_code: { ok: true, code: 'ABCD2345' } } });
  const r = await call(f, { action: 'code', user: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' });
  assert.equal(r.status, 200);
  assert.deepEqual(await r.json(), { ok: true, code: 'ABCD2345' });
  const rpc = f.calls.find(c => c.url.endsWith('/rpc/referral_get_code'));
  assert.deepEqual(rpc.body, { p_user: UID });
  assert.equal(rpc.init.headers.authorization, 'Bearer svc');
});

test('bind — 코드 형식이 틀리면 RPC 없이 bad_code', async () => {
  const f = fakeFetch();
  const r = await call(f, { action: 'bind', code: 'no!' });
  assert.deepEqual(await r.json(), { ok: false, reason: 'bad_code' });
  assert.ok(!f.calls.some(c => c.url.includes('/rpc/')));
});

test('bind — 코드는 대문자로, platform 은 허용 목록만', async () => {
  const f = fakeFetch({ rpc: { referral_bind: { ok: true, welcome: 'friend_pin' } } });
  const r = await call(f, { action: 'bind', code: ' abcd2345 ', platform: 'toss' });
  assert.deepEqual(await r.json(), { ok: true, welcome: 'friend_pin' });
  assert.deepEqual(f.calls.find(c => c.url.endsWith('/rpc/referral_bind')).body, { p_invitee: UID, p_code: 'ABCD2345', p_platform: 'toss' });
  const f2 = fakeFetch({ rpc: { referral_bind: { ok: false, reason: 'not_new' } } });
  await call(f2, { action: 'bind', code: 'ABCD2345', platform: '<script>' });
  assert.equal(f2.calls.find(c => c.url.endsWith('/rpc/referral_bind')).body.p_platform, null);
});

test('claim — 새로 받은 보상마다 개인 소식 1건(한·영)', async () => {
  const f = fakeFetch({ rpc: { referral_claim: { active: 3, newly_active: 2, pending: 0, granted: ['tools_star', 'friendarch'] } } });
  const r = await call(f, { action: 'claim' });
  const out = await r.json();
  assert.equal(out.active, 3);
  assert.deepEqual(out.granted, ['tools_star', 'friendarch']);
  const notices = f.calls.filter(c => c.url.endsWith('/rest/v1/notices'));
  assert.equal(notices.length, 1, '한 번의 insert 로 여러 행');
  assert.deepEqual(notices[0].body.map(n => n.title), [REWARD_NOTICE.tools_star.title, REWARD_NOTICE.friendarch.title]);
  assert.ok(notices[0].body.every(n => n.target_user_id === UID && n.title_en && n.body_en));
});

test('claim — 새 보상이 없으면 소식을 안 보낸다', async () => {
  const f = fakeFetch({ rpc: { referral_claim: { active: 1, newly_active: 0, pending: 2, granted: [] } } });
  await call(f, { action: 'claim' });
  assert.ok(!f.calls.some(c => c.url.endsWith('/rest/v1/notices')));
});

test('claim — 소식 insert 가 실패해도 지급 결과는 200 으로 돌려준다(원장이 진실)', async () => {
  const f = fakeFetch({ rpc: { referral_claim: { active: 5, newly_active: 1, pending: 0, granted: ['friend_wing'] } }, noticeStatus: 500 });
  const r = await call(f, { action: 'claim' });
  assert.equal(r.status, 200);
  assert.deepEqual((await r.json()).granted, ['friend_wing']);
});

test('RPC 실패는 502', async () => {
  const f = fakeFetch({ rpcStatus: 500 });
  assert.equal((await call(f, { action: 'claim' })).status, 502);
});

test('worker 에 /api/referral 라우트가 등록돼 있다', async () => {
  const { readFileSync } = await import('node:fs');
  const src = readFileSync(new URL('../worker/index.js', import.meta.url), 'utf8');
  assert.match(src, /from '\.\.\/functions\/api\/referral\.js'/);
  assert.match(src, /pathname === '\/api\/referral'/);
});
