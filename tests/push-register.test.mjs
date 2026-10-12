// 🔔 /api/push-register — 로그인(게스트 포함) 유저의 기기 토큰을 서비스 키로 upsert
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { onRequestPost } from '../functions/api/push-register.js';

const src = rel => readFileSync(new URL('../' + rel, import.meta.url), 'utf8');
const ENV = { SUPABASE_URL: 'https://sb', SUPABASE_ANON_KEY: 'anon', SUPABASE_SERVICE_KEY: 'svc' };
const TOKEN = 'fcm-AbC_123:xyz-' + 'a'.repeat(140);

async function call(body, { auth = 'Bearer jwt', user = { id: 'uid-1' }, upsert = 201 } = {}) {
  const calls = [];
  const real = globalThis.fetch;
  globalThis.fetch = async (url, init = {}) => {
    calls.push({ url: String(url), init });
    if (String(url).endsWith('/auth/v1/user')) return user ? new Response(JSON.stringify(user)) : new Response('{}', { status: 401 });
    return new Response(null, { status: upsert });
  };
  try {
    const req = new Request('https://x/api/push-register', { method: 'POST',
      headers: auth ? { authorization: auth } : {}, body: typeof body === 'string' ? body : JSON.stringify(body) });
    const res = await onRequestPost({ request: req, env: ENV });
    return { status: res.status, json: await res.json(), calls };
  } finally { globalThis.fetch = real; }
}

test('worker 라우트가 등록돼 있다(dex-notes·daily-quests 404 사고 재발 방지)', () => {
  const w = src('worker/index.js');
  assert.match(w, /pathname === '\/api\/push-register'/);
  assert.match(src('js/config.js'), /PUSH_REGISTER_API: `\$\{API_BASE\}\/api\/push-register`/);
});

test('로그인 없으면 401, 토큰 형식이 아니면 400', async () => {
  assert.equal((await call({ token: TOKEN }, { auth: null })).status, 401);
  assert.equal((await call({ token: TOKEN }, { user: null })).status, 401);
  assert.equal((await call('nope')).status, 400);
  assert.equal((await call({ token: 'short' })).status, 400);
  assert.equal((await call({ token: TOKEN + '<script>' })).status, 400);
});

test('upsert — token 충돌 시 계정·설정을 덮어쓴다(서비스 키, 화이트리스트 필드만)', async () => {
  const r = await call({ token: TOKEN, enabled: false, lang: 'en', tz: 'Asia/Seoul', user_id: 'someone-else', last_checked_on: '2099-01-01' });
  assert.equal(r.status, 200);
  assert.deepEqual(r.json, { ok: true });
  const up = r.calls.find(c => c.url.includes('/rest/v1/push_tokens'));
  assert.equal(up.url, 'https://sb/rest/v1/push_tokens?on_conflict=token');
  assert.equal(up.init.headers.authorization, 'Bearer svc');
  assert.match(up.init.headers.Prefer, /resolution=merge-duplicates/);
  const row = JSON.parse(up.init.body);
  assert.equal(row.user_id, 'uid-1', '본문의 user_id 는 무시하고 검증된 id 를 쓴다');
  assert.deepEqual(Object.keys(row).sort(), ['enabled', 'lang', 'platform', 'token', 'tz', 'updated_at', 'user_id']);
  assert.equal(row.enabled, false);
  assert.equal(row.lang, 'en');
  assert.equal(row.platform, 'android');
});

test('기본값 — enabled true · lang ko · 이상한 tz 는 버림', async () => {
  const r = await call({ token: TOKEN, lang: 'jp', tz: 'x;drop table' });
  const row = JSON.parse(r.calls.find(c => c.url.includes('push_tokens')).init.body);
  assert.equal(row.enabled, true);
  assert.equal(row.lang, 'ko');
  assert.equal(row.tz, null);
});

test('DB 실패는 502', async () => {
  assert.equal((await call({ token: TOKEN }, { upsert: 500 })).status, 502);
});

test('🍎 platform — ios 만 그대로, 그 밖의 값은 android', async () => {
  const ios = await call({ token: TOKEN, platform: 'ios' });
  assert.equal(JSON.parse(ios.calls.find(c => c.url.includes('push_tokens')).init.body).platform, 'ios');
  const odd = await call({ token: TOKEN, platform: 'web' });
  assert.equal(JSON.parse(odd.calls.find(c => c.url.includes('push_tokens')).init.body).platform, 'android');
});
