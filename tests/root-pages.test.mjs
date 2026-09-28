// =============================================================
//  📄 단독 HTML 페이지 — 저장소에서는 pages/ 로 묶고, 공개 URL 은 루트 그대로
//  ⚠️ URL 이 바뀌면 안 되는 이유가 페이지마다 있다.
//     /privacy·/delete-account  구글 플레이 등록정보가 가리킨다(404 = 심사 반려)
//     /auth-popup.html          Supabase 리디렉트 허용 목록 + itch 팝업 로그인 복귀
//     /offline.html             sw.js 가 이 경로를 프리캐시한다
// =============================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const ROOT = new URL('../', import.meta.url);
const read = (p) => readFileSync(new URL(p, ROOT), 'utf8');
const PAGES = ['auth-popup.html', 'delete-account.html', 'offline.html', 'privacy.html'];

test('루트에 남는 HTML 은 index.html 하나뿐이다', () => {
  const tracked = execFileSync('git', ['ls-files', '*.html'], { cwd: new URL('.', ROOT).pathname, encoding: 'utf8' })
    .split('\n').filter(f => f && !f.includes('/'));
  assert.deepEqual(tracked, ['index.html']);
});

test('페이지 원본은 pages/ 에 있다', () => {
  for (const p of PAGES) assert.ok(existsSync(new URL(`pages/${p}`, ROOT)), `pages/${p} 없음`);
});

test('build-web 이 pages/ 를 루트 URL 로 편다 — 공개 경로 불변', () => {
  const src = read('scripts/build-web.mjs');
  for (const p of PAGES) assert.ok(src.includes(`['pages/${p}', '${p}']`), `INCLUDE 에 pages/${p} → ${p} 없음`);
});

test('로컬 서버도 같은 공개 경로로 연다 — 로컬 = 운영', () => {
  const src = read('scripts/serve.py');
  for (const p of PAGES) assert.ok(src.includes(`'/${p}': 'pages/${p}'`), `serve.py 에 /${p} 별칭 없음`);
  assert.ok(src.includes("'/privacy': 'pages/privacy.html'"));
  assert.ok(src.includes("'/delete-account': 'pages/delete-account.html'"));
});
