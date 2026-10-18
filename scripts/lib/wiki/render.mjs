import { seoHead, escapeHtml } from '../seo-meta.mjs';
import { SITE } from '../seo-pages.mjs';
import { SECTION_ORDER, renderBlock, linkedRefs, toPlain, firstSentence } from './content.mjs';

const WIKI_KEYWORDS = ['고요위키', '고요한 숲', '고요한 숲 공략', '고요한 숲 도감', 'calm forest wiki'];

export const docPath = (e) => `/wiki/${e.cat}/${e.id}`;
export const catPath = (c) => `/wiki/${c.id}/`;

export function buildIndex(entries) {
  return new Map(entries.map(e => [`${e.cat}/${e.id}`, e]));
}

function shell({ path, title, description, jsonLd, body, type = 'article' }) {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
<meta name="theme-color" content="#2f6b4a" />
<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
<link rel="stylesheet" href="/wiki/wiki.css" />
${seoHead({ path, title, description, type, jsonLd, keywords: WIKI_KEYWORDS })}
</head>
<body>
<header class="wk-top">
  <a class="wk-logo" href="/wiki/">🌿 고요위키</a>
  <span class="wk-sub">고요한 숲 공식 위키</span>
  <div class="wk-search"><input type="search" placeholder="문서 검색" aria-label="고요위키 문서 검색" autocomplete="off" /><ul class="wk-results" hidden></ul></div>
</header>
<main class="wk-wrap">
${body}
</main>
<footer class="wk-foot"><a href="/">🌿 고요한 숲 하러 가기</a> · <a href="/guide/">초보자 안내서</a> · <a href="/wiki/">고요위키 대문</a></footer>
<script src="/wiki/wiki.js" defer></script>
</body>
</html>
`;
}

function crumbLd(items) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map(([name, path], i) => ({ '@type': 'ListItem', position: i + 1, name, item: SITE + path })),
  };
}

function relatedOf(entry, secs, ctx) {
  const refs = [...new Set([...secs.values()].flatMap(linkedRefs))].map(r => ctx.index.get(r)).filter(e => e && e !== entry);
  const siblings = ctx.entries.filter(e => e.cat === entry.cat && e !== entry);
  const seen = new Set();
  return [...refs, ...siblings].filter(e => !seen.has(e) && seen.add(e)).slice(0, 8);
}

export function renderDoc(entry, secs, ctx) {
  const cat = ctx.cats.find(c => c.id === entry.cat);
  const path = docPath(entry);
  const order = SECTION_ORDER.filter(h => secs.get(h)?.trim());
  const description = firstSentence(toPlain(secs.get('개요') ?? entry.name, ctx.index));
  const facts = [['영문명', entry.nameEn], ['분류', cat.name], ...entry.facts, ['박물관', entry.museum]].filter(([, v]) => v);
  const rel = relatedOf(entry, secs, ctx);
  const title = `${entry.name} · 고요위키`;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'Article', headline: entry.name, alternativeHeadline: entry.nameEn ?? undefined, description, inLanguage: 'ko', url: SITE + path, isPartOf: { '@type': 'WebSite', name: '고요위키', url: `${SITE}/wiki/` }, about: { '@type': 'VideoGame', name: '고요한 숲', url: `${SITE}/` } },
      crumbLd([['고요위키', '/wiki/'], [cat.name, catPath(cat)], [entry.name, path]]),
    ],
  };
  const body = `<h1>${escapeHtml(entry.name)}</h1>
<nav class="wk-crumb"><a href="/wiki/">고요위키</a> › <a href="${catPath(cat)}">${escapeHtml(cat.name)}</a> › ${escapeHtml(entry.name)}</nav>
<div class="wk-cats">분류: <a href="${catPath(cat)}">${escapeHtml(cat.name)}</a></div>
<div class="wk-layout">
<article class="wk-doc">
<nav class="wk-toc" aria-label="목차"><b>목차</b>${order.map((h, i) => `<a href="#s-${i + 1}">${i + 1}. ${h}</a>`).join('')}</nav>
${order.map((h, i) => `<h2 id="s-${i + 1}"><span>${i + 1}.</span>${h}</h2>\n${renderBlock(secs.get(h), ctx.index)}`).join('\n')}
</article>
<aside class="wk-info"><table>
<tr><th class="wk-info-h" colspan="2">${escapeHtml(entry.name)}</th></tr>
<tr><td class="wk-info-ic" colspan="2"><span role="img" aria-label="${escapeHtml(entry.name)} 아이콘">${entry.ico}</span></td></tr>
${facts.map(([k, v]) => `<tr><th>${escapeHtml(k)}</th><td>${escapeHtml(v)}</td></tr>`).join('\n')}
</table></aside>
</div>
<section class="wk-rel"><h2>함께 보면 좋아요</h2><div class="wk-cards">${rel.map(e => `<a href="${docPath(e)}">${e.ico} ${escapeHtml(e.name)}</a>`).join('')}</div>
<a class="wk-cta" href="/">🌿 게임에서 만나러 가기</a></section>`;
  return shell({ path, title, description, jsonLd, body });
}

export function renderCat(cat, entries, ctx) {
  const path = catPath(cat);
  const description = `고요한 숲의 ${cat.name} ${entries.length}종을 한눈에. 이름을 누르면 얻는 법과 쓰임새를 볼 수 있어요.`;
  const rows = entries.map(e => `<tr><td class="wk-ic">${e.ico}</td><td><a href="${docPath(e)}">${escapeHtml(e.name)}</a><small>${escapeHtml(e.nameEn ?? '')}</small></td><td>${escapeHtml(e.facts.filter(([k]) => ['장소', '시간', '날씨', '계절'].includes(k)).map(([, v]) => v).join(' · '))}</td></tr>`).join('\n');
  const jsonLd = { '@context': 'https://schema.org', '@graph': [
    { '@type': 'CollectionPage', name: `${cat.name} · 고요위키`, url: SITE + path, inLanguage: 'ko' },
    crumbLd([['고요위키', '/wiki/'], [cat.name, path]]),
  ] };
  const others = ctx.cats.filter(c => c.id !== cat.id).map(c => `<a href="${catPath(c)}">${c.ico} ${escapeHtml(c.name)}</a>`).join('');
  const body = `<h1>${cat.ico} ${escapeHtml(cat.name)}</h1>
<nav class="wk-crumb"><a href="/wiki/">고요위키</a> › ${escapeHtml(cat.name)}</nav>
<p class="wk-lead">${escapeHtml(description)}</p>
<table class="wk-list"><tr><th></th><th>이름</th><th>만나는 곳 · 때</th></tr>
${rows}
</table>
<section class="wk-rel"><h2>다른 분류</h2><div class="wk-cards">${others}</div></section>`;
  return shell({ path, title: `${cat.name} · 고요위키`, description, jsonLd, body, type: 'website' });
}

export function renderHome(cats, entries) {
  const description = '고요한 숲 공식 위키. 물고기, 작물, 요리, 주민, 반딧불이, 텃밭 방문객까지 도감 문서를 모았어요.';
  const card = (c) => {
    const n = entries.filter(e => e.cat === c.id).length;
    return `<a class="wk-cat" href="${catPath(c)}"><span>${c.ico}</span><b>${escapeHtml(c.name)}</b><small>${n}개 문서</small></a>`;
  };
  const jsonLd = { '@context': 'https://schema.org', '@type': 'WebSite', name: '고요위키', url: `${SITE}/wiki/`, inLanguage: 'ko', about: { '@type': 'VideoGame', name: '고요한 숲', url: `${SITE}/` } };
  const body = `<h1>🌿 고요위키</h1>
<p class="wk-lead">${escapeHtml(description)} 지금 ${entries.length}개 문서가 있어요.</p>
<div class="wk-grid">${cats.map(card).join('')}</div>
<section class="wk-rel"><h2>처음이라면</h2><div class="wk-cards"><a href="/guide/">📖 초보자 안내서</a><a href="/wiki/fish/">🐟 물고기 도감</a><a href="/wiki/cook/">🍳 요리 목록</a><a href="/wiki/npc/">🧑‍🌾 주민 소개</a></div>
<a class="wk-cta" href="/">🌿 고요한 숲 하러 가기</a></section>`;
  return shell({ path: '/wiki/', title: '고요위키 · 고요한 숲 공식 위키', description, jsonLd, body, type: 'website' });
}

export function searchIndex(entries, cats) {
  const catName = Object.fromEntries(cats.map(c => [c.id, c.name]));
  return JSON.stringify(entries.map(e => ({ n: e.name, e: e.nameEn ?? '', c: catName[e.cat], i: e.ico, p: docPath(e) })));
}
