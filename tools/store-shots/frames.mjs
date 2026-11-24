#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch } from './cdp.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const DIR = path.join(ROOT, '.scratch', 'store-shots');
const FONT = `-apple-system, 'Apple SD Gothic Neo', sans-serif`;

export const CAPTIONS = {
  ko: [
    ['1-village', '동물친구들과 함께', '숲속에서 힐링'],
    ['2-house', '작은 나무집부터 큰 저택까지', '나만의 집을 직접 지어요'],
    ['3-farm', '텃밭에서 씨앗을 심고, 물 주면', '작물이 무럭무럭 자라요'],
    ['4-sea', '배를 타고 바다로 나가서', '낚시도 해요'],
    ['5-dream', '꿈속 꿈의 숲에서', '모험을 떠나요'],
    ['6-mirror', '마차를 타고', '거울 마을로 떠나요'],
    ['7-observatory', '망원경을 통해', '별자리를 찾아요'],
    ['8-orchard', '과수원에서 과일을 따서', '잼으로 만들어요'],
  ],
  en: [
    ['1-village', 'Unwind in the forest', 'with your animal friends'],
    ['2-house', 'From a tiny cabin to a grand house', 'Build your home your way'],
    ['3-farm', 'Plant seeds and water them', 'Watch your crops grow'],
    ['4-sea', 'Sail out to sea', 'and go fishing'],
    ['5-dream', 'Set off on an adventure', 'in the Dream Forest'],
    ['6-mirror', 'Take the carriage', 'to the Mirror Village'],
    ['7-observatory', 'Look through the telescope', 'Find the constellations'],
    ['8-orchard', 'Pick fruit in the orchard', 'and turn it into jam'],
  ],
};

export const LAYOUTS = {
  iphone: { W: 1320, H: 2868, top: 230, f1: 76, f2: 104, gap: 100, insetH: 2173, border: 14, radius: 72 },
  phone: { W: 1080, H: 1920, top: 120, f1: 60, f2: 84, gap: 56, insetH: 1450, border: 10, radius: 52 },
  tab7: { W: 1920, H: 1080, top: 56, f1: 44, f2: 64, gap: 30, insetH: 790, border: 8, radius: 30 },
  tab10: { W: 2560, H: 1440, top: 75, f1: 59, f2: 85, gap: 40, insetH: 1053, border: 10, radius: 40 },
};

export function frameHtml(L, src, l1, l2, srcW, srcH) {
  const insetW = Math.round(L.insetH * srcW / srcH);
  return `<!doctype html><meta charset="utf-8"><body style="margin:0">
    <div style="width:${L.W}px;height:${L.H}px;background:linear-gradient(#f6efe0,#e7f2df);display:flex;flex-direction:column;align-items:center;font-family:${FONT};overflow:hidden">
      <div style="padding-top:${L.top}px;text-align:center;color:#3c4a41;line-height:1.25;max-width:${L.W - 80}px">
        <div style="font-size:${L.f1}px;font-weight:600;opacity:.75">${l1}</div>
        <div style="font-size:${L.f2}px;font-weight:800;letter-spacing:-1px">${l2}</div>
      </div>
      <div style="margin-top:${L.gap}px;width:${insetW}px;height:${L.insetH}px;border-radius:${L.radius}px;overflow:hidden;box-shadow:0 ${L.border * 3}px ${L.border * 6}px rgba(40,60,45,.35);border:${L.border}px solid #fff;flex:none">
        <img src="${src}" style="width:100%;height:100%;object-fit:cover;object-position:top;display:block">
      </div>
    </div></body>`;
}

const pngSize = (buf) => [buf.readUInt32BE(16), buf.readUInt32BE(20)];

if (import.meta.url === `file://${process.argv[1]}`) {
  const lang = process.env.LANG_CAPTION === 'en' ? 'en' : 'ko';
  const devices = (process.argv[2] || 'phone,tab7,tab10,iphone').split(',');
  const b = await launch(+(process.argv[3] || 9420));
  for (const dev of devices) {
    const L = LAYOUTS[dev];
    if (!L) throw new Error(`unknown device ${dev}`);
    await b.viewport(L.W, L.H, { dsf: 1 });
    for (const [name, l1, l2] of CAPTIONS[lang]) {
      const srcFile = path.join(DIR, `${dev}-${lang === 'en' ? 'en-' : ''}${name}.png`);
      if (!existsSync(srcFile)) { console.log('skip', path.basename(srcFile)); continue; }
      const buf = readFileSync(srcFile);
      const [sw, sh] = pngSize(buf);
      const html = frameHtml(L, 'data:image/png;base64,' + buf.toString('base64'), l1, l2, sw, sh);
      const file = path.join(DIR, `framed-${lang}-${dev}-${name}.html`);
      writeFileSync(file, html);
      await b.goto('file://' + file, 1200);
      await b.shot(file.replace(/\.html$/, '.png'));
      console.log('framed', path.basename(file).replace(/\.html$/, '.png'));
    }
  }
  await b.close();
  process.exit(0);
}
