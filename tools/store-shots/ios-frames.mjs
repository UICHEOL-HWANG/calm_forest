#!/usr/bin/env node
// =============================================================
//  🍎 App Store 스크린샷 시안 합성 — shots.mjs iphone 원본(1320×2868) 위에 캡션 디자인 3종
//  사용: node tools/store-shots/ios-frames.mjs [포트=9334]
//  산출: .scratch/store-shots/ios-<A|B|C>-<장면>.png (1320×2868) + ios-compare.png(비교 시트)
//  ⚠️ 캡션 문구는 사용자 검수 전 초안(ui-copy-review-first)
//  ⚠️ C 캡션은 HUD(상단 420px) 아래 띠에 — 위에 겹치면 미니맵·버튼과 엉킨다. B 는 화면 축소본이 캔버스 안에 다 들어가게(1000×2173)
// =============================================================
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch } from './cdp.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const DIR = path.join(ROOT, '.scratch', 'store-shots');
const W = 1320, H = 2868;
const LANG = process.env.LANG_CAPTION === 'en' ? 'en' : 'ko';   // LANG_CAPTION=en → 영어 캡션(App Store en-US)
const SCENES = LANG === 'en' ? [
  ['1-village', 'A tiny forest village', 'Your slow, cozy day'],
  ['2-house', 'Gather wood', 'Build and decorate home'],
  ['3-farm', 'Plant, water, wait', 'Watch your garden grow'],
  ['4-sea', 'Head out to sea', 'Reel in the big one'],
  ['5-night', 'When night falls', 'The forest glows'],
] : [
  ['1-village', '숲속 작은 마을에서', '나만의 느긋한 하루'],
  ['2-house', '나무를 모아', '내 집을 짓고 꾸며요'],
  ['3-farm', '씨앗을 심고 물을 주면', '텃밭이 무럭무럭'],
  ['4-sea', '바다로 나가', '큰 물고기를 낚아요'],
  ['5-night', '밤이 오면', '숲이 반짝여요'],
];
const FONT = `-apple-system, 'Apple SD Gothic Neo', sans-serif`;
const img = (name) => 'data:image/png;base64,' + readFileSync(path.join(DIR, `iphone-${LANG === 'en' ? 'en-' : ''}${name}.png`)).toString('base64');

const VARIANTS = {
  A: (src) => `<img src="${src}" style="width:${W}px;height:${H}px;display:block">`,
  B: (src, l1, l2) => `
    <div style="width:${W}px;height:${H}px;background:linear-gradient(#f6efe0,#e7f2df);display:flex;flex-direction:column;align-items:center;font-family:${FONT}">
      <div style="padding-top:230px;text-align:center;color:#3c4a41;line-height:1.25">
        <div style="font-size:84px;font-weight:600;opacity:.75">${l1}</div>
        <div style="font-size:112px;font-weight:800;letter-spacing:-2px">${l2}</div>
      </div>
      <div style="margin-top:100px;width:1000px;height:2173px;border-radius:72px;overflow:hidden;box-shadow:0 40px 90px rgba(40,60,45,.35);border:14px solid #fff">
        <img src="${src}" style="width:100%;height:100%;object-fit:cover;object-position:top;display:block">
      </div>
    </div>`,
  C: (src, l1, l2) => `
    <div style="position:relative;width:${W}px;height:${H}px;font-family:${FONT}">
      <img src="${src}" style="width:100%;height:100%;display:block">
      <div style="position:absolute;left:0;right:0;top:420px;height:760px;background:linear-gradient(rgba(25,40,30,0),rgba(25,40,30,.72) 30%,rgba(25,40,30,.72) 62%,rgba(25,40,30,0))"></div>
      <div style="position:absolute;top:610px;width:100%;text-align:center;color:#fff;line-height:1.25;text-shadow:0 4px 24px rgba(0,0,0,.35)">
        <div style="font-size:80px;font-weight:600;opacity:.9">${l1}</div>
        <div style="font-size:108px;font-weight:800;letter-spacing:-2px">${l2}</div>
      </div>
    </div>`,
};

const b = await launch(+(process.argv[2] || 9334));
await b.viewport(W, H, { dsf: 1 });
const outs = [];
for (const [v, render] of Object.entries(VARIANTS)) {
  for (const [name, l1, l2] of SCENES) {
    const html = `<!doctype html><meta charset="utf-8"><body style="margin:0">${render(img(name), l1, l2)}</body>`;
    const file = path.join(DIR, `ios-${LANG === 'en' ? 'en-' : ''}${v}-${name}.html`);
    writeFileSync(file, html);
    await b.goto('file://' + file, 1200);
    const png = file.replace(/\.html$/, '.png');
    await b.shot(png);
    outs.push(png);
    console.log('🖼️', path.relative(ROOT, png));
  }
}
// 비교 시트 — 행: 시안 A/B/C, 열: 장면 5개
const cell = 300, ch = Math.round(cell * H / W);
const sheet = `<!doctype html><meta charset="utf-8"><body style="margin:0;background:#20302a;font-family:${FONT};color:#fff;padding:30px">
${Object.keys(VARIANTS).map(v => `<div style="display:flex;align-items:center;gap:18px;margin-bottom:26px">
  <div style="width:70px;font-size:54px;font-weight:800">${v}</div>
  ${SCENES.map(([n]) => `<img src="ios-${LANG === 'en' ? 'en-' : ''}${v}-${n}.png" style="width:${cell}px;height:${ch}px;border-radius:24px">`).join('')}
</div>`).join('')}</body>`;
const sheetFile = path.join(DIR, `ios-${LANG === 'en' ? 'en-' : ''}compare.html`);
writeFileSync(sheetFile, sheet);
await b.viewport(70 + 18 * 6 + cell * 5 + 60, (ch + 26) * 3 + 60, { dsf: 1 });
await b.goto('file://' + sheetFile, 2500);
await b.shot(sheetFile.replace(/\.html$/, '.png'));
console.log('📋 .scratch/store-shots/ios-compare.png');
await b.close();
