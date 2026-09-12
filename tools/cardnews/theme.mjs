// =============================================================
//  calm forest · 🌗 씬 밝기 실측 → theme 판정
//  ------------------------------------------------------------
//  node theme.mjs              shots/* 전체 밝기표
//  node theme.mjs deck-02      카드 묶음의 theme 선택이 실측과 맞는지 검사
//
//  왜 필요한가: 밝은 잔디에 어두운 스크림을 씌우면 흙탕물처럼 탁해진다(a2 렌더에서 확인).
//  theme 은 눈대중으로 고르던 값인데, 카드가 늘수록 틀린 걸 나중에 발견하게 된다.
//
//  임계값 85 의 근거 — shots/ 15장 실측이 두 덩어리로 갈렸다:
//    어두운 씬(도시·밤마을) 44~60  ·  빈 구간 60~105  ·  밝은 씬(숲·낮·노을) 105~165
//  45포인트짜리 골짜기 한가운데다. 사람이 고른 deck-01 의 theme 3건과 전부 일치한다
//  (임계 110 으로는 cta_ne 105.3 을 dark 로 잘못 봤다 — 실물은 light 가 맞다).
// =============================================================
import { chromium } from 'playwright';
import { readdir, readFile } from 'node:fs/promises';
import { resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
export const THRESHOLD = 85;

/** 스크림이 덮는 하단 46% 의 평균 휘도. 글자가 얹히는 자리가 거기다 */
async function measure(page, file) {
  // about:blank 오리진에서는 file:// 이미지를 디코드 못 한다 → data URL 로 넘긴다
  const buf = await readFile(file);
  const mime = file.endsWith('.svg') ? 'image/svg+xml' : file.endsWith('.jpg') ? 'image/jpeg' : 'image/png';
  const url = `data:${mime};base64,${buf.toString('base64')}`;
  return page.evaluate(async (u) => {
    const img = new Image();
    img.src = u;
    await img.decode();
    const H = Math.round(img.height * 0.46);
    const c = document.createElement('canvas');
    c.width = img.width; c.height = H;
    const g = c.getContext('2d');
    g.drawImage(img, 0, img.height - H, img.width, H, 0, 0, img.width, H);
    const d = g.getImageData(0, 0, c.width, H).data;
    let s = 0;
    for (let i = 0; i < d.length; i += 4) s += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
    return s / (d.length / 4);
  }, url);
}

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto('about:blank');
const slug = process.argv[2];
let bad = 0;

if (slug) {
  const deck = JSON.parse(await readFile(resolve(HERE, 'decks', `${slug}.json`), 'utf-8'));
  console.log(`${'카드'.padEnd(4)}${'img'.padEnd(26)}${'지정'.padEnd(8)}${'실측'.padStart(7)}  판정`);
  for (const [i, c] of deck.cards.entries()) {
    const lum = await measure(page, resolve(HERE, c.img));
    const want = lum > THRESHOLD ? 'light' : 'dark';
    const ok = want === c.theme;
    if (!ok) bad++;
    console.log(`${String(i + 1).padEnd(4)}${basename(c.img).padEnd(26)}${String(c.theme).padEnd(8)}${lum.toFixed(1).padStart(7)}  ${ok ? '✅' : `❌ ${want} 여야 한다`}`);
  }
  console.log(bad ? `\n❌ ${bad}장이 어긋났다 — 그대로 렌더하면 스크림이 탁해진다` : '\n✅ 전부 일치');
} else {
  const dir = resolve(HERE, 'shots');
  for (const f of (await readdir(dir)).filter(f => /\.(png|jpg)$/.test(f)).sort()) {
    const lum = await measure(page, resolve(dir, f));
    console.log(`${f.padEnd(24)}${lum.toFixed(1).padStart(7)}   ${lum > THRESHOLD ? 'light' : 'dark'}`);
  }
}
await browser.close();
process.exit(bad ? 1 : 0);
