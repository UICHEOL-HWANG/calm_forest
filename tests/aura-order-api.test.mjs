import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { onRequest } from '../functions/api/aura-order.js';
import { isNicknameBlocked } from '../js/nickname-filter.js';

const ENV = { SUPABASE_URL: 'https://sb.test', SUPABASE_SERVICE_KEY: 's', SUPABASE_ANON_KEY: 'a' };
const UID = '11111111-1111-4111-8111-111111111111';
const CARDS = { shape: 'drop', color: 'mint', motion: 'fall', band: 'body' };
const NOW = Date.UTC(2026, 9, 8, 13, 0);   // KST 22:00
const BAD = '시발 빛';                        // 금칙어 필터가 실제로 막는 말

function world({ insertStatus = 201, patchRows = [{ id: 'o1', status: 'claimed' }], getRows = [] } = {}) {
  const calls = [];
  globalThis.fetch = async (url, init = {}) => {
    const u = String(url), m = init.method || 'GET';
    calls.push({ u, m, body: init.body ? JSON.parse(init.body) : null, headers: init.headers });
    if (u.endsWith('/auth/v1/user')) {
      const good = init.headers.authorization === 'Bearer good';
      return Response.json(good ? { id: UID } : {}, { status: good ? 200 : 401 });
    }
    if (u.includes('/rest/v1/aura_orders') && m === 'POST') return Response.json(insertStatus === 201 ? [{ id: 'o1', order_date: '2026-10-08', status: 'pending' }] : { code: '23505' }, { status: insertStatus });
    if (u.includes('/rest/v1/aura_orders') && m === 'PATCH') return Response.json(patchRows);
    if (u.includes('/rest/v1/aura_orders') && m === 'GET') return Response.json(getRows);
    throw new Error('unexpected ' + m + ' ' + u);
  };
  return calls;
}
const req = (method, body, { token = 'good', query = '' } = {}) => new Request('https://x.test/api/aura-order' + query, {
  method, headers: { authorization: 'Bearer ' + token, 'content-type': 'application/json' },
  body: body === undefined ? undefined : JSON.stringify(body),
});

test('전제: 금칙어 예시가 실제로 막힌다', () => { assert.equal(isNicknameBlocked(BAD), true); });

test('로그인 없으면 401, 설정 없으면 503', async () => {
  world();
  assert.equal((await onRequest({ request: req('GET', undefined, { token: 'bad' }), env: ENV, now: NOW })).status, 401);
  assert.equal((await onRequest({ request: req('GET'), env: {}, now: NOW })).status, 503);
});

test('주문: user_id 는 토큰에서, order_date 는 KST, 서비스 키로 저장', async () => {
  const calls = world();
  const res = await onRequest({ request: req('POST', { text: ' 비 온 뒤 물방울처럼 ', cards: CARDS, client_id: 'c1', platform: 'web', user_id: 'evil' }), env: ENV, now: NOW });
  assert.equal(res.status, 201);
  const ins = calls.find(c => c.m === 'POST');
  assert.equal(ins.body.user_id, UID);
  assert.equal(ins.body.order_date, '2026-10-08');
  assert.equal(ins.body.text, '비 온 뒤 물방울처럼');
  assert.equal(ins.body.status, 'pending');
  assert.equal(ins.headers.apikey, 's');
});

test('주문 검증: 빈 문장·60자 초과·카드 불량·금칙어', async () => {
  world();
  const go = body => onRequest({ request: req('POST', body), env: ENV, now: NOW }).then(r => r.status);
  assert.equal(await go({ text: '   ', cards: CARDS }), 400);
  assert.equal(await go({ text: 'x'.repeat(61), cards: CARDS }), 400);
  assert.equal(await go({ text: '좋아요', cards: { ...CARDS, shape: 'laser' } }), 400);
  assert.equal(await go({ text: BAD, cards: CARDS }), 422);
});

test('하루 1회: DB 유일키 충돌은 409 limit', async () => {
  world({ insertStatus: 409 });
  const res = await onRequest({ request: req('POST', { text: '별빛', cards: CARDS }), env: ENV, now: NOW });
  assert.equal(res.status, 409);
  assert.equal((await res.json()).error, 'limit');
});

test('수령: 본인·완성 주문만 claimed, 이미 받은 건 멱등', async () => {
  const id = '22222222-2222-4222-8222-222222222222';
  const calls = world();
  const res = await onRequest({ request: req('POST', {}, { query: '?claim=' + id }), env: ENV, now: NOW });
  assert.equal(res.status, 200);
  const p = calls.find(c => c.m === 'PATCH');
  assert.ok(p.u.includes(`id=eq.${id}&user_id=eq.${UID}&status=in.(done,fallback)`));
  world({ patchRows: [], getRows: [{ id, status: 'claimed' }] });
  assert.equal((await onRequest({ request: req('POST', {}, { query: '?claim=' + id }), env: ENV, now: NOW })).status, 200);
  world({ patchRows: [], getRows: [{ id, status: 'pending' }] });
  assert.equal((await onRequest({ request: req('POST', {}, { query: '?claim=' + id }), env: ENV, now: NOW })).status, 409);
  assert.equal((await onRequest({ request: req('POST', {}, { query: '?claim=nope' }), env: ENV, now: NOW })).status, 400);
});

test('GET 은 본인 최근 3건', async () => {
  const calls = world({ getRows: [{ id: 'o1' }] });
  const res = await onRequest({ request: req('GET'), env: ENV, now: NOW });
  assert.deepEqual(await res.json(), { orders: [{ id: 'o1' }] });
  assert.match(calls.at(-1).u, new RegExp(`user_id=eq\\.${UID}.*limit=3`));
});

test('라우트 등록: worker/index.js · serve.py · config', () => {
  const src = rel => readFileSync(new URL('../' + rel, import.meta.url), 'utf8');
  assert.match(src('worker/index.js'), /import \{ onRequest as auraOrder \} from '\.\.\/functions\/api\/aura-order\.js';/);
  assert.match(src('worker/index.js'), /if \(pathname === '\/api\/aura-order'\) \{[\s\S]{0,300}return await auraOrder\(\{ request, env \}\);/);
  assert.ok(src('scripts/serve.py').includes("== '/api/aura-order'"));
  assert.match(src('js/config.js'), /AURA_ORDER_API: `\$\{API_BASE\}\/api\/aura-order`/);
});
