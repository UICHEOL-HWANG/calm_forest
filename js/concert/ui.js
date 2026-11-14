import { CONCERT_DECOR } from '../data/concert.js';
import { CONCERT_COPY as C } from './copy.js';
import { hallView, LANE_COLORS } from './views.js';
import { ensureConcertStyle } from './style.js';

const fill = (line, n) => line.replace('{0}', n);
const BULB_COLORS = ['#ffd98a', '#ff9f7a', '#fff1c4'];
const STAR = 'M12 2.8l2.85 5.8 6.4.92-4.63 4.5 1.1 6.36L12 17.4l-5.72 2.98 1.1-6.36L2.75 9.52l6.4-.92z';
const NOTE = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><ellipse cx="8.6" cy="17.6" rx="4.7" ry="3.5" transform="rotate(-18 8.6 17.6)"/><path d="M11.6 17.4V3.6c3.9.7 6.6 2.9 7 7-1.6-2-3.3-2.9-4.9-3.2v10z"/></svg>';
const XSVG = '<svg viewBox="0 0 18 18" aria-hidden="true"><path d="M3.5 3.5l11 11M14.5 3.5l-11 11"/></svg>';
const PERSON = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8.5" r="4"/><path d="M4.5 20.5c1-4.2 4-6 7.5-6s6.5 1.8 7.5 6"/></svg>';
const bell = (cx, col) => `<rect x="${cx - 2}" y="5" width="4" height="11" rx="2" fill="${col}"/><path d="M${cx} 14c-5 0-7 5-7 11l-3 6h20l-3-6c0-6-2-11-7-11z" fill="#dba93a"/><circle cx="${cx}" cy="34" r="2.6" fill="#8a6418"/>`;
const GLYPH = {
  drum: '<path d="M9 21v11c0 3.3 6.7 6 15 6s15-2.7 15-6V21z" fill="#c2473b"/><path d="M9.5 27l4.8 8 4.9-7.5L24 37l4.8-9.5 4.9 7.5 4.8-8" fill="none" stroke="#f7e6c4" stroke-width="1.8" stroke-linejoin="round"/><ellipse cx="24" cy="21" rx="15" ry="6" fill="#f7e6c4" stroke="#b9824f" stroke-width="2"/><path d="M11 7l12 12M37 7L27 18" stroke="#c9935a" stroke-width="3" stroke-linecap="round"/>',
  maracas: '<path d="M18 23l5 16M30 23l-4 16" stroke="#c9935a" stroke-width="3.6" stroke-linecap="round"/><ellipse cx="15.5" cy="15.5" rx="8.5" ry="9.8" fill="#5c9a68" transform="rotate(-18 15.5 15.5)"/><path d="M8 13.5q7 4.5 15.5-1" stroke="#f7e6c4" stroke-width="2" fill="none"/><ellipse cx="32.5" cy="15.5" rx="8.5" ry="9.8" fill="#d9574a" transform="rotate(16 32.5 15.5)"/><path d="M24.5 12q8 5 16 2.5" stroke="#f7e6c4" stroke-width="2" fill="none"/>',
  bells: bell(14, '#6aa6d8') + bell(34, '#d9574a'),
  bass: `<circle cx="22" cy="26" r="16" fill="#f7e6c4" stroke="#b9824f" stroke-width="4"/><path d="${STAR}" fill="#e2a93a" transform="translate(22 26) scale(.62) translate(-12 -12)"/><path d="M45 5L34 16" stroke="#c9935a" stroke-width="3" stroke-linecap="round"/><circle cx="33" cy="17" r="4.2" fill="#fffaf0" stroke="#cdb892" stroke-width="1.2"/>`,
  guitar: '<g transform="rotate(38 24 24)"><rect x="22" y="1" width="4" height="24" rx="1.5" fill="#8a5a32"/><rect x="20.5" y="-2" width="7" height="7" rx="2" fill="#6e4524"/><circle cx="24" cy="25" r="8" fill="#e2a55a"/><circle cx="24" cy="35" r="10.5" fill="#e2a55a"/><circle cx="24" cy="30" r="3.6" fill="#5a3818"/><rect x="20" y="38" width="8" height="2.4" rx="1" fill="#6e4524"/></g>',
};
const KIND = Object.fromEntries(CONCERT_DECOR.map(d => [d.id, d.kind]));

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

function svgEl(markup, cls) {
  const s = el('span', cls);
  s.innerHTML = markup;
  return s;
}

function button(cls, text, onClick) {
  const b = el('button', `cc-btn ${cls}`, text);
  b.type = 'button';
  if (onClick) b.onclick = onClick;
  return b;
}

function stars(n) {
  const s = el('span', 'cc-stars');
  s.setAttribute('aria-label', `${n}/3`);
  s.innerHTML = [0, 1, 2].map(i => `<svg viewBox="0 0 24 24" class="${i < n ? 'on' : 'off'}" aria-hidden="true"><path d="${STAR}"/></svg>`).join('');
  return s;
}

