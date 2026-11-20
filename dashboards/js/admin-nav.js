import { CHAR, esc, shareKey } from './admin-common.js';

const ITEMS = [
  ['home', 'index.html', '홈', 'bear'],
  ['active', 'active.html', '활성 유저', 'dog'],
  ['analytics', 'admin_analytics.html', '애널리틱스', 'fox'],
  ['exp', 'experiments.html', '실험', 'chick'],
  ['notices', 'notices_admin.html', '소식함', 'panda'],
  ['utm', 'utm.html', 'UTM 링크', 'rabbit'],
];
const SHARED = ['active', 'analytics', 'exp'];

const CSS = `
body[data-nav] { padding-top: calc(var(--nav-h, 56px) + 24px); }
.anav { position: fixed; top: 0; left: 0; right: 0; z-index: 20; display: flex; align-items: center; gap: 6px 20px;
  padding: calc(9px + env(safe-area-inset-top, 0px)) max(20px, calc((100vw - 1320px) / 2 + 20px)) 9px;
  background: color-mix(in srgb, var(--surface-0) 86%, transparent); -webkit-backdrop-filter: blur(14px); backdrop-filter: blur(14px);
  border-bottom: 1px solid var(--line); font-family: var(--font); font-size: 13.5px; line-height: 1.4; }
.anav a { text-decoration: none; color: var(--ink-3); white-space: nowrap; }
.anav-brand { display: flex; align-items: center; gap: 8px; font-weight: 800; letter-spacing: -.3px; color: var(--ink) !important; }
.anav-brand img { width: 30px; height: 30px; object-fit: contain; }
.anav nav { display: flex; gap: 2px; overflow-x: auto; scrollbar-width: none; min-width: 0; }
.anav nav::-webkit-scrollbar { display: none; }
.anav nav a { display: flex; align-items: center; gap: 6px; padding: 7px 12px; border-radius: 10px; font-weight: 600; transition: background .15s, color .15s; }
.anav nav a img { width: 20px; height: 20px; object-fit: contain; }
.anav nav a:hover { background: var(--surface-2); color: var(--ink); }
.anav nav a[aria-current="page"] { background: var(--surface-1); color: var(--ink); box-shadow: inset 0 0 0 1px var(--line), var(--shadow); }
.anav-game { margin-left: auto; font-size: 12.5px; }
.anav-game:hover { color: var(--ink); text-decoration: underline; }
@media (max-width: 860px) {
  .anav { flex-wrap: wrap; padding-inline: 14px; }
  .anav nav { order: 3; width: 100%; }
}
@media (prefers-reduced-motion: reduce) { .anav nav a { transition: none; } }
`;

export function navItems(share) {
  return ITEMS.filter(([key]) => !share || SHARED.includes(key));
}

function mount() {
  const current = document.body.dataset.nav;
  if (!current || document.querySelector('.anav')) return;
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.append(style);
  const q = shareKey ? `?k=${encodeURIComponent(shareKey)}` : '';
  const bar = document.createElement('div');
  bar.className = 'anav';
  bar.innerHTML = `<a class="anav-brand" href="${shareKey ? `admin_analytics.html${q}` : 'index.html'}"><img src="${CHAR('bear')}" alt="">고요한 숲 관리자</a>
    <nav aria-label="관리자 메뉴">${navItems(!!shareKey).map(([key, file, label, char]) => `<a href="${file}${q}"${key === current ? ' aria-current="page"' : ''}><img src="${CHAR(char)}" alt="">${esc(label)}</a>`).join('')}</nav>
    ${shareKey ? '' : '<a class="anav-game" href="../index.html">게임으로</a>'}`;
  document.body.prepend(bar);
  const fit = () => document.documentElement.style.setProperty('--nav-h', `${bar.offsetHeight}px`);
  new ResizeObserver(fit).observe(bar);
  fit();
  if (shareKey) document.querySelectorAll('a[data-keep-k]').forEach((a) => { const u = new URL(a.href); u.searchParams.set('k', shareKey); a.href = u.href; });
  const on = bar.querySelector('[aria-current="page"]');
  const nav = bar.querySelector('nav');
  if (on) nav.scrollLeft = on.offsetLeft - nav.offsetLeft - (nav.clientWidth - on.offsetWidth) / 2;
}

if (typeof document !== 'undefined') mount();
