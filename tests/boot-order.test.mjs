import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { once, hasStoredAuthSession, loginFirst } from '../js/boot-order.js';

const mem = (entries = {}) => {
  const m = new Map(Object.entries(entries));
  return { getItem: k => (m.has(k) ? m.get(k) : null) };
};
const URL_ = 'https://abcdefgh.supabase.co';

test('once: 여러 번 불러도 같은 약속을 돌려준다', async () => {
  let calls = 0;
  const load = once(async () => { calls++; return 'lib'; });
  const a = load(); const b = load();
  assert.equal(a, b);
  assert.equal(await a, 'lib');
  assert.equal(calls, 1);
});

test('once: 실패하면 다음 호출에서 다시 시도한다', async () => {
  let calls = 0;
  const load = once(async () => { calls++; if (calls === 1) throw new Error('net'); return 'ok'; });
  await assert.rejects(load());
  assert.equal(await load(), 'ok');
  assert.equal(calls, 2);
});

test('once: 실패를 아무도 안 기다려도 처리되지 않은 거부가 남지 않는다', async () => {
  const seen = [];
  const h = (e) => seen.push(e);
  process.on('unhandledRejection', h);
  const load = once(async () => { throw new Error('net'); });
  load();
  await new Promise(r => setTimeout(r, 10));
  process.off('unhandledRejection', h);
  assert.deepEqual(seen, []);
});

test('hasStoredAuthSession: 프로젝트 키에 토큰이 있으면 true', () => {
  assert.equal(hasStoredAuthSession(mem({ 'sb-abcdefgh-auth-token': '{"access_token":"x"}' }), URL_), true);
});

test('hasStoredAuthSession: 다른 프로젝트·빈 값·키 없음은 false', () => {
  assert.equal(hasStoredAuthSession(mem({ 'sb-other-auth-token': '{"a":1}' }), URL_), false);
  assert.equal(hasStoredAuthSession(mem({ 'sb-abcdefgh-auth-token': '' }), URL_), false);
  assert.equal(hasStoredAuthSession(mem(), URL_), false);
});

test('hasStoredAuthSession: 저장소가 막혀도 던지지 않는다', () => {
  const broken = { getItem() { throw new Error('denied'); } };
  assert.equal(hasStoredAuthSession(broken, URL_), false);
  assert.equal(hasStoredAuthSession(undefined, URL_), false);
  assert.equal(hasStoredAuthSession(mem(), 'not a url'), false);
});

test('loginFirst: 웹이고 저장된 세션이 없을 때만 로그인 화면을 먼저 띄운다', () => {
  assert.equal(loginFirst({ platform: 'web', storedSession: false }), true);
  assert.equal(loginFirst({ platform: 'web', storedSession: true }), false);
  for (const platform of ['android', 'ios', 'toss', 'itch']) assert.equal(loginFirst({ platform, storedSession: false }), false, platform);
});

test('supabase-client: build-cap 치환 앵커 문자열이 한 번만 남아 있다', () => {
  const src = readFileSync('js/supabase-client.js', 'utf8');
  const anchor = "await import('https://esm.sh/@supabase/supabase-js@2.116.0')";
  assert.equal(src.split(anchor).length - 1, 1);
});

test('build-web: 로그인 정지 배경 이미지를 배포에 넣는다', () => {
  assert.ok(readFileSync('scripts/build-web.mjs', 'utf8').includes("'assets/social/login-bg.webp'"));
});

test('boot loading screen shows the scene background, save-stuck screen drops it', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /<div id="loading" class="boot-bg">/);
  assert.match(html, /#loading\.boot-bg \{[^}]*login-bg\.webp/);
  assert.match(html, /el\.classList\.remove\('boot-bg'\);\s*el\.classList\.add\('save-stuck'\)/);
});

test('deferred guest arms input detection only after the world is built', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const body = html.slice(html.indexOf('async function startDeferredGuest()'), html.indexOf("await enterPlay('guest_deferred')"));
  assert.ok(body.indexOf('await ensureWorld()') > 0 && body.indexOf('await ensureWorld()') < body.indexOf('armDeferredGuest('));
});

test('world build failure shows a reload prompt instead of a dead login screen', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /worldP\.catch\(showWorldFailed\)/);
  assert.match(html, /try \{ await ensureWorld\(\); \} catch \{ return; \}\n\s*\$\('login-screen'\)/);
  assert.match(html, /ensureWorld\(\)\.catch\(\(\) => \{\}\);/);
});
