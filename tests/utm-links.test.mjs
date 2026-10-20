import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { LANDINGS, isSlug, validateInput, buildFinalUrl, makeCode, sheetRow } from '../functions/api/_utm.js';

const src = (rel) => readFileSync(new URL('../' + rel, import.meta.url), 'utf8');
const allowed = { sources: ['threads', 'instagram', 'kakao'], mediums: ['social', 'sns_share'] };
const base = { source: 'threads', medium: 'social', campaign: 'appstore_review', content: 'post_v2' };

test('isSlug: 소문자·숫자·밑줄만, 40자 이하', () => {
  assert.equal(isSlug('post_v2'), true);
  assert.equal(isSlug('Post'), false);
  assert.equal(isSlug('a-b'), false);
  assert.equal(isSlug('a&b=c'), false);
  assert.equal(isSlug(''), false);
  assert.equal(isSlug('a'.repeat(41)), false);
});

test('validateInput: 허용 목록 밖 source·medium 은 거부', () => {
  assert.equal(validateInput({ ...base, landings: ['web'] }, allowed).ok, true);
  assert.match(validateInput({ ...base, source: 'Threads', landings: ['web'] }, allowed).error, /source/);
  assert.match(validateInput({ ...base, medium: 'cpc', landings: ['web'] }, allowed).error, /medium/);
});

test('validateInput: campaign 필수, content 는 비워도 된다, 랜딩은 1개 이상·알려진 것만', () => {
  assert.match(validateInput({ ...base, campaign: '', landings: ['web'] }, allowed).error, /campaign/);
  assert.equal(validateInput({ ...base, content: '', landings: ['web'] }, allowed).ok, true);
  assert.match(validateInput({ ...base, content: 'Bad!', landings: ['web'] }, allowed).error, /content/);
  assert.match(validateInput({ ...base, landings: [] }, allowed).error, /landing/);
  assert.match(validateInput({ ...base, landings: ['evil'] }, allowed).error, /landing/);
  assert.match(validateInput({ ...base, landings: ['web', 'web'] }, allowed).error, /landing/);
  assert.match(validateInput({ ...base, memo: 'x'.repeat(301), landings: ['web'] }, allowed).error, /memo/);
});

test('buildFinalUrl: 웹·위키·앱 자동은 utm 쿼리 (시트 기존 줄과 같은 모양)', () => {
  assert.equal(buildFinalUrl('web', base),
    'https://calmforest.cloud/?utm_source=threads&utm_medium=social&utm_campaign=appstore_review&utm_content=post_v2');
  assert.equal(buildFinalUrl('wiki', { ...base, content: '' }),
    'https://calmforest.cloud/wiki/?utm_source=threads&utm_medium=social&utm_campaign=appstore_review');
  assert.equal(buildFinalUrl('app', base),
    'https://calmforest.cloud/app?utm_source=threads&utm_medium=social&utm_campaign=appstore_review&utm_content=post_v2');
});

test('buildFinalUrl: Play 는 referrer 안에 %3D·%26 인코딩', () => {
  assert.equal(buildFinalUrl('play', base),
    'https://play.google.com/store/apps/details?id=com.cheorish.lab.calmforest&referrer=utm_source%3Dthreads%26utm_medium%3Dsocial%26utm_campaign%3Dappstore_review%26utm_content%3Dpost_v2');
});

test('buildFinalUrl: App Store 는 pt 고정 + ct=source_campaign_content (100자 상한)', () => {
  assert.equal(buildFinalUrl('ios', base),
    'https://apps.apple.com/app/apple-store/id6821420691?pt=129595134&ct=threads_appstore_review_post_v2&mt=8');
  assert.equal(buildFinalUrl('ios', { ...base, content: '' }),
    'https://apps.apple.com/app/apple-store/id6821420691?pt=129595134&ct=threads_appstore_review&mt=8');
  const long = buildFinalUrl('ios', { ...base, campaign: 'c'.repeat(40), content: 'd'.repeat(40), source: 's'.repeat(40) });
  assert.equal(new URL(long).searchParams.get('ct').length, 100);
});

