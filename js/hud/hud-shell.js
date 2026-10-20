const CSS = `
#topleft, #inv-chips, #time-indicator, #feedback-tab, #dex-tab, .bag-lbl { display: none !important; }
#topright { display: flex; flex-direction: row; align-items: center; gap: 10px; max-width: none; padding: 0; background: none; box-shadow: none; backdrop-filter: none;
  top: calc(16px + var(--top-inset)); right: 16px; }
body.is-touch #topright { gap: 8px; top: calc(10px + var(--top-inset)); right: max(12px, calc(env(safe-area-inset-right) + 8px)); }
#inv-hud { display: flex; gap: 10px; }
#bag-btn, .hud-ib { width: 52px; height: 52px; padding: 0; border: none; border-radius: 15px; background: var(--cream); color: var(--ink);
  box-shadow: var(--shadow); display: grid; place-items: center; font-size: 25px; position: relative; cursor: pointer; font-family: inherit; }
#bag-btn .bag-emo { font-size: 25px; }
body.is-touch #bag-btn, body.is-touch .hud-ib { width: 46px; height: 46px; border-radius: 14px; font-size: 23px; }
body.is-touch #bag-btn .bag-emo { font-size: 23px; }
.hud-ib:hover, #bag-btn:hover { filter: brightness(1.04); }
.hud-ib .burger { display: flex; flex-direction: column; gap: 4px; }
.hud-ib .burger i { display: block; width: 20px; height: 3px; border-radius: 2px; background: var(--ink); }
#coin-pop { position: fixed; z-index: 30; pointer-events: none; font-weight: 800; font-size: 15px; color: #8a6400; background: #fff3cf; border-radius: 12px; padding: 3px 9px;
  box-shadow: var(--shadow); opacity: 0; transform: translateY(0); transition: opacity .2s, transform .9s ease-out; }
#coin-pop.show { opacity: 1; transform: translateY(-14px); }
.bag-sum { display: flex; flex-wrap: wrap; gap: 6px; margin: 0 0 12px; }
.bag-chip { display: inline-flex; align-items: center; gap: 4px; padding: 6px 11px; border-radius: 13px; background: #f4faf5; color: var(--ink);
  font-weight: 800; font-size: 15px; box-shadow: var(--shadow); }
.bag-chip.coin { background: #fff3cf; color: #7a5a00; }
#minimap { top: calc(16px + var(--top-inset)); }
#cam-reset-btn { position: fixed; z-index: 8; width: 40px; height: 40px; padding: 0; border-radius: 50%; background: var(--cream); color: var(--ink);
  box-shadow: var(--shadow); display: grid; place-items: center; font-size: 21px; cursor: pointer; }
body:not(.playing) #cam-reset-btn, body.cine-open #cam-reset-btn, body.menu-open #cam-reset-btn { display: none !important; }
body.is-touch #minimap { top: calc(10px + var(--top-inset)); }
#quest-panel, body.story-on #quest-panel, body.quest-open #quest-panel { --qp-top: calc(16px + var(--top-inset)) !important; }
body:has(#hint-banner.show) #quest-panel, body.quest-open:has(#hint-banner.show) #quest-panel { --qp-top: calc(16px + var(--top-inset)) !important; }
body.is-touch #quest-panel, body.is-touch.story-on #quest-panel, body.is-touch.quest-open #quest-panel { --qp-top: calc(10px + var(--top-inset)) !important; }
body.is-touch:has(#hint-banner.show) #quest-panel, body.is-touch.quest-open:has(#hint-banner.show) #quest-panel { --qp-top: calc(10px + var(--top-inset)) !important; }
`;

const $ = (id) => document.getElementById(id);

export function initHudShell({ Input, t, trackEvent, menu }) {
  const style = document.createElement('style');
  style.id = 'hud-shell-css'; style.textContent = CSS;
  document.head.appendChild(style);

  const mkBtn = (id, html, title) => {
    const b = document.createElement('button');
    b.id = id; b.type = 'button'; b.className = 'hud-ib'; b.innerHTML = html + '<span class="hud-dot"></span>';
    b.title = t(title); b.setAttribute('aria-label', t(title));
    return b;
  };
  const dexBtn = mkBtn('hud-dex', '📖', '도감');
  const menuBtn = mkBtn('hud-menu', '<span class="burger"><i></i><i></i><i></i></span>', '메뉴');
  $('topright')?.append(dexBtn, menuBtn);
  const camBtn = $('cam-reset-btn');
  if (camBtn) document.body.appendChild(camBtn);
  dexBtn.addEventListener('click', (e) => { e.stopPropagation(); $('dex-tab')?.click(); });
  menuBtn.addEventListener('click', (e) => { e.stopPropagation(); menu.open(); });

  let lastCoins = null, coinTimer = 0;
  const coinPop = document.createElement('div'); coinPop.id = 'coin-pop';
  document.body.appendChild(coinPop);
  function popCoins(n) {
    const r = $('bag-btn')?.getBoundingClientRect();
    if (!r || !r.width) return;
    coinPop.textContent = `🪙 +${n}`;
    coinPop.style.left = Math.round(r.left - 8) + 'px';
    coinPop.style.top = Math.round(r.bottom + 6) + 'px';
    coinPop.classList.remove('show'); void coinPop.offsetWidth; coinPop.classList.add('show');
    clearTimeout(coinTimer); coinTimer = setTimeout(() => coinPop.classList.remove('show'), 1400);
  }

  function layoutLeft() {
    const qp = $('quest-panel'), mm = $('minimap'), chip = $('story-chip');
    if (!qp || !mm) return;
    qp.style.top = '';
    const q = qp.getBoundingClientRect();
    mm.style.top = q.height ? Math.round(q.bottom + 8) + 'px' : '';
    const m = mm.getBoundingClientRect();
    const cb = $('cam-reset-btn');
    if (cb) { cb.style.left = Math.round((m.width ? m.right : 12) + 8) + 'px'; cb.style.top = Math.round(m.width ? m.top : 10) + 'px'; }
    const below = m.height ? m.bottom : q.height ? q.bottom : 0;
    if (chip) chip.style.top = below ? Math.round(below + 8) + 'px' : '';
  }
  let pending = 0;
  const schedule = () => { if (!pending) pending = requestAnimationFrame(() => { pending = 0; layoutLeft(); }); };
  if (window.ResizeObserver) {
    const ro = new ResizeObserver(schedule);
    ['quest-panel', 'minimap'].forEach(id => $(id) && ro.observe($(id)));
  }
  addEventListener('resize', schedule);
  new MutationObserver(schedule).observe(document.body, { attributes: true, attributeFilter: ['class'] });

  return {
    onInv(inv) {
      const c = inv?.coins || 0;
      if (lastCoins !== null && c > lastCoins) popCoins(c - lastCoins);
      lastCoins = c;
    },
    setUnread(n) { menuBtn.classList.toggle('has-dot', (n || 0) > 0); },
    layoutLeft,
  };
}
