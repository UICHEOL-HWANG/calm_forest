import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { shouldShowDevLog } from '../js/devlog.js';

// 배포 콘솔에 유저 UUID·GA4 ID·세이브 행이 찍히던 것을 막는다(2026-10-13).
// 로컬 개발·?dbg 에서만 보인다.

test('배포 호스트에서는 숨긴다', () => {
  assert.equal(shouldShowDevLog('calmforest.cloud', ''), false);
  assert.equal(shouldShowDevLog('html-classic.itch.zone', ''), false);
  assert.equal(shouldShowDevLog('calmforest.cloud', '?platform=toss'), false);
});

test('로컬 개발 호스트에서는 보인다', () => {
  for (const h of ['localhost', '127.0.0.1', '[::1]', 'app.localhost']) {
    assert.equal(shouldShowDevLog(h, ''), true, h);
  }
});

test('스토어 앱(Capacitor)은 호스트가 localhost 여도 숨긴다', () => {
  assert.equal(shouldShowDevLog('localhost', '', true), false);
  assert.equal(shouldShowDevLog('localhost', '?dbg', true), true);
});

test('?dbg 를 붙이면 배포에서도 보인다', () => {
  assert.equal(shouldShowDevLog('calmforest.cloud', '?dbg'), true);
  assert.equal(shouldShowDevLog('calmforest.cloud', '?a=1&dbg=1'), true);
});

test('잘못된 입력에도 던지지 않고 숨긴다', () => {
  assert.equal(shouldShowDevLog(undefined, undefined), false);
});

// 식별자(UUID)·세이브 행을 찍던 파일에 console.log 가 다시 들어오지 않게
test('민감 로그 파일에는 console.log 직접 호출이 없다', () => {
  for (const f of ['supabase-client.js', 'analytics.js', 'platform.js', 'install-referrer-boot.js', 'cafe-guests.js', 'config.js']) {
    const src = readFileSync(new URL(`../js/${f}`, import.meta.url), 'utf8');
    assert.equal(/console\.log\(/.test(src), false, f);
  }
});