function deco() {
  const d = el('div', 'cc-deco');
  d.innerHTML = '<svg viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true"><path d="M0 6 Q50 24 100 6"/></svg>';
  return d;
}

function hangBulbs(card) {
  const d = card.querySelector('.cc-deco');
  if (!d) return;
  d.querySelectorAll('.cc-bulb').forEach(b => b.remove());
  const n = Math.max(7, Math.round(card.clientWidth / 48));
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const b = el('i', 'cc-bulb');
    b.style.left = `${(t * 100).toFixed(2)}%`;
    b.style.top = `${(7 + 36 * t * (1 - t)).toFixed(1)}px`;
    b.style.setProperty('--bc', BULB_COLORS[i % 3]);
    d.append(b);
  }
}

function makeDialog(id, onDismiss) {
  ensureConcertStyle();
  document.getElementById(id)?.remove();
  const root = el('div', 'cc-root');
  root.id = id;
  const onKey = (e) => {
    if (e.key !== 'Escape') return;
    e.preventDefault();
    e.stopPropagation();
    onDismiss();
  };
  const onResize = () => { const card = root.firstElementChild; if (card) hangBulbs(card); };
  root.addEventListener('click', (e) => { if (e.target === root) onDismiss(); });
  document.body.append(root);
  window.addEventListener('keydown', onKey, true);
  window.addEventListener('resize', onResize);
  return {
    root,
    present(card) {
      const was = root.querySelector('.cc-body')?.scrollTop || 0;
      root.replaceChildren(card);
      root.classList.add('show');
      const body = card.querySelector('.cc-body');
      if (body) body.scrollTop = was;
      hangBulbs(card);
      card.focus({ preventScroll: true });
    },
    close() {
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('resize', onResize);
      root.classList.remove('show');
      root.remove();
    },
  };
}

function card(cls, label) {
  const c = el('section', `cc-card ${cls}`);
  c.setAttribute('role', 'dialog');
  c.setAttribute('aria-modal', 'true');
  c.setAttribute('aria-label', label);
  c.tabIndex = -1;
  c.append(deco());
  return c;
}

function songRow(song, pick) {
  const r = el('article', `cc-row cc-song cc-lv${song.tier}`);
  const meta = el('div', 'cc-meta');
  meta.append(el('span', 'cc-lv', song.level), stars(song.stars));
  const info = el('div', 'cc-info');
  info.append(el('h4', null, song.name), meta);
  const stub = el('div', 'cc-stub');
  stub.append(button('cc-pri', C.play, () => pick(song.id)));
  r.append(el('i', 'cc-mark'), info, stub);
  return r;
}

function tag(cls, text) {
  return el('span', `cc-tag ${cls}`, text);
}

function quiet(text) {
  const b = button('cc-quiet', text);
  b.setAttribute('aria-disabled', 'true');
  b.tabIndex = -1;
  return b;
}

function instAct(it, act) {
  if (it.status === 'equipped') {
    const t = tag('cc-on', C.equipped);
    t.prepend(svgEl('<b></b><b></b><b></b>', 'cc-eq'));
    return t;
  }
  if (it.status === 'owned') return button('cc-sec', C.equip, () => act.equip(it.id));
  if (it.status === 'buy') return button('cc-pri', fill(C.buy, it.cost), () => act.buy({ id: it.id, cost: it.cost, type: 'instrument' }));
  if (it.status === 'short') return tag('cc-short', fill(C.short, it.lack));
  return quiet(fill(C.buy, it.cost));
}

function instRow(it, act) {
  const r = el('article', 'cc-row cc-inst');
  r.append(svgEl(`<svg viewBox="0 0 48 48" aria-hidden="true">${GLYPH[it.id] || ''}</svg>`, 'cc-gl'));
  const nm = el('div', 'cc-nm');
  const dots = el('span', 'cc-dots');
  (LANE_COLORS[it.id] || []).forEach(c => { const d = el('i'); d.style.background = c; dots.append(d); });
  nm.append(el('h4', null, it.name), dots);
  const a = el('div', 'cc-act');
  a.append(instAct(it, act));
  r.append(nm, a);
  return r;
}

function decorAct(d, act) {
  if (d.status === 'owned') return tag('cc-own', C.owned);
  if (d.status === 'soon') return tag('cc-soon', C.soon);
  if (d.status === 'buy') return button('cc-pri', fill(C.buy, d.cost), () => act.buy({ id: d.id, cost: d.cost, kind: KIND[d.id], type: 'decor' }));
  if (d.status === 'short') return tag('cc-short', fill(C.short, d.lack));
  return quiet(fill(C.buy, d.cost));
}

