import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { INAPP_COPY, buttonLabel } from '../js/auth/in-app-login.js';
import { EN } from '../js/i18n-en.js';

test('인앱 안내 문구는 전부 영어 사전에 있다', () => {
  for (const ko of Object.values(INAPP_COPY)) assert.ok(EN[ko], ko);
});

test('문구에 엠대시를 쓰지 않는다', () => {
  for (const ko of Object.values(INAPP_COPY)) assert.ok(!ko.includes('—'), ko);
});

test('버튼 문구는 OS 를 따르고 카카오톡은 기본 브라우저', () => {
  assert.equal(buttonLabel({ app: 'instagram', os: 'android' }), INAPP_COPY.android);
  assert.equal(buttonLabel({ app: 'facebook', os: 'ios' }), INAPP_COPY.ios);
  assert.equal(buttonLabel({ app: 'kakaotalk', os: 'ios' }), INAPP_COPY.other);
  assert.equal(buttonLabel({ app: 'threads', os: 'other' }), INAPP_COPY.other);
});

test('index.html 은 인앱에서 구글 버튼을 숨기고 넛지 구글 로그인을 막는다', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /body\.inapp #google-btn \{ display: none; \}/);
  assert.match(html, /mountInAppLogin\(\{ \$, track: trackEvent, platform: PLATFORM \}\)/);
  assert.match(html, /: \(\) => googleOrBlocked\('nudge'\);/);
  assert.match(html, /trackEvent\('login_screen', \{ reason: why, inapp: inAppLogin\.app \|\| undefined \}\)/);
});