test('LANDINGS: 랜딩 URL 은 시트 F 열과 같은 값', () => {
  assert.equal(LANDINGS.web.url, 'https://calmforest.cloud/');
  assert.equal(LANDINGS.play.url, 'https://play.google.com/store/apps/details?id=com.cheorish.lab.calmforest');
  assert.equal(LANDINGS.ios.url, 'https://apps.apple.com/app/apple-store/id6821420691');
});

test('makeCode: 6자 영숫자, 매번 다르다', () => {
  const a = makeCode(), b = makeCode();
  assert.match(a, /^[A-Za-z0-9]{6}$/);
  assert.notEqual(a, b);
});

test('sheetRow: 링크내역 A~I 열 순서', () => {
  const row = sheetRow({ date: '2026-10-20', ...base, memo: '메모', landing: 'play', finalUrl: 'F', shortUrl: 'S' });
  assert.deepEqual(row, ['2026-10-20', 'threads', 'social', 'appstore_review', 'post_v2', LANDINGS.play.url, 'F', '메모', 'S']);
});

test('Worker 라우트: /api/utm-links 와 /go/ 가 등록돼 있다', () => {
  const w = src('worker/index.js');
  assert.ok(w.includes("pathname === '/api/utm-links'"));
  assert.ok(w.includes("pathname.startsWith('/go/')"));
  assert.ok(src('wrangler.jsonc').includes('"UTM_LINKS"'));
});

function mockEnv() {
  const store = new Map();
  return {
    store,
    env: {
      SUPABASE_URL: 'https://sb', SUPABASE_ANON_KEY: 'k', UTM_SHEET_ID: 'SHEET',
      UTM_LINKS: {
        get: async (k) => store.get(k) ?? null,
        put: async (k, v) => { store.set(k, v); },
        delete: async (k) => { store.delete(k); },
      },
    },
  };
}

const ADMIN = '17bb08c7-c4bc-4870-b464-1b131e67aff8';

function mockFetch({ admin = true, appendOk = true } = {}) {
  const calls = [];
  const fn = async (url, init = {}) => {
    const u = String(url);
    calls.push({ url: u, init });
    if (u.endsWith('/auth/v1/user')) {
      return admin ? Response.json({ id: ADMIN, is_anonymous: false }) : Response.json({ id: 'x' });
    }
    if (u.includes(':batchGet')) {
      return Response.json({ valueRanges: [
        { values: [['threads'], ['instagram'], [], ['kakao']] },
        { values: [['social'], ['sns_share']] },
        { values: [['2026-10-20', 'threads', 'social', 'c1', 'p', LANDINGS.web.url, 'F1', 'm', 'https://calmforest.cloud/go/AbC123']] },
      ] });
    }
    if (init.method === 'PUT' && u.includes('valueInputOption=RAW')) return appendOk ? Response.json({}) : new Response('no', { status: 403 });
    return new Response('unexpected', { status: 500 });
  };
  return { calls, fn };
}

async function withMocks(opts, body) {
  const { calls, fn } = mockFetch(opts);
  const real = globalThis.fetch;
  globalThis.fetch = fn;
  const mod = await import('../functions/api/utm-links.js');
  mod.__setSheetsToken(async () => 'tok');
  try { return await body(mod, calls); } finally { globalThis.fetch = real; mod.__setSheetsToken(null); }
}

const authed = (url) => new Request(url, { headers: { Authorization: 'Bearer t' } });
const post = (b) => new Request('https://calmforest.cloud/api/utm-links', {
  method: 'POST', headers: { Authorization: 'Bearer t', 'content-type': 'application/json' }, body: JSON.stringify(b),
});

test('API: 관리자가 아니면 401', async () => {
  await withMocks({ admin: false }, async (mod) => {
    const { env } = mockEnv();
    const res = await mod.onRequestGet({ request: authed('https://x/api/utm-links'), env });
    assert.equal(res.status, 401);
  });
});

test('API GET: 허용값(빈 칸 제외)과 최근 링크(클릭 수 포함)를 돌려준다', async () => {
  await withMocks({}, async (mod) => {
    const { env, store } = mockEnv();
    store.set('c:AbC123', '7');
    const res = await mod.onRequestGet({ request: authed('https://x/api/utm-links'), env });
    const data = await res.json();
    assert.deepEqual(data.sources, ['threads', 'instagram', 'kakao']);
    assert.deepEqual(data.mediums, ['social', 'sns_share']);
    assert.equal(data.recent[0].code, 'AbC123');
    assert.equal(data.recent[0].clicks, 7);
  });
});

