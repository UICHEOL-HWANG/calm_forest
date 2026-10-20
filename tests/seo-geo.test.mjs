import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadWiki } from '../scripts/lib/wiki/load-data.mjs';
import { buildIndex, renderDoc } from '../scripts/lib/wiki/render.mjs';
import { faqOf, josa } from '../scripts/lib/wiki/faq.mjs';
import { llmsTxt } from '../scripts/lib/llms.mjs';
import { sitemapXml } from '../scripts/lib/sitemap.mjs';
import { SEO_PAGES, SAME_AS } from '../scripts/lib/seo-pages.mjs';
import { newsPage, newsIndexPage, newsSitemapXml } from '../functions/news.js';
import { rssXml } from '../functions/rss.js';

const read = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const wiki = await loadWiki();
const index = buildIndex(wiki.entries);
const ctx = { index, entries: wiki.entries, cats: wiki.cats };
const ldOf = (html) => [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].map(m => JSON.parse(m[1]));
const byName = (n) => wiki.entries.find(e => e.name === n);

test('josa: 받침 여부로 조사를 고른다(한글·숫자·ㄹ받침 으로)', () => {
  assert.equal(josa('복어', '은/는'), '복어는');
  assert.equal(josa('당근', '은/는'), '당근은');
  assert.equal(josa('작물 3', '이에요/예요'), '작물 3이에요');
  assert.equal(josa('작물 2', '이에요/예요'), '작물 2예요');
  assert.equal(josa('물', '으로/로'), '물로');
  assert.equal(josa('밥', '으로/로'), '밥으로');
  assert.equal(josa('새 (밤)', '을/를'), '새 (밤)을');
});

test('faqOf: 물고기는 장소·계절과 판매가·박물관을 답한다', () => {
  assert.deepEqual(faqOf(index.get('fish/puffer')), [
    ['동글 복어는 어디서 낚여요?', '마을 낚시터에서 여름에만 낚여요.'],
    ['동글 복어는 얼마에 팔려요?', '8코인에 팔 수 있어요.'],
    ['동글 복어는 박물관 어디에 전시돼요?', '박물관 1층에 전시돼요.'],
  ]);
});

test('faqOf: 요리·방문객·주민·흔적', () => {
  const soup = faqOf(byName('든든한 채소죽'));
  assert.deepEqual(soup[0], ['든든한 채소죽은 무엇으로 만들어요?', '재료는 작물 3이에요.']);
  assert.deepEqual(soup[1], ['든든한 채소죽을 먹으면 어떻게 돼요?', '60초 이동속도 +40% 효과가 있어요.']);
  assert.deepEqual(soup[2], ['든든한 채소죽은 카페에서 얼마에 팔려요?', '카페에서 30코인에 팔려요.']);
  assert.deepEqual(faqOf(byName('고슴도치'))[0], ['고슴도치는 어떻게 오게 해요?', '텃밭 환경이 🧱 은신처 3 · 🌑 그늘 2 이상이면 밤에 찾아와요.']);
  assert.deepEqual(faqOf(byName('호랑나비'))[0], ['호랑나비는 어떻게 오게 해요?', '텃밭 환경이 🌷 꽃 3 이상이면 낮에 찾아와요. 🎃 공포 1 이상이면 오지 않아요.']);
  assert.deepEqual(faqOf(byName('농부 삼촌'))[0], ['농부 삼촌은 어떤 의뢰를 줘요?', '장작 모으기 · 수확의 기쁨 · 촉촉하게 · 대풍년 의뢰를 줘요.']);
  assert.deepEqual(faqOf(byName('털뭉치'))[0], ['털뭉치는 언제 볼 수 있어요?', '밤손님이 다녀간 다음 날 밭 둘레에서 볼 수 있어요.']);
});

test('faqOf: 모든 문서에서 질문은 3개 이하·중복 없음·빈 값 없음', () => {
  for (const e of wiki.entries) {
    const qa = faqOf(e);
    assert.ok(qa.length <= 3, e.id);
    assert.equal(new Set(qa.map(([q]) => q)).size, qa.length, e.id);
    for (const [q, a] of qa) {
      assert.ok(q.endsWith('?') && a.endsWith('.'), `${e.id} ${q}`);
      assert.doesNotMatch(q + a, /undefined|null|—|🪙/, `${e.id} ${a}`);
    }
  }
  assert.ok(wiki.entries.filter(e => faqOf(e).length).length >= 70);
});

