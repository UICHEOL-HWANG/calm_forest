const CSS = `
.hud-dot { position: absolute; top: -3px; right: -3px; width: 13px; height: 13px; border-radius: 50%; background: #e0533d; border: 2px solid var(--cream); display: none; }
.has-dot > .hud-dot { display: block; }
#menu-btn { position: relative; }
#menu-sheet-bg { position: fixed; inset: 0; z-index: 46; background: rgba(30,24,14,.42); display: none; }
#menu-sheet-bg.show { display: block; }
#menu-sheet { position: fixed; z-index: 47; left: 50%; top: 50%; transform: translate(-50%, -50%); width: min(420px, calc(100vw - 28px)); box-sizing: border-box;
  max-height: calc(100vh - 24px - var(--top-inset, 0px) - env(safe-area-inset-bottom));
  max-height: calc(100dvh - 24px - var(--top-inset, 0px) - env(safe-area-inset-bottom)); overflow-y: auto; -webkit-overflow-scrolling: touch; overscroll-behavior: contain;
  background: var(--cream); border-radius: 22px; padding: 14px 14px 16px; box-shadow: 0 20px 60px rgba(30,50,40,.35); display: none;
  -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; }
#menu-sheet.show { display: block; }
.ms-head { display: flex; align-items: center; gap: 8px; font-weight: 800; font-size: 17px; }
.ms-env { font-size: 18px; }
.ms-x { margin-left: auto; width: 32px; height: 32px; border-radius: 50%; border: none; background: #efe5cf; font-size: 15px; color: var(--ink); cursor: pointer; font-family: inherit; }
.ms-cat { font-size: 12px; font-weight: 800; color: #3f7a3d; margin: 12px 0 6px; }
.ms-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.ms-cell { background: #fff; border: 1px solid #e3d8c2; border-radius: 14px; padding: 10px 2px 8px; text-align: center; font-size: 11.5px; line-height: 1.25; position: relative;
  color: var(--ink); font-family: inherit; cursor: pointer; word-break: keep-all; }
.ms-cell:hover { border-color: #a8d88a; background: #f6fbf1; }
.ms-cell .ms-ico { display: block; font-size: 24px; margin-bottom: 4px; }
.ms-cell .hud-dot { top: 4px; right: 8px; }
@media (min-width: 900px) { #menu-sheet { width: 460px; padding: 18px 18px 20px; } .ms-cell { font-size: 12.5px; } }
@media (orientation: landscape) and (max-height: 500px) { .ms-grid { grid-template-columns: repeat(6, 1fr); } #menu-sheet { width: min(560px, calc(100vw - 28px)); } }
`;

const CATS = [
  ['🏡', '마을', [['char-btn', '🐾'], ['map-btn', '🗺️'], ['photo-btn', '📷'], ['emote-btn', '🙂']]],
  ['💌', '소식·친구', [['inbox-btn', '📮'], ['invite-btn', '🤝'], ['lb-btn', '🏆'], ['feedback-tab', '💬']]],
  ['📒', '기록', [['album-btn', '📸'], ['decor-set-btn', '🎁'], ['stats-btn', '📊'], ['diary-btn', '📝'], ['help-btn', '📖']]],
  ['⚙️', '설정', [['settings-btn', '⚙️']]],
];

const $ = (id) => document.getElementById(id);
const labelOf = (el) => (el.querySelector('.ulbl, .lbl')?.textContent || el.querySelectorAll('span')[1]?.textContent || el.title || '').trim();

export function createMenuSheet({ Input, t, trackEvent, dotTarget = null, onOpen = null }) {
  if (!$('menu-sheet-css')) {
    const style = document.createElement('style');
    style.id = 'menu-sheet-css'; style.textContent = CSS;
    document.head.appendChild(style);
  }
  let unread = 0;
  const bg = document.createElement('div'); bg.id = 'menu-sheet-bg';
  const sheet = document.createElement('div'); sheet.id = 'menu-sheet';
  document.body.append(bg, sheet);
  bg.addEventListener('click', close);
  addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  if (dotTarget && !dotTarget.querySelector('.hud-dot')) {
    const d = document.createElement('span'); d.className = 'hud-dot'; dotTarget.appendChild(d);
  }

  function open() {
    Input.setAnalog?.(0, 0);
    sheet.innerHTML = '';
    const head = document.createElement('div'); head.className = 'ms-head';
    const ttl = document.createElement('span'); ttl.textContent = t('메뉴');
    const env = document.createElement('span'); env.className = 'ms-env';
    env.textContent = `${$('season-emoji')?.textContent || ''} ${$('time-emoji')?.textContent || ''}`.trim();
    const x = document.createElement('button'); x.className = 'ms-x'; x.type = 'button'; x.textContent = '✕';
    x.addEventListener('click', close);
    head.append(ttl, env, x);
    sheet.appendChild(head);
    CATS.forEach(([ico, cat, list]) => {
      const cells = list.map(([id, cico]) => [$(id), cico]).filter(([el]) => el && el.style.display !== 'none');
      if (!cells.length) return;
      const h = document.createElement('div'); h.className = 'ms-cat'; h.textContent = `${ico} ${t(cat)}`;
      const g = document.createElement('div'); g.className = 'ms-grid';
      cells.forEach(([el, cico]) => {
        const c = document.createElement('button'); c.type = 'button'; c.className = 'ms-cell';
        c.dataset.for = el.id;
        const i = document.createElement('span'); i.className = 'ms-ico'; i.textContent = cico;
        c.append(i, document.createTextNode(labelOf(el)));
        if (el.id === 'inbox-btn') { const d = document.createElement('span'); d.className = 'hud-dot'; c.appendChild(d); c.classList.toggle('has-dot', unread > 0); }
        c.addEventListener('click', () => {
          close();
          trackEvent?.('hud_menu_item', { item: el.id.replace(/-(btn|tab)$/, '') });
          el.click();
        });
        g.appendChild(c);
      });
      sheet.append(h, g);
    });
    sheet.classList.add('show'); bg.classList.add('show');
    document.body.classList.add('menu-open');
    trackEvent?.('hud_menu_open', {});
    onOpen?.();
  }

  function close() {
    if (!sheet.classList.contains('show')) return;
    sheet.classList.remove('show'); bg.classList.remove('show');
    document.body.classList.remove('menu-open');
  }

  return {
    open,
    close,
    isOpen: () => sheet.classList.contains('show'),
    setUnread(n) { unread = n || 0; dotTarget?.classList.toggle('has-dot', unread > 0); },
  };
}
