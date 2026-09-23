// 링크드인 분석 카드 HTML → PNG. 경로는 이 파일 위치 기준(linkedin/templates → linkedin/out).
import { chromium } from 'playwright';
import { readdir, mkdir, readFile } from 'node:fs/promises';
import { resolve, dirname, basename } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const TPL = resolve(here, 'templates');
const OUT = resolve(here, 'out');

// --deck <슬러그> 면 그 덱이 만든 카드만 렌더한다. 인자가 없으면 templates 전체.
const argv = process.argv.slice(2);
const di = argv.indexOf('--deck');
const files = di >= 0
  ? JSON.parse(await readFile(resolve(here, 'decks', `.${argv[di + 1]}.manifest.json`), 'utf8'))
  : argv.length
    ? argv
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