test('renderDoc: 화면의 FAQ 와 FAQPage LD 가 글자까지 같고, dateModified 가 들어간다', () => {
  const e = index.get('fish/puffer');
  const html = renderDoc(e, new Map([['개요', '동글 복어는 여름에만 낚인다.']]), { ...ctx, lastmod: '2026-10-18' });
  assert.match(html, /<h2[^>]*>자주 묻는 질문<\/h2>/);
  const graph = ldOf(html)[0]['@graph'];
  const faq = graph.find(x => x['@type'] === 'FAQPage');
  assert.equal(faq.mainEntity.length, 3);
  for (const q of faq.mainEntity) {
    assert.ok(html.includes(`<dt>${q.name}</dt>`), q.name);
    assert.ok(html.includes(`<dd>${q.acceptedAnswer.text}</dd>`), q.acceptedAnswer.text);
  }
  assert.equal(graph.find(x => x['@type'] === 'Article').dateModified, '2026-10-18');
});

test('renderDoc: FAQ 가 없으면 섹션도 LD 도 없다', () => {
  const e = wiki.entries.find(x => x.cat === 'weather');
  const html = renderDoc(e, new Map([['개요', '맑다.']]), ctx);
  assert.doesNotMatch(html, /자주 묻는 질문|FAQPage/);
});

test('llmsTxt: 제목·요약·핵심 페이지·분류별 문서 수·앱·데이터 정책·기준일', () => {
  const txt = llmsTxt({ cats: wiki.cats, entries: wiki.entries, asof: '2026-10-18' });
  assert.match(txt, /^# 고요한 숲 \(calm forest\)\n\n> /);
  assert.match(txt, /\[고요위키\]\(https:\/\/calmforest\.cloud\/wiki\/\): 공식 도감 80개 문서/);
  const fish = wiki.entries.filter(e => e.cat === 'fish').length;
  assert.ok(txt.includes(`[물고기](https://calmforest.cloud/wiki/fish/): ${fish}개 문서`));
  assert.match(txt, /\[소식\]\(https:\/\/calmforest\.cloud\/news\/\)/);
  assert.match(txt, /기준일: 2026-10-18/);
  for (const u of SAME_AS.filter(u => /play\.google|apps\.apple|itch\.io/.test(u))) assert.ok(txt.includes(u), u);
  assert.doesNotMatch(txt, /—|js\/data/);
});

test('sitemapXml: lastmod 가 있으면 넣고 없으면 뺀다', () => {
  const xml = sitemapXml([{ path: '/wiki/', lastmod: '2026-10-18' }, '/shop']);
  assert.match(xml, /<url><loc>https:\/\/calmforest\.cloud\/wiki\/<\/loc><lastmod>2026-10-18<\/lastmod><\/url>/);
  assert.match(xml, /<url><loc>https:\/\/calmforest\.cloud\/shop<\/loc><\/url>/);
});

test('SAME_AS: 공식 채널, GitHub 는 넣지 않는다', () => {
  assert.ok(SAME_AS.length >= 6);
  assert.ok(SAME_AS.every(u => u.startsWith('https://')));
  assert.ok(!SAME_AS.some(u => u.includes('github.com')));
});

test('index.html: 제목 A·og:title 유지·LD 하나(VideoGame+Organization sameAs)·설명에 엠대시 없음', () => {
  const html = read('index.html');
  const home = SEO_PAGES.find(p => p.path === '/');
  assert.match(html, /<title>고요한 숲 · 설치 없이 하는 3D 힐링 농장 게임<\/title>/);
  assert.equal(home.title, '고요한 숲 · 설치 없이 하는 3D 힐링 농장 게임');
  assert.match(html, /<meta property="og:title" content="고요한 숲 🌿" \/>/);
  assert.match(html, /<meta name="twitter:title" content="고요한 숲 🌿" \/>/);
  const desc = html.match(/<meta name="description" content="([^"]*)"/)[1];
  assert.doesNotMatch(desc, /—/);
  assert.equal(desc, home.description);
  const lds = ldOf(html);
  assert.equal(lds.length, 1);
  const graph = lds[0]['@graph'];
  assert.deepEqual(graph.map(x => x['@type']).sort(), ['Organization', 'VideoGame']);
  const org = graph.find(x => x['@type'] === 'Organization');
  assert.deepEqual(org.sameAs, SAME_AS);
  const game = graph.find(x => x['@type'] === 'VideoGame');
  assert.equal(game.publisher['@id'], org['@id']);
  assert.equal(game.description, home.description);
});

