import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, cpSync, readFileSync, readdirSync, existsSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { bundleBoot } from '../scripts/lib/bundle-boot.mjs';

function stage() {
  const dir = mkdtempSync(path.join(tmpdir(), 'cf-boot-'));
  cpSync('index.html', path.join(dir, 'index.html'));
  cpSync('js', path.join(dir, 'js'), { recursive: true });
  return dir;
}

const scriptSrcs = (html) => [...html.matchAll(/<script type="module" src="([^"]+)"><\/script>/g)].map(m => m[1]);

test('bundle-boot: 첫 화면에 받는 JS 가 25개 이하로 줄어든다', async () => {
  const dir = stage();
  try {
    const { bootFiles } = await bundleBoot(dir);
    assert.ok(bootFiles.length > 0 && bootFiles.length <= 25, `첫 화면 JS ${bootFiles.length}개`);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('bundle-boot: 모듈 스크립트가 묶음 src 로 바뀌고 순서(번역 → 오류 수집 → 게임)가 유지된다', async () => {
  const dir = stage();
  try {
    await bundleBoot(dir);
    const html = readFileSync(path.join(dir, 'index.html'), 'utf8');
    assert.doesNotMatch(html, /<script type="module">/, '인라인 모듈이 남아 있다');
    assert.doesNotMatch(html, /src="\.\/js\/client-errors-boot\.js"/, '오류 수집이 묶음 밖에 남으면 모듈이 두 벌 생긴다');
    const srcs = scriptSrcs(html);
    assert.equal(srcs.length, 3);
    assert.match(srcs[0], /^\.\/js\/b\/boot-i18n-[A-Z0-9]+\.js$/);
    assert.match(srcs[1], /^\.\/js\/b\/client-errors-boot-[A-Z0-9]+\.js$/);
    assert.match(srcs[2], /^\.\/js\/b\/main-[A-Z0-9]+\.js$/);
    for (const s of srcs) assert.ok(existsSync(path.join(dir, s)), `${s} 없음`);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('bundle-boot: three 를 묶음에 넣어 importmap·unpkg 가 사라진다', async () => {
  const dir = stage();
  try {
    await bundleBoot(dir);
    const html = readFileSync(path.join(dir, 'index.html'), 'utf8');
    assert.doesNotMatch(html, /importmap/);
    assert.doesNotMatch(html, /unpkg\.com/);
    const all = readdirSync(path.join(dir, 'js/b')).map(f => readFileSync(path.join(dir, 'js/b', f), 'utf8')).join('\n');
    assert.doesNotMatch(all, /from\s*["']three(?:\/addons\/[^"']*)?["']/, '맨 이름 three import 가 남았다');
    assert.doesNotMatch(all, /esm\.sh\/@supabase/, 'supabase 는 vendor 한 파일로 묶여야 한다(esm.sh 는 17개로 쪼개 받는다)');
    assert.match(all, /esm\.sh\/@apps-in-toss\/web-framework/, '토스 SDK 는 외부 동적 import 로 남아야 한다');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('bundle-boot: 원본 js/ 는 그대로 남는다(대시보드가 직접 import)', async () => {
  const dir = stage();
  try {
    await bundleBoot(dir);
    assert.ok(existsSync(path.join(dir, 'js/game.js')));
    assert.ok(!existsSync(path.join(dir, '__boot_main.js')), '임시 진입 파일이 남았다');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('bundle-boot: 게임 인라인 모듈을 못 찾으면 빌드를 멈춘다', async () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'cf-boot-'));
  try {
    writeFileSync(path.join(dir, 'index.html'), '<html><body></body></html>');
    await assert.rejects(() => bundleBoot(dir), /게임 인라인 모듈/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
