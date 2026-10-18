import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { seoHead, injectHead, escapeHtml } from '../scripts/lib/seo-meta.mjs';
import { SEO_PAGES, SITE, KEYWORDS } from '../scripts/lib/seo-pages.mjs';
import { sitemapXml, robotsTxt } from '../scripts/lib/sitemap.mjs';
import { guidePage } from '../scripts/lib/guide-page.mjs';
import { shopProductPages } from '../scripts/lib/shop-pages.mjs';
import { SHOP_COPY } from '../scripts/lib/shop-copy.mjs';
import { shopRows } from '../scripts/lib/shop-rows.mjs';
import { rssXml } from '../functions/rss.js';
import { ITEMS } from '../js/cosmetics/catalog.js';

const read = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const premium = ITEMS.filter(i => i.premium);

test('seoHead: title·description·keywords·canonical·OG 를 모두 넣는다', () => {
  const h = seoHead({ path: '/shop', title: '가격 안내 · 고요한 숲', description: '설명 "따옴표" <b>' });
  assert.match(h, /<title>가격 안내 · 고요한 숲<\/title>/);
  assert.match(h, /<meta name="description" content="설명 &quot;따옴표&quot; &lt;b&gt;"/);
  assert.match(h, /<meta name="keywords" content="[^"]*고요한 숲/);
  assert.match(h, new RegExp(`<link rel="canonical" href="${SITE}/shop"`));
  assert.match(h, /<meta property="og:title" content="가격 안내 · 고요한 숲"/);
  assert.match(h, /<meta property="og:image" content="https:\/\/calmforest\.cloud\/preview\.jpg/);
  assert.match(h, /<meta name="twitter:card" content="summary_large_image"/);
});

test('seoHead: jsonLd 는 script 태그로, 닫는 태그를 이스케이프한다', () => {
  const h = seoHead({ path: '/x', title: 't', description: 'd', jsonLd: { name: '</script>' } });
  const m = h.match(/<script type="application\/ld\+json">(.*?)<\/script>/s);
  assert.ok(m);
  assert.equal(JSON.parse(m[1]).name, '</script>');
});

test('injectHead: 기존 title 을 지우고 </head> 앞에 넣는다', () => {
  const html = '<html><head><meta charset="UTF-8" /><title>옛 제목</title></head><body></body></html>';
  const out = injectHead(html, '<title>새 제목</title>');
  assert.equal((out.match(/<title>/g) || []).length, 1);
  assert.match(out, /<title>새 제목<\/title>\n<\/head>/);
});

test('escapeHtml: & < > " \' 를 바꾼다', () => {
  assert.equal(escapeHtml(`a&b<c>"d'`), 'a&amp;b&lt;c&gt;&quot;d&#39;');
});

test('SEO_PAGES: 모든 페이지에 제목·설명이 있고 엠대시가 없다', () => {
  for (const p of SEO_PAGES) {
    assert.ok(p.path.startsWith('/'), p.path);
    assert.ok(p.title && p.description, p.path);
    assert.doesNotMatch(p.title + p.description, /—/, p.path);
  }
  assert.ok(KEYWORDS.includes('고요한 숲'));
});

test('sitemap: 고정 페이지와 상품 페이지를 모두 담고, noindex 페이지는 뺀다', () => {
  const xml = sitemapXml(['/', '/guide/', '/shop/firefly']);
  assert.match(xml, /^<\?xml version="1.0" encoding="UTF-8"\?>/);
  assert.match(xml, /<loc>https:\/\/calmforest\.cloud\/<\/loc>/);
  assert.match(xml, /<loc>https:\/\/calmforest\.cloud\/shop\/firefly<\/loc>/);
  assert.doesNotMatch(xml, /<lastmod>/);
  assert.ok(!SEO_PAGES.some(p => p.path === '/delete-account'));
});

test('robots: 관리·베타·API 를 막고 sitemap·rss 를 알린다', () => {
  const txt = robotsTxt();
  for (const p of ['/dashboards/', '/beta/', '/api/', '/auth-popup']) assert.match(txt, new RegExp(`Disallow: ${p}`));
  assert.match(txt, /Disallow: \/guide\/guide\.html/);
  assert.match(txt, /Sitemap: https:\/\/calmforest\.cloud\/sitemap\.xml/);
  assert.match(txt, /Sitemap: https:\/\/calmforest\.cloud\/rss\.xml/);
});

