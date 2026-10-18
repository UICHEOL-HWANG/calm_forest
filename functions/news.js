import { parseBody } from '../js/notices.js';
import { seoHead, escapeHtml } from '../scripts/lib/seo-meta.mjs';

const SITE = 'https://calmforest.cloud';
const TTL = 600;
const LIMIT = 50;
const MORE = 5;
const KST_MS = 9 * 3600 * 1000;

const kstParts = (iso) => {
  const d = new Date(new Date(iso).getTime() + KST_MS);
  return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate() };
};
const kstDate = (iso) => { const p = kstParts(iso); return `${p.y}-${String(p.m).padStart(2, '0')}-${String(p.d).padStart(2, '0')}`; };
const kstLabel = (iso) => { const p = kstParts(iso); return `${p.y}년 ${p.m}월 ${p.d}일`; };
const shortLabel = (iso) => { const p = kstParts(iso); return `${p.m}월 ${p.d}일`; };
const timeTag = (iso, label) => `<time datetime="${escapeHtml(iso)}">${label}</time>`;

function summary(row) {
  const { lead, rows } = parseBody(row.body);
  const text = (lead[0] ?? rows.map(r => r.join(' ')).join(' ')).replace(/\s+/g, ' ').trim();
  if (!text) return row.title;
  const chars = [...text];
  return chars.length > 150 ? `${chars.slice(0, 149).join('')}…` : text;
}

function bodyHtml(text) {
  const { lead, header, rows, tail } = parseBody(text);
  const para = (ls) => ls.map(l => `<p>${escapeHtml(l)}</p>`).join('\n');
  const cells = (r, tag) => `<tr>${r.map(c => `<${tag}>${escapeHtml(c)}</${tag}>`).join('')}</tr>`;
  const table = rows.length ? `<table class="nw-table">${header ? cells(header, 'th') : ''}${rows.map(r => cells(r, 'td')).join('')}</table>` : '';
  return [para(lead), table, para(tail)].filter(Boolean).join('\n');
}

function crumbLd(items) {
  return { '@type': 'BreadcrumbList', itemListElement: items.map(([name, path], i) => ({ '@type': 'ListItem', position: i + 1, name, item: SITE + path })) };
}

function shell({ path, title, description, jsonLd, body, type, noindex = false }) {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
<meta name="theme-color" content="#2f6b4a" />
<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
<link rel="stylesheet" href="/wiki/wiki.css" />
${seoHead({ path, title, description, type, jsonLd, noindex })}
</head>
<body>
<header class="wk-top">
  <a class="wk-logo" href="/news/">🌿 고요한 숲 소식</a>
  <span class="wk-sub">업데이트와 공지</span>
</header>
<main class="wk-wrap">
${body}
</main>
<footer class="wk-foot"><a href="/">🌿 고요한 숲 하러 가기</a> · <a href="/wiki/">고요위키</a> · <a href="/news/">소식 전체</a></footer>
</body>
</html>
`;
}

const listItems = (rows) => rows.map(r => `<li><a href="/news/${r.id}">${escapeHtml(r.title)}</a>${timeTag(r.created_at, shortLabel(r.created_at))}</li>`).join('');

export function newsPage(row, rows) {
  const path = `/news/${row.id}`;
  const description = summary(row);
  const others = rows.filter(r => r.id !== row.id).slice(0, MORE);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'NewsArticle', headline: row.title, description, datePublished: row.created_at, inLanguage: 'ko', url: SITE + path, image: `${SITE}/preview.jpg?v=20261006`, publisher: { '@id': `${SITE}/#org` }, about: { '@type': 'VideoGame', name: '고요한 숲', url: `${SITE}/` } },
      crumbLd([['고요한 숲', '/'], ['소식', '/news/'], [row.title, path]]),
    ],
  };
  const body = `<nav class="wk-crumb"><a href="/">고요한 숲</a> › <a href="/news/">소식</a> › ${row.id}번째 소식</nav>
<h1>${escapeHtml(row.title)}</h1>
<p class="nw-date">${timeTag(row.created_at, kstLabel(row.created_at))}</p>
<article class="wk-doc">
${bodyHtml(row.body)}
</article>
<a class="wk-cta" href="/">🌿 게임에서 확인하기</a>
${others.length ? `<section class="wk-rel"><h2>지난 소식</h2><ul class="nw-list">${listItems(others)}</ul></section>` : ''}`;
  return shell({ path, title: `${row.title} · 고요한 숲 소식`, description, jsonLd, body, type: 'article' });
}

