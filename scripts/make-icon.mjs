// =============================================================
//  앱 아이콘 생성 — assets/icon.svg → assets/icon-600.png
//  앱인토스 콘솔 규격: 600×600, PNG, 정사각(라운딩 불가), 배경 불투명.
//  헤드리스 Chrome 으로 렌더 — 별도 이미지 라이브러리 설치가 필요 없음.
//  사용: node scripts/make-icon.mjs
// =============================================================
import { execFileSync } from 'node:child_process';
import { writeFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const TMP_HTML = resolve('assets/_render.html');

writeFileSync(TMP_HTML, `<!doctype html><meta charset="utf-8">
<style>html,body{margin:0;padding:0}img{display:block;width:600px;height:600px}</style>
<img src="icon.svg">`);

try {
  execFileSync(CHROME, [
    '--headless', '--disable-gpu', '--hide-scrollbars',
    '--force-device-scale-factor=1', '--window-size=600,600',
    '--screenshot=assets/icon-600.png', 'file://' + TMP_HTML,
  ], { stdio: 'ignore' });
  console.log('[make-icon] assets/icon-600.png 생성 완료 (600×600)');
} finally {
  rmSync(TMP_HTML, { force: true });
}
