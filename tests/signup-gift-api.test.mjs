import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { onRequestPost, GIFT_NOTICE } from '../functions/api/signup-gift.js';
import { REWARD_DECOR } from '../js/data/reward-decor.js';

const UID = '3f2b1c9e-8a7d-4e6f-9b0a-1c2d3e4f5a6b';
const env = { SUPABASE_URL: 'https://x.supabase.co', SUPABASE_ANON_KEY: 'anon', SUPABASE_SERVICE_KEY: 'svc' };

function req(body, { token = 'tok' } = {}) {
  const headers = { 'content-type': 'application/json' };
  if (token) headers.authorization = `Bearer ${token}`;
  return new Request('https://calm.test/api/signup-gift', { method: 'POST', headers, body: typeof body === 'string' ? body : JSON.stringify(body) });
}

function fakeFetch({ user = { id: UID, is_anonymous: false }, claim = null, rpcStatus = 200 } = {}) {
  const calls = [];
  const f = async (url, init = {}) => {
    const u = String(url);
    calls.push({ url: u, body: init.body ? JSON.parse(init.body) : null });
    if (u.endsWith('/auth/v1/user')) return user ? new Response(JSON.stringify(user), { status: 200 }) : new Response('', { status: 401 });
    if (u.endsWith('/rest/v1/rpc/signup_gift_claim')) return new Response(JSON.stringify(claim), { status: rpcStatus });
    if (u.endsWith('/rest/v1/notices')) return new Response('', { status: 201 });
    return new Response('', { status: 404 });
  };
  f.calls = calls;
  return f;
}
const call = (f, body = { action: 'claim' }, opts) => onRequestPost({ request: req(body, opts), env, fetchImpl: f });

test('설정이 없으면 503', async () => {
  const r = await onRequestPost({ request: req({ action: 'claim' }), env: { ...env, SUPABASE_SERVICE_KEY: '' }, fetchImpl: fakeFetch() });
  assert.equal(r.status, 503);
});

test('토큰이 없거나 익명이면 401 이고 RPC 는 부르지 않는다', async () => {
  const f1 = fakeFetch();
  assert.equal((await call(f1, undefined, { token: null })).status, 401);
  const f2 = fakeFetch({ user: { id: UID, is_anonymous: true } });
  assert.equal((await call(f2)).status, 401);
  assert.ok(!f2.calls.some(c => c.url.includes('/rpc/')));
});

test('모르는 action 은 400', async () => {
  assert.equal((await call(fakeFetch(), { action: 'nope' })).status, 400);
  assert.equal((await call(fakeFetch(), 'not json')).status, 400);
});

test('uid 는 JWT 에서만 꺼낸다', async () => {
  const f = fakeFetch({ claim: { ok: true, item: 'giftsprout', new: true } });
  await call(f, { action: 'claim', user: 'someone-else' });
  const rpc = f.calls.find(c => c.url.endsWith('/rpc/signup_gift_claim'));
  assert.deepEqual(rpc.body, { p_user: UID });
});

test('새로 받았을 때만 개인 소식을 보낸다', async () => {
  const f1 = fakeFetch({ claim: { ok: true, item: 'giftlantern', new: true } });
  const r1 = await (await call(f1)).json();
  assert.deepEqual(r1, { ok: true, item: 'giftlantern', new: true });
  const notice = f1.calls.find(c => c.url.endsWith('/rest/v1/notices'));
  assert.equal(notice.body[0].target_user_id, UID);
  assert.equal(notice.body[0].title, GIFT_NOTICE.giftlantern.title);

  const f2 = fakeFetch({ claim: { ok: true, item: 'giftlantern', new: false } });
  await call(f2);
  assert.ok(!f2.calls.some(c => c.url.endsWith('/rest/v1/notices')));

  const f3 = fakeFetch({ claim: { ok: false, reason: 'too_early' } });
  assert.deepEqual(await (await call(f3)).json(), { ok: false, reason: 'too_early' });
  assert.ok(!f3.calls.some(c => c.url.endsWith('/rest/v1/notices')));
});

test('RPC 가 실패하면 502', async () => {
  assert.equal((await call(fakeFetch({ rpcStatus: 500 }))).status, 502);
});

test('선물 3종 모두 소식 문구가 한국어·영어로 있다', () => {
  for (const d of REWARD_DECOR.filter(x => x.reward === 'signup')) {
    const n = GIFT_NOTICE[d.id];
    assert.ok(n && n.title && n.body && n.title_en && n.body_en, d.id);
    for (const s of [n.title, n.body]) {
      assert.doesNotMatch(s, /—/);
      assert.doesNotMatch(s, /놀/);
    }
  }
});

test('worker 에 /api/signup-gift 라우트가 있다', () => {
  const src = readFileSync(new URL('../worker/index.js', import.meta.url), 'utf8');
  assert.match(src, /import \{ onRequestPost as signupGift \} from '\.\.\/functions\/api\/signup-gift\.js'/);
  assert.match(src, /pathname === '\/api\/signup-gift'/);
  assert.match(src, /return await signupGift\(\{ request, env \}\)/);
});