test('API POST: 랜딩마다 KV 저장 + 시트 마지막 줄 다음에 한 번에 기록', async () => {
  await withMocks({}, async (mod, calls) => {
    const { env, store } = mockEnv();
    const res = await mod.onRequestPost({ request: post({ ...base, memo: '테스트', landings: ['web', 'play'] }), env });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.links.length, 2);
    for (const l of data.links) {
      assert.match(l.shortUrl, /^https:\/\/calmforest\.cloud\/go\/[A-Za-z0-9]{6}$/);
      assert.equal(JSON.parse(store.get('l:' + l.code)).url, l.finalUrl);
    }
    const write = calls.find((c) => c.init.method === 'PUT');
    assert.ok(write.url.includes('/SHEET/values/'));
    assert.ok(decodeURIComponent(write.url).includes('링크내역!A3:I4'), '헤더 1줄 + 기존 1줄 다음인 3행부터');
    assert.equal(JSON.parse(write.init.body).values.length, 2);
  });
});

test('API POST: 시트 기록이 실패하면 KV 를 지우고 502 — 장부에 없는 링크를 남기지 않는다', async () => {
  await withMocks({ appendOk: false }, async (mod) => {
    const { env, store } = mockEnv();
    const res = await mod.onRequestPost({ request: post({ ...base, landings: ['web'] }), env });
    assert.equal(res.status, 502);
    assert.equal([...store.keys()].filter((k) => k.startsWith('l:')).length, 0);
  });
});

test('API POST: KV 저장이 실패하면 이미 쓴 항목을 지우고 502', async () => {
  await withMocks({}, async (mod) => {
    const { env, store } = mockEnv();
    let n = 0;
    const put = env.UTM_LINKS.put;
    env.UTM_LINKS.put = async (k, v) => { if (++n === 2) throw new Error('kv down'); return put(k, v); };
    const res = await mod.onRequestPost({ request: post({ ...base, landings: ['web', 'play'] }), env });
    assert.equal(res.status, 502);
    assert.equal([...store.keys()].filter((k) => k.startsWith('l:')).length, 0);
  });
});

test('API POST: 허용 목록 밖 source 는 400', async () => {
  await withMocks({}, async (mod) => {
    const { env } = mockEnv();
    const res = await mod.onRequestPost({ request: post({ ...base, source: 'tiktok', landings: ['web'] }), env });
    assert.equal(res.status, 400);
  });
});

test('/go/<code>: 302 + 클릭 수 증가, 모르는 코드는 홈으로', async () => {
  const { handleGo } = await import('../functions/go-redirect.js');
  const { env, store } = mockEnv();
  store.set('l:AbC123', JSON.stringify({ url: 'https://calmforest.cloud/?utm_source=threads' }));
  const pending = [];
  const ctx = { waitUntil: (p) => pending.push(p) };
  const res = await handleGo(new Request('https://calmforest.cloud/go/AbC123'), env, ctx);
  assert.equal(res.status, 302);
  assert.equal(res.headers.get('location'), 'https://calmforest.cloud/?utm_source=threads');
  assert.equal(res.headers.get('cache-control'), 'no-store');
  await Promise.all(pending);
  assert.equal(store.get('c:AbC123'), '1');
  const miss = await handleGo(new Request('https://calmforest.cloud/go/zzzzzz'), env, ctx);
  assert.equal(miss.status, 302);
  assert.equal(miss.headers.get('location'), 'https://calmforest.cloud/');
  await handleGo(new Request('https://calmforest.cloud/go/AbC123', { headers: { 'user-agent': 'facebookexternalhit/1.1' } }), env, ctx);
  await Promise.all(pending);
  assert.equal(store.get('c:AbC123'), '1', '링크 미리보기 봇은 클릭으로 세지 않는다');
  await handleGo(new Request('https://calmforest.cloud/go/AbC123', { method: 'HEAD' }), env, ctx);
  await Promise.all(pending);
  assert.equal(store.get('c:AbC123'), '1', 'HEAD 는 클릭으로 세지 않는다');
  const bad = await handleGo(new Request('https://calmforest.cloud/go/../etc'), env, ctx);
  assert.equal(bad.headers.get('location'), 'https://calmforest.cloud/');
});