const ROWS = [
  { id: 18, title: '🌳 세계수 개편 <b>', body: '마을에 세계수가 자랐어요.\n\n무엇이 | 어떻게\n🌳 세계수 | 살펴보기\n🛷 썰매 | 조종\n끝 문단 & 안내', created_at: '2026-10-17T08:54:19Z' },
  { id: 17, title: '🍂 수확제', body: '광장이 열렸어요.', created_at: '2026-10-09T01:00:00Z' },
];

test('newsPage: 완결된 문서·canonical·이스케이프·표·지난 소식·NewsArticle LD', () => {
  const html = newsPage(ROWS[0], ROWS);
  assert.match(html, /^<!DOCTYPE html>/);
  assert.match(html, /<title>🌳 세계수 개편 &lt;b&gt; · 고요한 숲 소식<\/title>/);
  assert.match(html, /<link rel="canonical" href="https:\/\/calmforest\.cloud\/news\/18"/);
  assert.match(html, /<meta name="description" content="마을에 세계수가 자랐어요\."/);
  assert.match(html, /<link rel="stylesheet" href="\/wiki\/wiki\.css"/);
  assert.match(html, /<h1>🌳 세계수 개편 &lt;b&gt;<\/h1>/);
  assert.match(html, /<time datetime="2026-10-17T08:54:19Z">2026년 10월 17일<\/time>/);
  assert.match(html, /<tr><th>무엇이<\/th><th>어떻게<\/th><\/tr>/);
  assert.match(html, /<tr><td>🛷 썰매<\/td><td>조종<\/td><\/tr>/);
  assert.match(html, /<p>끝 문단 &amp; 안내<\/p>/);
  assert.match(html, /<a href="\/news\/17">🍂 수확제<\/a>/);
  assert.doesNotMatch(html, /href="\/news\/18">/);
  const ld = ldOf(html)[0]['@graph'];
  const art = ld.find(x => x['@type'] === 'NewsArticle');
  assert.equal(art.datePublished, '2026-10-17T08:54:19Z');
  assert.equal(art.headline, '🌳 세계수 개편 <b>');
  assert.ok(ld.find(x => x['@type'] === 'BreadcrumbList'));
});

test('newsIndexPage·newsSitemapXml: 목록과 사이트맵', () => {
  const html = newsIndexPage(ROWS);
  assert.match(html, /<link rel="canonical" href="https:\/\/calmforest\.cloud\/news\/"/);
  assert.match(html, /<a href="\/news\/18">🌳 세계수 개편 &lt;b&gt;<\/a>/);
  const xml = newsSitemapXml(ROWS);
  assert.match(xml, /<loc>https:\/\/calmforest\.cloud\/news\/<\/loc><lastmod>2026-10-17<\/lastmod>/);
  assert.match(xml, /<loc>https:\/\/calmforest\.cloud\/news\/17<\/loc><lastmod>2026-10-09<\/lastmod>/);
});

test('rssXml: 항목 링크가 개별 소식 페이지', () => {
  const xml = rssXml(ROWS);
  assert.match(xml, /<link>https:\/\/calmforest\.cloud\/news\/18<\/link>/);
  assert.match(xml, /<guid isPermaLink="false">calmforest-notice-18<\/guid>/);
});

test('worker·robots: /news 라우트와 sitemap-news 등록', async () => {
  const w = read('worker/index.js');
  assert.match(w, /'\/news\/'/);
  assert.match(w, /'\/sitemap-news\.xml'/);
  const { robotsTxt } = await import('../scripts/lib/sitemap.mjs');
  assert.match(robotsTxt(), /Sitemap: https:\/\/calmforest\.cloud\/sitemap-news\.xml/);
});

test('newsPage: 긴 본문 요약은 이모지를 반쪽으로 자르지 않는다', () => {
  const html = newsPage({ id: 3, title: 't', body: '🌳'.repeat(200), created_at: '2026-10-01T00:00:00Z' }, []);
  const desc = html.match(/<meta name="description" content="([^"]*)"/)[1];
  assert.equal([...desc].length, 150);
  assert.doesNotMatch(desc, /[\uD800-\uDBFF](?![\uDC00-\uDFFF])/);
});

test('seoHead: noindex 를 켜면 robots 메타를 넣는다', async () => {
  const { seoHead } = await import('../scripts/lib/seo-meta.mjs');
  assert.match(seoHead({ path: '/x', title: 't', description: 'd', noindex: true }), /<meta name="robots" content="noindex" \/>/);
  assert.doesNotMatch(seoHead({ path: '/x', title: 't', description: 'd' }), /noindex/);
});

test('_headers: llms.txt 는 UTF-8 로 내보낸다', () => {
  assert.match(read('_headers'), /\/llms\.txt\n  ! Content-Type\n  Content-Type: text\/plain; charset=utf-8/);
});
