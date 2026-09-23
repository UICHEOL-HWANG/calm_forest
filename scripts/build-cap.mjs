#!/usr/bin/env node
// =============================================================
//  📱 구글 플레이(Capacitor) 앱 번들 만들기 — dist-cap/
//  ------------------------------------------------------------
//  Capacitor 는 이 폴더를 APK 안에 넣고 https://localhost 오리진의 WebView 로 띄운다.
//  itch 번들(build-itch.mjs)과 같은 문제가 생기고, 여기에 "오프라인에서도 떠야 한다"가 더해진다:
//   ① index.html 에 window.__ANDROID__ 플래그 주입(모든 모듈보다 먼저)
//   ② importmap 을 unpkg → ./vendor/ 로, supabase-js 동적 import 를 esm.sh → vendor 로 치환
//      (웹·토스·itch 는 CDN 그대로 — 라이브 3곳은 건드리지 않는다)
//   ③ js/config.js 의 API_BASE 를 웹 오리진 절대 URL 로 치환('/api/*' 상대경로는 localhost 로 간다)
//      → 안내서(guide)도 이 오리진에서 받아온다(앱 번들에 넣지 않는다)
//   ④ 파비콘·manifest 링크와 service worker 등록 제거 — 앱 자산으로 로드하므로 불필요
//  모든 치환은 앵커가 사라지면 빌드를 실패시킨다(조용히 CDN 을 타는 번들이 나가지 않도록).
//  사용: npm run build:cap   (= node scripts/build-cap.mjs && npx cap sync android)
// =============================================================
import { cpSync, rmSync, mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';

const API_ORIGIN = 'https://calmforest.cloud';   // worker/index.js 가 /api/* 를 처리하는 곳
const OUT = 'dist-cap';

const IMPORTMAP_THREE = '"three": "https://unpkg.com/three@0.160.0/build/three.module.js"';
const IMPORTMAP_ADDONS = '"three/addons/": "https://unpkg.com/three@0.160.0/examples/jsm/"';
const SUPABASE_IMPORT = "await import('https://esm.sh/@supabase/supabase-js@2')";
const API_ANCHOR = "const API_BASE = '';";

function replaceOnce(text, from, to, where) {
  if (!text.includes(from)) {
    throw new Error(`[build-cap] ${where} 에서 앵커를 못 찾음: ${from}\n` +
      '  → 원본이 바뀌었다. 치환 대상을 갱신하지 않으면 앱이 CDN 을 타서 오프라인에서 빈 화면이 된다.');
  }
  return text.replace(from, to);
}

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

// ── index.html ──
let html = readFileSync('index.html', 'utf8');
html = replaceOnce(html, '<head>', '<head>\n  <script>window.__ANDROID__ = true;</script>', 'index.html');   // ①
html = replaceOnce(html, IMPORTMAP_THREE, '"three": "./vendor/three/three.module.js"', 'index.html');     // ②
html = replaceOnce(html, IMPORTMAP_ADDONS, '"three/addons/": "./vendor/three/addons/"', 'index.html');
html = html.replace(/^\s*<!-- 📱 PWA[\s\S]*?-->\s*\n/gm, '');                                              // ④ 설명 주석
html = html.replace(/^\s*<link rel="(?:icon|apple-touch-icon|manifest)"[^>]*href="\/[^"]*"[^>]*>\s*\n/gm, '');
html = html.replace(/^\s*<script>\s*if \('serviceWorker' in navigator[\s\S]*?<\/script>\s*\n/m, '');
if (html.includes('serviceWorker.register')) throw new Error('[build-cap] service worker 등록 스크립트 제거 실패');
writeFileSync(`${OUT}/index.html`, html);

// ── 게임 모듈 + 자체 호스팅 라이브러리 ──
cpSync('js', `${OUT}/js`, { recursive: true });
cpSync('vendor', `${OUT}/vendor`, { recursive: true });

const SUPA_PATH = `${OUT}/js/supabase-client.js`;
writeFileSync(SUPA_PATH, replaceOnce(readFileSync(SUPA_PATH, 'utf8'),
  SUPABASE_IMPORT, "await import('../vendor/supabase.js')", 'js/supabase-client.js'));

const CONFIG_PATH = `${OUT}/js/config.js`;
writeFileSync(CONFIG_PATH, replaceOnce(readFileSync(CONFIG_PATH, 'utf8'),
  API_ANCHOR, `const API_BASE = '${API_ORIGIN}';`, 'js/config.js'));                                   // ③

// ── 검증: 오프라인에서 필요한 코드가 외부에서 오면 안 된다 ──
const problems = [];
for (const m of html.matchAll(/(?:href|src)="\/[a-z]/g)) problems.push(`index.html: 루트 절대경로 ${m[0]}`);
if (/unpkg\.com/.test(html)) problems.push('index.html: unpkg 참조가 남음');
if (/esm\.sh\/@supabase/.test(readFileSync(SUPA_PATH, 'utf8'))) problems.push('supabase-client.js: esm.sh 참조가 남음');
for (const f of ['vendor/three/three.module.js', 'vendor/supabase.js']) {
  if (!existsSync(`${OUT}/${f}`)) problems.push(`${f} 누락 — npm run build:vendor 먼저`);
}
if (problems.length) throw new Error('[build-cap] 앱 번들 검증 실패:\n  ' + problems.join('\n  '));

console.log(`[build-cap] ${OUT}/ 준비 완료 (플래그 주입 · vendor 치환 · API_BASE=${API_ORIGIN})`);
