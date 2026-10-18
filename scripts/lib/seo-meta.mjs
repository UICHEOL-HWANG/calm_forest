import { SITE, OG_IMAGE, KEYWORDS } from './seo-pages.mjs';

export function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export function seoHead({ path, title, description, image = OG_IMAGE, type = 'website', lang = 'ko', keywords = KEYWORDS, jsonLd = null }) {
  const url = SITE + path;
  const t = escapeHtml(title), d = escapeHtml(description);
  const lines = [
    `<title>${t}</title>`,
    `<meta name="description" content="${d}" />`,
    `<meta name="keywords" content="${escapeHtml(keywords.join(', '))}" />`,
    `<link rel="canonical" href="${url}" />`,
    `<meta property="og:type" content="${type}" />`,
    `<meta property="og:site_name" content="고요한 숲" />`,
    `<meta property="og:locale" content="${lang === 'en' ? 'en_US' : 'ko_KR'}" />`,
    `<meta property="og:title" content="${t}" />`,
    `<meta property="og:description" content="${d}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:image" content="${escapeHtml(image)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${t}" />`,
    `<meta name="twitter:description" content="${d}" />`,
    `<meta name="twitter:image" content="${escapeHtml(image)}" />`,
    `<link rel="alternate" type="application/rss+xml" title="고요한 숲 소식" href="${SITE}/rss.xml" />`,
  ];
  if (jsonLd) lines.push(`<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>`);
  return lines.join('\n');
}

export function injectHead(html, head) {
  return html.replace(/<title>[\s\S]*?<\/title>\s*/i, '').replace(/<\/head>/i, `${head}\n</head>`);
}
