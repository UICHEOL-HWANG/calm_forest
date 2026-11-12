import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { onRequestPost, PROMO_NOTICE } from '../functions/api/promo-gift.js';
import { verifiedUid } from '../functions/api/referral.js';

const UID = '3f2b1c9e-8a7d-4e6f-9b0a-1c2d3e4f5a6b';
const env = { SUPABASE_URL: 'https://x.supabase.co', SUPABASE_ANON_KEY: 'anon', SUPABASE_SERVICE_KEY: 'svc' };

function req(body, { token = 'tok' } = {}) {
  const headers = { 'content-type': 'application/json' };
  if (token) headers.authorization = `Bearer ${token}`;
  return new Request('https://calm.test/api/promo-gift', { method: 'POST', headers, body: typeof body === 'string' ? body : JSON.stringify(body) });
}

function fakeFetch({ user = { id: UID, is_anonymous: false }, out = { ok: true, new: true }, rpcStatus = 200 } = {}) {
  const calls = [];
  const f = async (url, init = {}) => {
    const u = String(url);
    calls.push({ url: u, body: init.body ? JSON.parse(init.body) : null });
    if (u.endsWith('/auth/v1/user')) return user ? new Response(JSON.stringify(user), { status: 200 }) : new Response('', { status: 401 });
    if (u.includes('/rest/v1/rpc/')) return new Response(JSON.stringify(out), { status: rpcStatus });
    if (u.endsWith('/rest/v1/notices')) return new Response('', { status: 201 });
    return new Response('', { status: 404 });
  };
  f.calls = calls;
  return f;
}
const call = (f, body, opts) => onRequestPost({ request: req(body, opts), env, fetchImpl: f });
const rpcOf = (f) => f.calls.find(c => c.url.includes('/rest/v1/rpc/'));

test('설정이 없으면 503', async () => {
  const r = await onRequestPost({ request: req({ action: 'check', code: 'ABCD' }), env: { ...env, SUPABASE_SERVICE_KEY: '' }, fetchImpl: fakeFetch() });
  assert.equal(r.status, 503);
});

test('나쁜 본문·action·코드·단계는 400 이고 RPC 를 안 부른다', async () => {
  for (const body of ['not json', { action: 'nope', code: 'ABCD' }, { action: 'check', code: 'A' }, { action: 'claim', code: 'ABCD', stage: 3 }]) {
    const f = fakeFetch();
    assert.equal((await call(f, body)).status, 400, JSON.stringify(body));
    assert.equal(rpcOf(f), undefined);
  }
});

test('토큰이 없으면 401', async () => {
  assert.equal((await call(fakeFetch(), { action: 'check', code: 'ABCD' }, { token: null })).status, 401);
});

test('게스트(익명)는 1단계는 되고 2단계는 RPC 전에 막는다', async () => {
  const anon = { id: UID, is_anonymous: true };
  const f1 = fakeFetch({ user: anon });
  await call(f1, { action: 'claim', code: 'abcd', stage: 1 });
  assert.deepEqual(rpcOf(f1).body, { p_user: UID, p_code: 'ABCD', p_stage: 1 });
  const f2 = fakeFetch({ user: anon });
  assert.deepEqual(await (await call(f2, { action: 'claim', code: 'ABCD', stage: 2 })).json(), { ok: false, reason: 'anonymous' });
  assert.equal(rpcOf(f2), undefined);
});

test('check 는 promo_code_check 를 1단계로 부른다', async () => {
  const f = fakeFetch({ out: { ok: true, code: 'ABCD', label: 'L', label_en: 'E' } });
  const r = await (await call(f, { action: 'check', code: 'ab-cd' })).json();
  assert.ok(rpcOf(f).url.endsWith('/rpc/promo_code_check'));
  assert.deepEqual(rpcOf(f).body, { p_code: 'ABCD', p_stage: 1 });
  assert.equal(r.label, 'L');
});

test('uid 는 JWT 에서만 꺼낸다', async () => {
  const f = fakeFetch();
  await call(f, { action: 'claim', code: 'ABCD', stage: 2, user: 'someone-else' });
  assert.equal(rpcOf(f).body.p_user, UID);
});

test('2단계 신규 지급일 때만 소식 1건', async () => {
  const f1 = fakeFetch({ out: { ok: true, new: true, items: ['promoballoon', 'promosuitcase'] } });
  await call(f1, { action: 'claim', code: 'ABCD', stage: 2 });
  const n = f1.calls.filter(c => c.url.endsWith('/rest/v1/notices'));
  assert.equal(n.length, 1);
  assert.deepEqual(n[0].body, [{ ...PROMO_NOTICE, target_user_id: UID }]);
  for (const [stage, out] of [[2, { ok: true, new: false }], [1, { ok: true, new: true }]]) {
    const f = fakeFetch({ out });
    await call(f, { action: 'claim', code: 'ABCD', stage });
    assert.equal(f.calls.filter(c => c.url.endsWith('/rest/v1/notices')).length, 0);
  }
});

test('RPC 실패는 502', async () => {
  assert.equal((await call(fakeFetch({ rpcStatus: 500 }), { action: 'claim', code: 'ABCD', stage: 1 })).status, 502);
});

test('verifiedUid 는 여전히 익명을 막는다', async () => {
  const r = (u) => verifiedUid(env, req({}), fakeFetch({ user: u }));
  assert.equal(await r({ id: UID, is_anonymous: true }), null);
  assert.equal(await r({ id: UID, is_anonymous: false }), UID);
});

test('소식 문구에 엠대시가 없고 영어판이 있다', () => {
  for (const k of ['title', 'body']) {
    assert.doesNotMatch(PROMO_NOTICE[k], /—/);
    assert.ok(PROMO_NOTICE[`${k}_en`]);
  }
});

test('worker 가 /api/promo-gift 를 POST 로만 연결하고 config 에 주소가 있다', () => {
  const w = readFileSync(new URL('../worker/index.js', import.meta.url), 'utf8');
  assert.match(w, /import \{ onRequestPost as promoGift \} from '\.\.\/functions\/api\/promo-gift\.js';/);
  assert.match(w, /if \(pathname === '\/api\/promo-gift'\) \{\s*if \(request\.method !== 'POST'\)[^\n]*\n\s*return await promoGift\(\{ request, env \}\);/);
  const c = readFileSync(new URL('../js/config.js', import.meta.url), 'utf8');
  assert.match(c, /PROMO_GIFT_API: `\$\{API_BASE\}\/api\/promo-gift`/);
});
