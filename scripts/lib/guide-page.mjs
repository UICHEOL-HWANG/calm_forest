import { seoHead } from './seo-meta.mjs';

const TEXT = {
  ko: { play: '🌿 게임 하러 가기', other: 'English', otherHref: '/guide/en/', home: '고요한 숲' },
  en: { play: '🌿 Play calm forest', other: '한국어', otherHref: '/guide/', home: 'calm forest' },
};

export function guidePage(fragment, { lang, path, title, description }) {
  const tx = TEXT[lang];
  const body = fragment
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/src="img\//g, 'src="/guide/img/')
    .replace(/<button class="gd-tut" data-act="tutorial">[\s\S]*?<\/button>/, `<a class="gd-tut" href="/">${tx.play}</a>`);
  const jsonLd = { '@context': 'https://schema.org', '@type': 'Article', headline: title, description, inLanguage: lang, isPartOf: { '@type': 'VideoGame', name: '고요한 숲', url: 'https://calmforest.cloud/' } };
  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
<meta name="theme-color" content="#bfe8c9" />
<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
<link rel="stylesheet" href="/guide/guide.css" />
<link rel="alternate" hreflang="ko" href="https://calmforest.cloud/guide/" />
<link rel="alternate" hreflang="en" href="https://calmforest.cloud/guide/en/" />
${seoHead({ path, title, description, lang, type: 'article', jsonLd })}
<style>
  body { margin: 0; background: #fbf8ef; }
  .gp-top { position: sticky; top: 0; z-index: 2; display: flex; gap: 12px; align-items: center; justify-content: space-between;
    padding: 10px 16px; background: #dff2e3; border-bottom: 1px solid #c4dfcb; font: 600 14px/1.4 -apple-system, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif; }
  .gp-top a { color: #1f4a33; text-decoration: none; }
  .gd a.gd-tut { display: inline-block; text-decoration: none; }
</style>
</head>
<body>
<nav class="gp-top"><a href="/">${tx.home}</a><a href="${tx.otherHref}" hreflang="${lang === 'ko' ? 'en' : 'ko'}">${tx.other}</a></nav>
<main class="gd">
${body.trim()}
</main>
</body>
</html>
`;
}
