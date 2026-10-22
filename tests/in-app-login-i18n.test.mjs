import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { INAPP_COPY } from '../js/auth/in-app-login.js';
import { EN } from '../js/i18n-en.js';

test('인앱 안내 문구는 전부 영어 사전에 있다', () => {
  for (const ko of Object.values(INAPP_COPY)) assert.ok(EN[ko], ko);
});

test('문구에 엠대시를 쓰지 않는다', () => {
  for (const ko of Object.values(INAPP_COPY)) assert.ok(!ko.includes('—'), ko);
});

test('인앱 로그인은 이메일로 통일 — 브라우저 전환 버튼을 만들지 않고 이메일이 맨 위', () => {
  const src = readFileSync(new URL('../js/auth/in-app-login.js', import.meta.url), 'utf8');
  assert.doesNotMatch(src, /inapp-open|handoffUrl/);
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /body\.inapp #email-btn \{ order: 1;/);
  assert.doesNotMatch(html, /#inapp-handoff/);
});

test('index.html 은 인앱에서 구글 버튼을 숨기고 넛지 구글 로그인을 막는다', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /body\.inapp #google-btn \{ display: none; \}/);
  assert.match(html, /mountInAppLogin\(\{ \$, track: trackEvent, platform: PLATFORM \}\)/);
  assert.match(html, /holdGuestForLogin\(getGameState\(\)\);\s*if \(!inAppLogin\.inApp\) return signInWithGoogle\(\);/);
  assert.match(html, /sessionStorage\.setItem\('cf_login_email', '1'\)/);
  assert.match(html, /if \(sessionStorage\.getItem\('cf_login_email'\)\) \{ sessionStorage\.removeItem\('cf_login_email'\); \$\('email-btn'\)\.click\(\); \}/);
  assert.match(html, /trackEvent\('login_screen', \{ reason: why, inapp: inAppLogin\.app \|\| undefined \}\)/);
});

test('웹 게스트가 이메일·구글로 가입하면 게스트 마을을 새 계정으로 넘긴다', () => {
  const src = readFileSync(new URL('../js/supabase-client.js', import.meta.url), 'utf8');
  assert.match(src, /const APP_ACCOUNTS = \['toss', 'pgs', 'gc', 'apple', 'email', \.\.\.\(IS_IOS \|\| !IS_NATIVE \? \['google'\] : \[\]\)\];/);
  assert.match(src, /export function holdGuestForLogin\(stateNow\)/);
  assert.match(src, /takeHeldGuest\(\);\n\s*applySession\(data\.session\);/);
  assert.match(src, /if \(s && !isAnon\(s\)\) \{\n\s*takeHeldGuest\(\);/);
});
