import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const analytics = readFileSync(new URL('../js/analytics.js', import.meta.url), 'utf8');

test('itch iframe 은 gtag config 에 SameSite=None;Secure 쿠키 플래그를 싣는다', () => {
  assert.match(analytics, /gtag\('config', id, PLATFORM === 'itch'\s*\?\s*\{ cookie_flags: 'SameSite=None;Secure' \}\s*:\s*\{\}\)/);
});

test('쿠키 플래그는 itch 에만 적용되고 config 호출은 한 번뿐이다', () => {
  assert.equal(analytics.match(/gtag\('config'/g).length, 1);
  assert.equal(analytics.match(/cookie_flags/g).length, 1);
});
