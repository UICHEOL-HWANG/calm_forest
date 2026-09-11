// =============================================================
//  📱 PWA 아이콘 생성 — assets/brand/bear-25deg-1024.png → assets/pwa/icon-*.png
//  그림 정의는 scripts/lib/icon-art.mjs (favicon·앱인토스 아이콘과 같은 소스).
//   icon-192.png · icon-512.png        purpose:"any"      — 라운드 사각 그대로 표시
//   icon-maskable-512.png              purpose:"maskable" — 안드로이드가 원·둥근사각 등으로
//     잘라내므로 배경은 캔버스 끝까지 채우고(정사각), 곰은 중앙 80% 안전영역 안에 둔다.
//  사용: node scripts/make-pwa-icons.mjs
// =============================================================
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { ROOT, iconPNG } from './lib/icon-art.mjs';

const OUT_DIR = path.join(ROOT, 'assets', 'pwa');
const JOBS = [
  { out: 'icon-192.png',          size: 192, opt: { round: true } },
  { out: 'icon-512.png',          size: 512, opt: { round: true } },
  { out: 'icon-maskable-512.png', size: 512, opt: { round: false, pad: 0.76 } },
];

mkdirSync(OUT_DIR, { recursive: true });
for (const { out, size, opt } of JOBS) {
  writeFileSync(path.join(OUT_DIR, out), iconPNG(size, opt));
  console.log(`[make-pwa-icons] assets/pwa/${out} (${size}×${size})`);
}
