// =============================================================
//  앱인토스 웹 번들 준비 — 정적 파일을 dist-toss/ 로 복사하며
//  토스 플랫폼 플래그(window.__APPS_IN_TOSS__)를 index.html 에 주입.
//  → js/platform.js 의 detect() 가 이 플래그로 'toss' 를 인식(빌드타임 확정)
//  사용: node scripts/build-ait.mjs  (package.json build 스크립트에서 ait build 앞에 실행)
// =============================================================
import { cpSync, rmSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

rmSync('dist-toss', { recursive: true, force: true });
mkdirSync('dist-toss', { recursive: true });

// index.html: <head> 직후에 플랫폼 플래그 주입 — 모든 모듈보다 먼저 실행됨
let html = readFileSync('index.html', 'utf8');
html = html.replace('<head>', '<head>\n  <script>window.__APPS_IN_TOSS__ = true;</script>');
writeFileSync('dist-toss/index.html', html);

// 게임 모듈(전부 절차 생성이라 정적 자산은 js/ 뿐)
cpSync('js', 'dist-toss/js', { recursive: true });

console.log('[build-ait] dist-toss 준비 완료 (플랫폼 플래그 주입됨)');
