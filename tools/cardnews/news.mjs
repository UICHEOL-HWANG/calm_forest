// =============================================================
//  calm forest · 📰 카드뉴스 소재 수집 (회사생활 최신 뉴스)
//  ------------------------------------------------------------
//  node news.mjs            최근 7일 후보 수집 → decks/_inbox/<날짜>.json
//  node news.mjs --days 3
//
//  왜 구글 뉴스 RSS 인가: API 키가 없다. 로컬에서도 Worker 에서도 같은 코드가 돈다.
//  (뉴스 API 를 붙이면 시크릿이 하나 더 늘고, 우리는 지금 시크릿 0개를 유지 중이다)
//
//  ⚠️ 기사 문장을 카드에 옮기지 않는다. 제목은 **소재 힌트**로만 쓴다.
//     카드 카피는 게임의 목소리로 새로 쓴다 — 저작권·사실관계 둘 다의 이유다.
// =============================================================
import { writeFile, mkdir, readdir, readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const days = Number(process.argv[process.argv.indexOf('--days') + 1]) || 7;

/** 회사생활의 여러 결 — 한 주제에 몰리지 않게 갈라 둔다 */
const QUERIES = [
  '직장인 번아웃', '회사생활 스트레스', '워라밸', '주4일제',
  '이직 트렌드', '재택근무', '퇴근 후 취미', '직장인 설문',
];

/**
 * 🚫 게임 홍보를 붙이면 안 되는 소재. 누군가의 피해·죽음·분쟁 위에
 *    "숲에서 쉬어가세요"를 얹는 순간 계정이 끝난다. 애매하면 버린다.
 */
const BLOCK = new RegExp([
  '사망|숨진|숨져|자살|극단적|부고|유족|장례',
  '산재|사고|화재|붕괴|추락|참사|테러|전쟁|지진|태풍|실종',
  '폭행|성희롱|성추행|성범죄|성폭력|괴롭힘|갑질|학대|살인|살해',
  // 2차 수집: '직장인 설문' 상위가 통째로 일터 성범죄 조사였다. 피해 서사 전반을 막는다.
  '피해자|2차 피해|피해 우려',
  '고소|고발|소송|구속|검찰|경찰|기소|징계|수사',
  '해고|정리해고|파업|분신|감염|확진',
  // 1차 수집에서 "우울증으로 번졌다… 침묵의 살인마"가 통과했다.
  // 정신건강 질환은 게임 홍보를 붙일 소재가 아니다.
  '우울증|공황|불면증|정신질환|자해|중독',
].join('|'));

/**
 * 🔇 연예·드라마 PR. "직장인" 키워드를 가장 많이 잠식한다.
 *    1차 수집에서 '직장인 번아웃' 상위 21건 중 11건이 드라마 한 편 홍보였다.
 */
const NOISE = new RegExp([
  '드라마|영화|배우|출연|캐스팅|예능|OST|화보|아이돌|가수|앨범|연예',
  '\\[.*?현장\\]|\\[리뷰|\\[영상\\]|\\[포토|종합\\)|★',
  '브런치',   // 개인 에세이 — 뉴스가 아니다
].join('|'));

/**
 * 🎰 도박 SEO 스팸. 2차 수집에서 '재택근무' 쿼리 상위 4건이
 *    "카지노 mbti" · "강원랜드 슬롯머신" 류의 어뷰징 사이트였다.
 *    구글 뉴스는 이런 도메인도 그대로 태워 보낸다.
 */
const SPAM = /카지노|슬롯|바카라|토토|베팅|벳|도박|먹튀|룰렛|포커|배팅|꽁머니/;

/** 📊 카드뉴스로 쓰기 좋은 기사에 가산점. 숫자가 있는 조사·설문이 제일 낫다 */
function score(t) {
  let n = 0;
  if (/설문|조사|응답|통계|보고서|리포트|분석/.test(t)) n += 3;
  if (/\d+(\.\d+)?%|\d+명|\d+시간|\d+년차/.test(t)) n += 2;
  if (/직장인|회사원|근로자|사무직/.test(t)) n += 1;
  return n;
}

const strip = s => s.replace(/<!\[CDATA\[|\]\]>/g, '').replace(/&amp;/g, '&')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();

async function fetchQuery(q) {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(q + ` when:${days}d`)}&hl=ko&gl=KR&ceid=KR:ko`;
  const res = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 (cardnews-sourcing)' } });
  if (!res.ok) throw new Error(`RSS ${res.status} — ${q}`);
  const xml = await res.text();
  const items = [];
  for (const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const block = m[1];
    const pick = tag => strip((block.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`)) || [, ''])[1]);
    const rawTitle = pick('title');
    // 구글 뉴스 제목은 "제목 - 언론사" 꼴이다. 언론사를 떼어 소재만 남긴다.
    const cut = rawTitle.lastIndexOf(' - ');
    items.push({
      query: q,
      title: cut > 20 ? rawTitle.slice(0, cut) : rawTitle,
      source: pick('source') || (cut > 20 ? rawTitle.slice(cut + 3) : ''),
      link: pick('link'),
      date: pick('pubDate'),
    });
  }
  return items;
}

/** 이미 카드 묶음으로 만든 소재는 다시 뽑지 않는다 */
async function usedTitles() {
  const dir = resolve(HERE, 'decks');
  const used = new Set();
  for (const f of await readdir(dir)) {
    if (!f.endsWith('.json') || f.startsWith('_')) continue;
    try {
      const d = JSON.parse(await readFile(resolve(dir, f), 'utf-8'));
      if (d.source?.title) used.add(d.source.title);
    } catch { /* 카드 묶음 파싱 실패는 수집을 막을 이유가 아니다 */ }
  }
  return used;
}

const used = await usedTitles();
const seen = new Set();
const kept = [];
const dropped = [];
const noised = [];
const spammed = [];

for (const q of QUERIES) {
  let items;
  try { items = await fetchQuery(q); }
  catch (e) { console.error(`  ! ${q} — ${e.message}`); continue; }
  for (const it of items) {
    const key = it.title.replace(/\s+/g, '');
    if (!it.title || seen.has(key) || used.has(it.title)) continue;
    seen.add(key);
    if (BLOCK.test(it.title)) { dropped.push(it.title); continue; }
    if (SPAM.test(it.title)) { spammed.push(it.title); continue; }
    if (NOISE.test(it.title)) { noised.push(it.title); continue; }
    kept.push({ ...it, score: score(it.title) });
  }
}

// 점수 높은 순 — 조사·통계 기사가 위로 온다
kept.sort((a, b) => b.score - a.score);

const today = new Date().toISOString().slice(0, 10);
const outDir = resolve(HERE, 'decks', '_inbox');
await mkdir(outDir, { recursive: true });
const out = resolve(outDir, `${today}.json`);
await writeFile(out, JSON.stringify({ collectedAt: today, days, queries: QUERIES, items: kept }, null, 2) + '\n', 'utf-8');

console.log(`\n후보 ${kept.length}건 · 민감 ${dropped.length} · 연예PR ${noised.length} · 도박스팸 ${spammed.length} 제외\n`);
for (const [i, it] of kept.slice(0, 25).entries()) {
  console.log(`${String(i + 1).padStart(2)}. (${it.score}점) [${it.query}] ${it.title}`);
  console.log(`    ${it.source} · ${it.date?.slice(5, 16)}`);
}
if (dropped.length) console.log(`\n제외된 민감 소재 예: ${dropped.slice(0, 3).join(' / ')}`);
console.log(`\n→ ${out}`);
