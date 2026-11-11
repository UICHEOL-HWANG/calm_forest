import { seoHead } from './seo-meta.mjs';

const TEXT = {
  ko: { play: '🌿 게임 하러 가기', other: 'English', otherHref: '/guide/en/', home: '고요한 숲', apps: '📱 앱으로도 만나요', ios: 'App Store에서 다운로드하기', android: '다운로드하기 Google Play', pc: '🖥️ PC', touch: '📱 모바일', toc: '목차' },
  en: { play: '🌿 Play calm forest', other: '한국어', otherHref: '/guide/', home: 'calm forest', apps: '📱 Also on mobile', ios: 'Download on the App Store', android: 'Get it on Google Play', pc: '🖥️ PC', touch: '📱 Mobile', toc: 'Contents' },
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
  .gd .gd-sec { scroll-margin-top: 56px; }
  .gp-dev { display: flex; justify-content: center; padding: 10px 16px 0; }
  .gp-apps { margin: 32px 0 8px; padding: 22px 16px; text-align: center; border-top: 1px solid #dfe8dc; }
  .gp-apps p { margin: 0 0 12px; font-weight: 700; }
  .gp-apps a { display: inline-block; margin: 0 6px 8px; line-height: 0; }
  .gp-apps img { height: 40px; width: auto; }
</style>
</head>
<body>
<nav class="gp-top"><a href="/">${tx.home}</a><span><a href="/wiki/">고요위키</a> · <a href="${tx.otherHref}" hreflang="${lang === 'ko' ? 'en' : 'ko'}">${tx.other}</a></span></nav>
<div class="gp-dev"><span class="gd-devtabs"><button type="button" data-dev-tab="pc" aria-pressed="true">${tx.pc}</button><button type="button" data-dev-tab="touch" aria-pressed="false">${tx.touch}</button></span></div>
<main class="gd dev-pc">
${body.trim()}
<aside class="gp-apps">
  <p>${tx.apps}</p>
  <a href="/app?os=ios&amp;utm_source=guide"><img src="/assets/badges/app-store-${lang}.svg" alt="${tx.ios}" height="40" /></a>
  <a href="/app?os=android&amp;utm_source=guide"><img src="/assets/badges/google-play-${lang}.png" alt="${tx.android}" height="40" /></a>
</aside>
</main>
<script>(() => {
  const main = document.querySelector('main.gd'), tabs = document.querySelectorAll('[data-dev-tab]');
  const set = (d) => { main.classList.remove('dev-pc', 'dev-touch'); main.classList.add('dev-' + d); tabs.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.devTab === d))); };
  set(matchMedia('(pointer: coarse)').matches ? 'touch' : 'pc');
  tabs.forEach(b => b.addEventListener('click', () => set(b.dataset.devTab)));
  const secs = [...main.querySelectorAll('section.gd-sec')];
  const toc = document.createElement('nav'), list = document.createElement('ol');
  toc.className = 'gd-toc'; toc.setAttribute('aria-label', '${tx.toc}');
  for (const sec of secs) {
    const part = sec.querySelector('[data-part]')?.dataset.part;
    if (part) { const li = document.createElement('li'); li.className = 'gd-toc-part'; li.textContent = part; list.appendChild(li); }
    const li = document.createElement('li'), a = document.createElement('a'), label = document.createElement('span');
    a.href = '#' + sec.id; a.dataset.sec = sec.id;
    label.textContent = sec.querySelector('h2')?.dataset.chip || sec.id;
    a.append(label, document.createElement('i'));
    li.appendChild(a); list.appendChild(li);
  }
  toc.appendChild(list); document.body.appendChild(toc);
  const links = [...toc.querySelectorAll('a')];
  const io = new IntersectionObserver((es) => {
    const hit = es.filter(e => e.isIntersecting).sort((x, y) => x.boundingClientRect.top - y.boundingClientRect.top)[0];
    if (hit) links.forEach(a => a.classList.toggle('on', a.dataset.sec === hit.target.id));
  }, { rootMargin: '-10% 0px -80% 0px' });
  secs.forEach(s => io.observe(s));
})();</script>
</body>
</html>
`;
}
