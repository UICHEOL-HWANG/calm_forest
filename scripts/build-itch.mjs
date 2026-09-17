#!/usr/bin/env node
// =============================================================
//  🎮 itch.io HTML5 번들 만들기 — dist-itch/ + dist-itch.zip
//  ------------------------------------------------------------
//  itch 는 zip 을 받아 html-classic.itch.zone 오리진의 iframe 안에서 서빙한다(루트에 index.html 필수).
//  토스 번들(build-ait.mjs)과 같은 문제가 그대로 생기므로 같은 처리를 한다:
//   ① index.html 에 플랫폼 플래그 window.__ITCH__ 주입 → js/platform.js 가 'itch' 로 인식
//   ② js/config.js 의 API_BASE 를 웹 오리진 절대 URL 로 치환('/api/*' 상대경로는 404)
//      → 안내서(guide)·구글 팝업 복귀 페이지(auth-popup.html)도 이 오리진에서 받아온다
//   ③ 루트 절대경로 파비콘·manifest <link> 제거(iframe 안에서 itch.zone 루트 404 만 남기므로)
//   ④ zip 으로 묶어 업로드 파일을 만든다(butler push 는 폴더도 받지만 웹 업로드는 zip)
//  사용: node scripts/build-itch.mjs   (또는 npm run build:itch)
// =============================================================
import { cpSync, rmSync, mkdirSync, readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const API_ORIGIN = 'https://calmforest.cloud';   // worker/index.js 가 /api/* 를 처리하는 곳
const OUT = 'dist-itch';
const ZIP = 'dist-itch.zip';

rmSync(OUT, { recursive: true, force: true });
rmSync(ZIP, { force: true });
mkdirSync(OUT, { recursive: true });

// ① 플랫폼 플래그 — <head> 직후, 모든 모듈보다 먼저
let html = readFileSync('index.html', 'utf8');
if (!html.includes('<head>')) throw new Error('[build-itch] index.html 에서 <head> 를 못 찾음');
html = html.replace('<head>', '<head>\n  <script>window.__ITCH__ = true;</script>');

// ③ 루트 절대경로 파비콘·터치 아이콘 링크 제거
const before = html;
html = html.replace(/^\s*<!-- 📱 PWA[\s\S]*?-->\s*\n/m, '');   // 📱 manifest 링크 위 설명 주석(링크는 아래에서 제거)
html = html.replace(/^\s*<link rel="(?:icon|apple-touch-icon|manifest)"[^>]*href="\/[^"]*"[^>]*>\s*\n/gm, '');   // 📱 PWA manifest 링크도 제거
const stripped = (before.match(/<link rel="(?:icon|apple-touch-icon|manifest)"/g) || []).length;
writeFileSync(`${OUT}/index.html`, html);

// 게임 모듈(전부 절차 생성이라 정적 자산은 js/ 뿐 — 안내서는 웹 오리진에서 fetch)
cpSync('js', `${OUT}/js`, { recursive: true });

// ② API_BASE 치환 — 앵커가 사라지면 조용히 깨진 번들이 나가지 않도록 빌드를 실패시킨다
const CONFIG_PATH = `${OUT}/js/config.js`;
const ANCHOR = "const API_BASE = '';";
let cfg = readFileSync(CONFIG_PATH, 'utf8');
if (!cfg.includes(ANCHOR)) {
  throw new Error(`[build-itch] js/config.js 에서 ${ANCHOR} 앵커를 못 찾음 — ` +
    'API_BASE 치환이 불가능해 번들의 /api/* 호출이 전부 404 가 됩니다.');
}
cfg = cfg.replace(ANCHOR, `const API_BASE = '${API_ORIGIN}';`);
writeFileSync(CONFIG_PATH, cfg);

// 상대경로 API 호출·루트 절대경로가 남았으면 멈춘다
const leftovers = [];
for (const [name, text] of [['index.html', html], ['js/config.js', cfg]]) {
  for (const m of text.matchAll(/fetch\(\s*['"`]\/api\//g)) leftovers.push(`${name}: ${m[0]}`);
  for (const m of text.matchAll(/(?:href|src)="\/[a-z]/g)) leftovers.push(`${name}: ${m[0]}`);
}
if (leftovers.length) {
  throw new Error('[build-itch] itch.zone 에서 404 가 될 경로가 남아 있습니다:\n  ' + leftovers.join('\n  '));
}

// ④ zip — index.html 이 zip 루트에 오도록 OUT 안에서 묶는다
execFileSync('zip', ['-qr', `../${ZIP}`, '.', '-x', '.DS_Store'], { cwd: OUT, stdio: 'inherit' });
const mb = (statSync(ZIP).size / 1024 / 1024).toFixed(2);
console.log(`[build-itch] ${OUT}/ 준비 완료 (플래그 주입 · API_BASE=${API_ORIGIN} · 파비콘 링크 ${stripped}개 제거)`);
console.log(`[build-itch] ${ZIP} ${mb} MB — itch 대시보드 업로드 또는: butler push ${OUT} <user>/<game>:html`);
if (!existsSync(`${OUT}/index.html`)) throw new Error('[build-itch] index.html 누락');
