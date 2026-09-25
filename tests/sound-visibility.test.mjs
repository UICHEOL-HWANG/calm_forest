// 🔇 앱이 백그라운드로 가도 음악이 계속 나오던 것(2026-09-25 실기기 — 뒤로가기로 홈에 나가도 BGM)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../js/sound.js', import.meta.url), 'utf8');
const main = readFileSync(new URL('../android/app/src/main/java/com/cheorish/lab/calmforest/MainActivity.java', import.meta.url), 'utf8');

test('화면이 숨겨지면 AudioContext 를 멈추고, 다시 보이면 재개한다', () => {
  assert.match(src, /visibilitychange/);
  assert.match(src, /ctx\.suspend\(\)/);
});

test('앱은 액티비티 onPause/onResume 을 WebView 에 전달한다(안 하면 visibilitychange 가 안 온다)', () => {
  assert.match(main, /getWebView\(\)\.onPause\(\)/);
  assert.match(main, /getWebView\(\)\.onResume\(\)/);
});
