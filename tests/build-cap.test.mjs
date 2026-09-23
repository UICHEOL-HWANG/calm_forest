// 📱 구글 플레이(Capacitor) 앱 번들 — scripts/build-cap.mjs 와 platform.js 'android' 감지
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, rmSync, existsSync } from 'node:fs';

async function detectWith(win, search = '') {
  globalThis.window = win;
  globalThis.location = { search, hostname: 'localhost' };
  const origLog = console.log;
  console.log = () => {};
  try {
    return (await import(`../js/platform.js?t=${Math.random()}`)).PLATFORM;
  } finally {
    console.log = origLog;
    delete globalThis.window;
    delete globalThis.location;
  }
}

test("platform: __ANDROID__ 플래그가 있으면 'android'", async () => {
  assert.equal(await detectWith({ __ANDROID__: true }), 'android');
});

test("platform: 플래그가 없으면 여전히 'web'", async () => {
  assert.equal(await detectWith({}), 'web');
});

test('build-cap: 플래그 주입 · vendor 치환 · API_BASE 절대 URL · SW 제거', () => {
  try {
    execFileSync('node', ['scripts/build-cap.mjs'], { stdio: 'pipe' });
    const html = readFileSync('dist-cap/index.html', 'utf8');
    assert.match(html, /<head>\s*<script>window\.__ANDROID__ = true;<\/script>/);
    assert.match(html, /"three": "\.\/vendor\/three\/three\.module\.js"/);
    assert.doesNotMatch(html, /unpkg\.com/);
    assert.doesNotMatch(html, /serviceWorker\.register/);
    assert.match(readFileSync('dist-cap/js/supabase-client.js', 'utf8'), /import\('\.\.\/vendor\/supabase\.js'\)/);
    assert.match(readFileSync('dist-cap/js/config.js', 'utf8'), /const API_BASE = 'https:\/\/calmforest\.cloud';/);
    assert.ok(existsSync('dist-cap/vendor/three/three.module.js'));
  } finally {
    rmSync('dist-cap', { recursive: true, force: true });
  }
});

test('웹 원본은 CDN 그대로 — 앱 치환이 공통 경로에 새지 않는다', () => {
  const html = readFileSync('index.html', 'utf8');
  assert.match(html, /"three": "https:\/\/unpkg\.com\/three@0\.160\.0\/build\/three\.module\.js"/);
  assert.doesNotMatch(html, /__ANDROID__ = true/);
});