test('guidePage: 완결된 문서, 이미지 경로 절대화, 튜토리얼 버튼은 게임 링크로', () => {
  const frag = read('guide/guide.html');
  const html = guidePage(frag, { lang: 'ko', path: '/guide/', title: '초보자 안내서 · 고요한 숲', description: 'd' });
  assert.match(html, /^<!DOCTYPE html>/);
  assert.match(html, /<html lang="ko">/);
  assert.match(html, /<link rel="stylesheet" href="\/guide\/guide\.css"/);
  assert.doesNotMatch(html, /src="img\//);
  assert.match(html, /src="\/guide\/img\/00_title\.jpg"/);
  assert.doesNotMatch(html, /data-act="tutorial"/);
  assert.match(html, /<a [^>]*href="\/"/);
});

test('안내서 이미지: 한국어·영어 모두 alt 가 비어 있지 않다', () => {
  for (const f of ['guide/guide.html', 'guide/guide-en.html']) {
    const imgs = read(f).match(/<img [^>]*>/g) || [];
    assert.ok(imgs.length >= 50, f);
    for (const tag of imgs) assert.match(tag, /alt="[^"]+"/, `${f}: ${tag}`);
  }
});

test('SHOP_COPY: 모든 현금 상품에 설명이 있다', () => {
  for (const it of premium) assert.ok(SHOP_COPY[it.id]?.length > 10, it.id);
  for (const id of Object.keys(SHOP_COPY)) assert.ok(premium.some(i => i.id === id), id);
});

test('shopProductPages: 상품마다 /shop/<id> 와 Product JSON-LD(KRW)', () => {
  const pages = shopProductPages(ITEMS);
  assert.equal(pages.length, premium.length);
  const ff = pages.find(p => p.id === 'firefly');
  assert.equal(ff.path, '/shop/firefly');
  const ld = JSON.parse(ff.html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
  assert.equal(ld['@type'], 'Product');
  assert.equal(ld.offers.priceCurrency, 'KRW');
  assert.equal(ld.offers.price, '4000');
  assert.match(ff.html, /<title>반딧불 · 고요한 숲 프리미엄 꾸미기<\/title>/);
  assert.match(ff.html, /<link rel="canonical" href="https:\/\/calmforest\.cloud\/shop\/firefly"/);
});

test('shopProductPages: 할로윈 품목은 기간을, 상시 품목은 표시하지 않는다', () => {
  const pages = shopProductPages(ITEMS);
  assert.match(pages.find(p => p.id === 'bat_wing').html, /할로윈 한정 · 2026\.10\.17 ~ 11\.2/);
  assert.doesNotMatch(pages.find(p => p.id === 'firefly').html, /할로윈 한정/);
});

test('shopRows: 아이템 칸이 상품 페이지 링크', () => {
  const row = shopRows(ITEMS).find(r => r.includes('숲의 정령'));
  assert.match(row, /<a href="\/shop\/forest_spirit">🌿 숲의 정령<\/a>/);
});

test('rssXml: RSS 2.0, 제목·본문 이스케이프, 최신순 그대로', () => {
  const xml = rssXml([
    { id: 2, title: '새 <소식>', body: 'A & B\n둘째 줄', created_at: '2026-10-17T03:00:00Z' },
    { id: 1, title: '옛 소식', body: 'x', created_at: '2026-10-01T00:00:00Z' },
  ]);
  assert.match(xml, /<rss version="2.0"/);
  assert.match(xml, /<title>새 &lt;소식&gt;<\/title>/);
  assert.match(xml, /A &amp; B/);
  assert.match(xml, /<guid isPermaLink="false">calmforest-notice-2<\/guid>/);
  assert.match(xml, /<pubDate>Sat, 17 Oct 2026 03:00:00 GMT<\/pubDate>/);
  assert.ok(xml.indexOf('notice-2') < xml.indexOf('notice-1'));
});

test('worker: /rss.xml 라우트가 등록돼 있다', () => {
  assert.match(read('worker/index.js'), /'\/rss\.xml'/);
});

test('index.html: canonical·keywords·rss alternate·VideoGame JSON-LD', () => {
  const html = read('index.html');
  assert.match(html, /<link rel="canonical" href="https:\/\/calmforest\.cloud\/"/);
  assert.match(html, /<meta name="keywords"/);
  assert.match(html, /<link rel="alternate" type="application\/rss\+xml"[^>]*href="https:\/\/calmforest\.cloud\/rss\.xml"/);
  assert.match(html, /"@type":\s*"VideoGame"/);
});

test('shopProductPages: JSON-LD 가격과 화면 가격이 같다', () => {
  for (const it of premium) assert.equal(it.price.cash?.label ?? null, `₩${it.price.won.toLocaleString('ko-KR')}`, it.id);
});

test('shopProductPages: 판매 기간이 끝난 한정 품목은 Discontinued 로 표시하고 sitemap 대상에서 빠진다', () => {
  const after = Date.UTC(2026, 10, 10);
  const pages = shopProductPages(ITEMS, after);
  const bw = pages.find(p => p.id === 'bat_wing'), ff = pages.find(p => p.id === 'firefly');
  assert.equal(bw.open, false);
  assert.match(bw.html, /schema\.org\/Discontinued/);
  assert.match(bw.html, /판매 기간이 끝났어요/);
  assert.equal(ff.open, true);
  assert.match(ff.html, /schema\.org\/InStock/);
});

test('rssXml: XML 에 쓸 수 없는 제어문자를 지운다', () => {
  assert.doesNotMatch(rssXml([{ id: 1, title: 'a\x0bb', body: 'c\x01d', created_at: '2026-10-01T00:00:00Z' }]), /[\x00-\x08\x0B\x0C\x0E-\x1F]/);
});
