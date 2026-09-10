// =============================================================
//  📱 PWA 아이콘 생성 — assets/brand/icon*.svg → assets/pwa/icon-*.png
//  make-icon.mjs 와 같은 방식(헤드리스 Chrome 스크린샷) — 이미지 라이브러리 불필요.
//   icon.svg          → icon-192.png · icon-512.png        (purpose: any)
//   icon-maskable.svg → icon-maskable-512.png              (purpose: maskable)
//  사용: node scripts/make-pwa-icons.mjs
// =============================================================
import { execFileSync } from 'node:child_process';
import { writeFileSync, rmSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const OUT_DIR = 'assets/pwa';
const JOBS = [
  { svg: 'icon.svg', size: 192, out: 'icon-192.png' },
  { svg: 'icon.svg', size: 512, out: 'icon-512.png' },
  { svg: 'icon-maskable.svg', size: 512, out: 'icon-maskable-512.png' },
];

mkdirSync(OUT_DIR, { recursive: true });
for (const { svg, size, out } of JOBS) {
  const tmp = resolve('assets/brand/_render.html');
  writeFileSync(tmp, `<!doctype html><meta charset="utf-8">
<style>html,body{margin:0;padding:0}img{display:block;width:${size}px;height:${size}px}</style>
<img src="${svg}">`);
  try {
    execFileSync(CHROME, [
      '--headless', '--disable-gpu', '--hide-scrollbars',
      '--force-device-scale-factor=1', `--window-size=${size},${size}`,
      `--screenshot=${OUT_DIR}/${out}`, 'file://' + tmp,
    ], { stdio: 'ignore' });
    console.log(`[make-pwa-icons] ${OUT_DIR}/${out} (${size}×${size})`);
  } finally {
    rmSync(tmp, { force: true });
  }
}