export function newsIndexPage(rows) {
  const path = '/news/';
  const description = '고요한 숲의 업데이트와 공지를 모았어요. 새 공간, 미니게임, 계절 이벤트 소식을 날짜순으로 볼 수 있어요.';
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'CollectionPage', name: '고요한 숲 소식', url: SITE + path, inLanguage: 'ko' },
      crumbLd([['고요한 숲', '/'], ['소식', path]]),
    ],
  };
  const body = `<nav class="wk-crumb"><a href="/">고요한 숲</a> › 소식</nav>
<h1>🌿 고요한 숲 소식</h1>
<p class="wk-lead">${escapeHtml(description)}</p>
<ul class="nw-list">${listItems(rows)}</ul>
<a class="wk-cta" href="/">🌿 고요한 숲 하러 가기</a>`;
  return shell({ path, title: '소식 · 고요한 숲', description, jsonLd, body, type: 'website' });
}

export function newsSitemapXml(rows) {
  const urls = [
    `  <url><loc>${SITE}/news/</loc>${rows[0] ? `<lastmod>${kstDate(rows[0].created_at)}</lastmod>` : ''}</url>`,
    ...rows.map(r => `  <url><loc>${SITE}/news/${r.id}</loc><lastmod>${kstDate(r.created_at)}</lastmod></url>`),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
}

const notFound = () => new Response(shell({
  path: '/news/', title: '소식을 찾을 수 없어요 · 고요한 숲', description: '없는 소식이에요.', jsonLd: null, type: 'website', noindex: true,
  body: '<h1>소식을 찾을 수 없어요</h1>\n<p class="wk-lead">주소가 바뀌었거나 없는 소식이에요.</p>\n<a class="wk-cta" href="/news/">소식 전체 보기</a>',
}), { status: 404, headers: { 'content-type': 'text/html; charset=utf-8' } });

async function loadRows(request, env, waitUntil) {
  const cache = caches.default;
  const cacheKey = new Request(new URL('/news/rows.json', request.url).toString(), { method: 'GET' });
  const hit = await cache.match(cacheKey);
  if (hit) return hit.json();
  const r = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/public_notices`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', apikey: env.SUPABASE_ANON_KEY, authorization: `Bearer ${env.SUPABASE_ANON_KEY}` },
    body: JSON.stringify({ n: LIMIT }),
  });
  if (!r.ok) {
    console.log(JSON.stringify({ evt: 'news_rpc_fail', status: r.status, body: (await r.text()).slice(0, 200) }));
    return null;
  }
  const rows = await r.json();
  const stored = new Response(JSON.stringify(rows), { headers: { 'content-type': 'application/json', 'cache-control': `public, max-age=${TTL}` } });
  if (waitUntil) waitUntil(cache.put(cacheKey, stored));
  return rows;
}

export async function onRequestGet({ request, env, waitUntil }) {
  const { pathname } = new URL(request.url);
  const m = pathname.match(/^\/news\/(\d+)$/);
  if (pathname !== '/news/' && pathname !== '/sitemap-news.xml' && !m) return notFound();

  const rows = await loadRows(request, env, waitUntil);
  if (!rows) return new Response('upstream error', { status: 502, headers: { 'cache-control': 'no-store' } });

  const headers = (type) => ({ 'content-type': type, 'cache-control': `public, max-age=${TTL}` });
  if (pathname === '/sitemap-news.xml') return new Response(newsSitemapXml(rows), { headers: headers('application/xml; charset=utf-8') });
  if (m) {
    const row = rows.find(x => String(x.id) === m[1]);
    return row ? new Response(newsPage(row, rows), { headers: headers('text/html; charset=utf-8') }) : notFound();
  }
  return new Response(newsIndexPage(rows), { headers: headers('text/html; charset=utf-8') });
}
