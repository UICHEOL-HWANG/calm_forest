// =============================================================
//  calm forest · 📰 커뮤니티 소재 수집 (디시 · 엠팍 · 블라인드)
//  ------------------------------------------------------------
//  node topics.mjs [--top 5]
//
//  왜 구글 뉴스가 아니라 커뮤니티인가:
//    뉴스 제목은 기자가 쓴 말이라 직장인이 실제로 하는 말과 다르다.
//    카드 카피는 "회사 다니는 사람이 할 법한 말"이어야 한다.
//
//  왜 aside 인가:
//    세 사이트 모두 JS 렌더이거나 단순 fetch 를 막는다. 사용자의 브라우저로
//    읽는다. 하루 1회, 랭킹 페이지 3개만 본다 — 대량 수집이 아니다.
//
//  ⚠️ 본문을 카드에 옮기지 않는다. 제목은 **소재 힌트**로만 쓴다.
//     (README 의 원칙 그대로 — 저작권·사실관계 둘 다의 이유다)
//
//  ⚠️ 커뮤니티 랭킹은 정치·성인·사건 소재가 뉴스보다 훨씬 많다.
//     topic-filter.mjs 가 걸러내지만, 최종 판단은 사람이 한다.
// =============================================================
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { rejectReason } from './topic-filter.mjs';

const run = promisify(execFile);
const HERE = dirname(fileURLToPath(import.meta.url));

const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };
const TOP = Number(arg('--top', '5'));

/** aside repl 한 번. 실패 사유를 그대로 올린다 — 조용한 폴백 금지 */
async function repl(code) {
  const { stdout, stderr } = await run('aside', ['repl', code],
    { maxBuffer: 32 * 1024 * 1024, timeout: 180_000 });
  const out = stdout + stderr;
  if (/\[error \|/.test(out)) throw new Error(`aside repl 실패:\n${out}`);
  const m = out.match(/^JSON=(.+)$/m);
  if (!m) throw new Error(`결과를 못 받았다:\n${out}`);
  return JSON.parse(m[1]);
}

// 한 호출에서 세 사이트를 순서대로 본다. 사이에 간격을 둔다 — 몰아치지 않는다.
const SCRIPT = `
const out = { dc: [], mlb: [], blind: [] };

const p1 = await openTab('https://gall.dcinside.com/board/lists/?id=dcbest');
await sleep(3500);
out.dc = await p1.evaluate(() => [...document.querySelectorAll('.gall_list .gall_tit a')]
  .map(a => ({ title: (a.innerText || '').trim(), url: a.href }))
  .filter(x => x.title));
await sleep(2500);

const p2 = await openTab('https://mlbpark.donga.com/mp/best.php');
await sleep(3500);
out.mlb = await p2.evaluate(() => [...document.querySelectorAll('td.t_left a')]
  .map(a => ({ title: (a.innerText || '').trim(), url: a.href }))
  .filter(x => x.title));
await sleep(2500);

// 블라인드는 '회사생활' 채널만 본다 — 직장인 소재로는 여기가 가장 정확하다.
// 로그인 없이 목록과 본문 앞부분이 보인다(로그인이 필요한 곳은 건드리지 않는다).
const p3 = await openTab('https://www.teamblind.com/kr/topics/%ED%9A%8C%EC%82%AC%EC%83%9D%ED%99%9C');
await sleep(5000);
out.blind = await p3.evaluate(() => {
  // 글 한 건 = .article-list-pre. 광고는 .article-list-ad 가 함께 붙는다
  // (쿠팡 광고가 "소담예인 한복 · 40,000원" 으로 섞여 들어왔었다).
  return [...document.querySelectorAll('.article-list-pre')]
    .filter(el => !el.className.includes('article-list-ad'))
    .map(el => {
      // 덩어리 구조: 제목 \\n\\n 본문 \\n\\n 회사·작성자 \\n\\n 조회수…
      const parts = (el.innerText || '').split('\\n\\n').map(s => s.trim()).filter(Boolean);
      // 첫 덩어리는 "NOW\\n제목" · "HOT\\n제목" 처럼 배지가 앞에 붙는다. 마지막 줄이 제목이다.
      const head = (parts[0] || '').split('\\n').map(s => s.trim()).filter(Boolean);
      const title = head[head.length - 1] || '';
      return { title, excerpt: (parts[1] || '').replace(/\\s+/g, ' ').slice(0, 160) };
    })
    .filter(x => x.title && x.title.length > 5 && x.excerpt);
});

console.log('JSON=' + JSON.stringify(out));
`;

console.log('커뮤니티 랭킹 수집 (디시 · 엠팍 · 블라인드)');
const raw = await repl(SCRIPT);

// ── 거르기 ───────────────────────────────────────────────────
const dropped = {};
const keep = (items) => {
  const out = [];
  for (const it of items) {
    const why = rejectReason(it.title);
    if (why) { dropped[why] = (dropped[why] || 0) + 1; continue; }
    if (out.some(o => o.title === it.title)) continue;     // 중복
    out.push(it);
    if (out.length >= TOP) break;
  }
  return out;
};

const sources = { dc: keep(raw.dc), mlb: keep(raw.mlb), blind: keep(raw.blind) };

// ── 저장 ─────────────────────────────────────────────────────
const date = new Date().toISOString().slice(0, 10);
const dir = resolve(HERE, 'decks', '_inbox');
await mkdir(dir, { recursive: true });
const path = resolve(dir, `${date}-community.json`);
await writeFile(path, JSON.stringify({ date, sources, dropped }, null, 2) + '\n');

// ── 사람이 읽을 형태로 ───────────────────────────────────────
const NAMES = { dc: '디시 실시간베스트', mlb: '엠팍 베스트', blind: '블라인드 회사생활' };
for (const [k, list] of Object.entries(sources)) {
  console.log(`\n【${NAMES[k]}】`);
  if (!list.length) { console.log('  (쓸 만한 게 없음)'); continue; }
  list.forEach((x, i) => {
    console.log(`  ${i + 1}. ${x.title}`);
    if (x.excerpt) console.log(`     ${x.excerpt}`);
  });
}
const dropTotal = Object.values(dropped).reduce((a, b) => a + b, 0);
console.log(`\n거른 것 ${dropTotal}건 — ` +
  Object.entries(dropped).map(([k, v]) => `${k} ${v}`).join(' · '));
console.log(`\n저장: decks/_inbox/${date}-community.json`);
