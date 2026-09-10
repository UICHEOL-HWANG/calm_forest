// 덱 JSON 한 개 → 카드 N장 PNG. 카피·이미지·레이아웃의 단일 소스.
//
// 카드 한 장은 { kind, theme, img, eyebrow, headline, body, imgPrompt } 로 기술한다.
//   kind      cover | body | turn | game | cta   (역할 — 배지·번호 표시가 달라진다)
//   theme     dark | light                        (스크림 방향 — 밝은 씬에 어두운 스크림을 씌우면 탁해진다)
//   img       tools/cardnews 기준 상대 경로. shots/*(게임 렌더) 또는 gen/*(gti 생성)
//   zoom      1 = 원본. >1 이면 focus 를 중심으로 확대·크롭한다(게임 카메라를 못 당기는 대신)
//   imgPrompt gen/ 이미지가 없을 때 generate.mjs 가 gti 에 넘길 프롬프트
//
// 사용: node deck.mjs decks/deck-01.json
import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { resolve, dirname, basename } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const HERE = dirname(fileURLToPath(import.meta.url));
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
/** 줄바꿈은 카피 쪽에서 의도적으로 넣는다 — 자동 줄바꿈에 맡기면 어절이 어색하게 끊긴다 */
const lines = s => esc(s).replace(/\n/g, '<br>');

const THEME = {
  dark:  { fg: '#fdf6ea', sub: 'rgba(253,246,234,.80)', eyebrow: '#f0a878',
           scrim: 'linear-gradient(to top,rgba(14,18,16,.92) 0%,rgba(14,18,16,.58) 42%,rgba(14,18,16,0) 100%)',
           badgeBg: 'transparent', badgeFg: 'rgba(253,246,234,.92)', shadow: '0 2px 18px rgba(10,14,12,.45)' },
  light: { fg: '#2b352e', sub: '#6b7a70', eyebrow: '#d4703c',
           scrim: 'linear-gradient(to top,#fdf6ea 0%,rgba(253,246,234,.93) 36%,rgba(253,246,234,0) 100%)',
           badgeBg: 'rgba(253,246,234,.88)', badgeFg: '#2b352e', shadow: 'none' },
};

function cardHtml(card, i, total) {
  const t = THEME[card.theme] || THEME.dark;
  const showNum = card.kind !== 'cover';
  // 헤드라인이 길면 줄이 넘친다. 제일 긴 줄에 맞춰 크기를 잡는다.
  // 한글 한 글자 폭 ≈ 0.97 × font-size (tracking -0.035em 반영).
  const rightPad = card.kind === 'cover' ? 120 : 180;
  const avail = 1080 - 80 - rightPad;
  const longest = Math.max(...String(card.headline).split('\n').map(l => l.trim().length), 1);
  const cap = card.kind === 'cover' ? 106 : 92;
  const headSize = Math.max(52, Math.min(cap, Math.floor(avail / (longest * 0.97))));
  return `<meta charset="utf-8"><link rel="stylesheet" href="../../templates/_base.css">
<style>
  .card{background:${card.theme === 'light' ? 'var(--cream)' : 'var(--ink)'}}
  .shot{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:${card.focus || '50% 45%'};
    transform:scale(${card.zoom || 1});transform-origin:${card.focus || '50% 45%'}}
  .scrim{position:absolute;left:0;right:0;bottom:0;height:${card.kind === 'cover' ? 56 : 46}%;background:${t.scrim}}
  .txt{position:absolute;left:80px;right:${card.kind === 'cover' ? 120 : 180}px;bottom:104px;color:${t.fg}}
  .txt .headline{color:${t.fg};margin:20px 0 24px;text-shadow:${t.shadow};font-size:${headSize}px}
  .txt .body{color:${t.sub}}
  .txt .eyebrow{color:${t.eyebrow}}
  .badge{position:absolute;top:64px;left:80px;display:flex;align-items:center;gap:13px;
    color:${t.badgeFg};font-size:25px;font-weight:700;letter-spacing:.09em;
    background:${t.badgeBg};${card.theme === 'light' ? 'padding:12px 22px 12px 18px;border-radius:99px;' : `text-shadow:${t.shadow};`}}
  .dot{width:11px;height:11px;border-radius:99px;background:var(--accent)}
  .num{position:absolute;right:76px;bottom:96px;font-size:34px;font-weight:800;
    color:${t.fg};opacity:.30;letter-spacing:.02em}
</style>
<div class="card">
  <img class="shot" src="../../${card.img}">
  <div class="scrim"></div>
  <div class="badge"><span class="dot"></span>캄포레스트</div>
  <div class="txt">
    ${card.eyebrow ? `<div class="eyebrow">${lines(card.eyebrow)}</div>` : ''}
    <div class="headline">${lines(card.headline)}</div>
    ${card.body ? `<div class="body">${lines(card.body)}</div>` : ''}
  </div>
  ${showNum ? `<div class="num">${i + 1} / ${total}</div>` : ''}
</div>`;
}

const deckPath = resolve(process.argv[2] || 'decks/deck-01.json');
const deck = JSON.parse(await readFile(deckPath, 'utf-8'));
const slug = basename(deckPath, '.json');
const buildDir = resolve(HERE, 'build', slug);
const outDir = resolve(HERE, 'out', slug);
await mkdir(buildDir, { recursive: true });
await mkdir(outDir, { recursive: true });

// 이미지가 없으면 렌더를 멈춘다. 빈 칸으로 조용히 넘어가면 발행까지 흘러간다.
const missing = [];
for (const c of deck.cards) {
  try { await access(resolve(HERE, c.img)); } catch { missing.push(c.img); }
}
if (missing.length) {
  console.error('이미지 없음:\n  ' + missing.join('\n  ') +
    '\n→ 게임 컷은 `node shoot.mjs <포트> <이름>`, 생성 컷은 `node generate.mjs ' + process.argv[2] + '`');
  process.exit(1);
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1 });
for (const [i, card] of deck.cards.entries()) {
  const name = String(i + 1).padStart(2, '0');
  const html = resolve(buildDir, name + '.html');
  await writeFile(html, cardHtml(card, i, deck.cards.length), 'utf-8');
  await page.goto(pathToFileURL(html).href, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: resolve(outDir, name + '.png') });
  console.log('card', name, card.kind, '·', card.headline.split('\n')[0]);
}
await browser.close();
console.log('→', outDir);