function decorRow(d, act) {
  const r = el('article', 'cc-row cc-dec');
  const th = el('span', 'cc-th');
  if (d.thumb) {
    const img = el('img');
    img.src = d.thumb;
    img.alt = '';
    th.append(img);
  } else {
    th.innerHTML = NOTE;
  }
  const pr = el('span', 'cc-pr');
  pr.innerHTML = NOTE;
  pr.append(String(d.cost));
  const a = el('div', 'cc-act');
  a.append(decorAct(d, act));
  r.append(th, pr, a);
  return r;
}

function guestNote(login) {
  const g = el('div', 'cc-guest');
  g.innerHTML = PERSON;
  g.append(el('p', null, C.guest), button('cc-pri', C.guestBtn, login));
  return g;
}

function hallHead(v, close) {
  const ttl = el('div', 'cc-ttl');
  ttl.append(el('h2', null, C.title), el('p', null, v.sub));
  const purse = svgEl(NOTE, 'cc-purse');
  purse.append(el('small', null, C.noteName), el('b', null, String(v.notes)));
  const x = el('button', 'cc-x');
  x.type = 'button';
  x.id = 'concert-close';
  x.setAttribute('aria-label', C.leave);
  x.innerHTML = XSVG;
  x.onclick = close;
  const h = el('header', 'cc-hd');
  h.append(ttl, purse, x);
  return h;
}

const TABS = [['songs', 'tabSongs'], ['inst', 'tabInst'], ['shop', 'tabShop']];

function hallTabs(tab, go) {
  const nav = el('nav', 'cc-tabs');
  nav.setAttribute('role', 'tablist');
  TABS.forEach(([id, key]) => {
    const b = el('button', id === tab ? 'on' : null, C[key]);
    b.type = 'button';
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-selected', String(id === tab));
    b.onclick = () => go(id);
    nav.append(b);
  });
  return nav;
}

function hallBody(v, tab, act) {
  const body = el('div', 'cc-body');
  if (tab === 'songs') {
    const list = el('div', 'cc-list cc-songs');
    list.append(...v.songs.map(s => songRow(s, act.play)));
    body.append(list);
    return body;
  }
  const rows = tab === 'inst' ? v.instruments : v.decor;
  if (rows.some(r => r.status === 'guest')) body.append(guestNote(act.login));
  const list = el('div', tab === 'inst' ? 'cc-list cc-insts' : 'cc-decs');
  list.append(...rows.map(r => (tab === 'inst' ? instRow(r, act) : decorRow(r, act))));
  body.append(list);
  return body;
}

export function showHall({ getState, env, onPlay, onEquip, onBuy, onLogin, onOpen }) {
  let tab = 'songs';
  const dlg = makeDialog('concert-hall-modal', () => dlg.close());
  const login = () => { dlg.close(); onLogin?.(); };
  const act = {
    play: (id) => { dlg.close(); onPlay?.(id); },
    equip: (id) => { onEquip?.(id); render(); },
    buy: (item) => {
      const r = onBuy?.(item);
      if (r && !r.ok && r.reason === 'guest') { login(); return; }
      render();
    },
    login,
  };
  function render() {
    if (!dlg.root.isConnected) return;
    const v = hallView(getState(), env());
    const c = card('cc-hall', C.title);
    c.append(hallHead(v, dlg.close), hallTabs(tab, (id) => { tab = id; render(); }), hallBody(v, tab, act));
    dlg.present(c);
  }
  onOpen?.();
  render();
  return { render, close: dlg.close };
}

export function showResult({ view, onAgain, onLeave, ad = null }) {
  const leave = () => { dlg.close(); onLeave?.(); };
  const dlg = makeDialog('concert-result-modal', leave);
  const c = card('cc-res', view.title);
  const top = el('div', 'cc-rtop');
  const [first, ...rest] = view.lines;
  const paid = first !== C.noPay;
  const l1 = el('p', paid ? 'cc-l1' : 'cc-l1 cc-free');
  if (paid) l1.innerHTML = NOTE;
  l1.append(first);
  top.append(el('h3', null, view.title), stars(view.stars), l1, ...rest.map(l => el('p', 'cc-l2', l)));
  if (ad) top.append(ad);
  const cnt = el('div', 'cc-cnt');
  [[view.perfect, C.judge.perfect], [view.good, C.judge.good], [view.miss, C.judge.miss]].forEach(([n, label]) => {
    const d = el('div');
    d.append(el('b', null, String(n)), el('span', null, label));
    cnt.append(d);
  });
  const btns = el('div', 'cc-btns');
  btns.append(button('cc-pri', C.again, () => { dlg.close(); onAgain?.(); }), button('cc-sec', C.leave, leave));
  const bot = el('div', 'cc-rbot');
  bot.append(cnt, btns);
  c.append(top, bot);
  dlg.present(c);
  return { close: dlg.close };
}
