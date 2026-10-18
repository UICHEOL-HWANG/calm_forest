import { SITE } from './seo-pages.mjs';

export function sitemapXml(paths) {
  const urls = paths.map(p => `  <url><loc>${SITE}${p}</loc></url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

export function robotsTxt() {
  return [
    'User-agent: *',
    'Allow: /',
    'Disallow: /dashboards/',
    'Disallow: /beta/',
    'Disallow: /api/',
    'Disallow: /auth-popup',
    'Disallow: /cardnews/',
    'Disallow: /guide/guide.html',
    'Disallow: /guide/guide-en.html',
    'Disallow: /guide/guide$',
    'Disallow: /guide/guide-en$',
    '',
    `Sitemap: ${SITE}/sitemap.xml`,
    `Sitemap: ${SITE}/rss.xml`,
    '',
  ].join('\n');
}
