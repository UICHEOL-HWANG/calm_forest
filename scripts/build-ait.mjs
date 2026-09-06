// =============================================================
//  앱인토스 웹 번들 준비 — 정적 파일을 dist-toss/ 로 복사하며
//   ① 토스 플랫폼 플래그(window.__APPS_IN_TOSS__)를 index.html 에 주입
//      → js/platform.js 의 detect() 가 이 플래그로 'toss' 를 인식(빌드타임 확정)
//   ② API 오리진(API_BASE)을 절대 URL 로 치환
//      → 번들은 토스가 서빙하므로 '/api/...' 상대경로가 전부 404 가 된다.
//  사용: node scripts/build-ait.mjs  (package.json build 스크립트에서 ait build 앞에 실행)
// =============================================================
import { cpSync, rmSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

// 게임 API 가 실제로 서비스되는 오리진(worker/index.js 가 /api/* 를 처리하는 곳)
const API_ORIGIN = 'https://calmforest.cloud';

rmSync('dist-toss', { recursive: true, force: true });
mkdirSync('dist-toss', { recursive: true });

// ① index.html: <head> 직후에 플랫폼 플래그 주입 — 모든 모듈보다 먼저 실행됨
let html = readFileSync('index.html', 'utf8');
if (!html.includes('<head>')) throw new Error('[build-ait] index.html 에서 <head> 를 못 찾음');
html = html.replace('<head>', '<head>\n  <script>window.__APPS_IN_TOSS__ = true;</script>');
writeFileSync('dist-toss/index.html', html);

// 게임 모듈(전부 절차 생성이라 정적 자산은 js/ 뿐)
cpSync('js', 'dist-toss/js', { recursive: true });

// ② config.js: API_BASE 를 절대 오리진으로 치환.
//    앵커가 사라지면(리팩터링 등) 조용히 깨진 번들이 나가지 않도록 빌드를 실패시킨다.
const CONFIG_PATH = 'dist-toss/js/config.js';
const ANCHOR = "const API_BASE = '';";
let cfg = readFileSync(CONFIG_PATH, 'utf8');
if (!cfg.includes(ANCHOR)) {
  throw new Error(`[build-ait] js/config.js 에서 ${ANCHOR} 앵커를 못 찾음 — ` +
    'API_BASE 치환이 불가능해 번들의 /api/* 호출이 전부 404 가 됩니다. 앵커를 되살리거나 이 스크립트를 고치세요.');
}
cfg = cfg.replace(ANCHOR, `const API_BASE = '${API_ORIGIN}';`);
writeFileSync(CONFIG_PATH, cfg);

// 상대경로 API 호출이 남아 있으면 번들에서 404 가 되므로 빌드를 멈춘다
const leftovers = [];
for (const [name, text] of [['index.html', html], ['js/config.js', cfg]]) {
  for (const m of text.matchAll(/fetch\(\s*['"`]\/api\//g)) leftovers.push(`${name}: ${m[0]}`);
}
if (leftovers.length) {
  throw new Error('[build-ait] 상대경로 API 호출이 남아 있습니다 — CONFIG.API_BASE 를 앞에 붙이세요:\n  ' + leftovers.join('\n  '));
}

console.log(`[build-ait] dist-toss 준비 완료 (플랫폼 플래그 주입 · API_BASE=${API_ORIGIN})`);
