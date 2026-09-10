// 카드 HTML → 1080x1350 PNG. AI 생성 이미지 없음: 실제 게임 스크린샷 + 손으로 짠 CSS.
import { chromium } from 'playwright';
import { readdir, mkdir } from 'node:fs/promises';
import { resolve, dirname, basename } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const TPL = resolve(here, 'templates');
const OUT = resolve(here, 'out');

const files = process.argv.slice(2).length
  ? process.argv.slice(2)
  : (await readdir(TPL)).filter(f => f.endsWith('.html'));

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1080, height: 1350 },
  deviceScaleFactor: 1,
});

for (const f of files) {
  const url = pathToFileURL(resolve(TPL, f)).href;
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);   // 웹폰트 확정 로드
  const out = resolve(OUT, basename(f, '.html') + '.png');
  await page.screenshot({ path: out });
  console.log('rendered', out);
}
await browser.close();
