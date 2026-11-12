import { LETTER, FAIL, MENU, DECOR_TILES, stage1Lines } from './copy.js';
import { STAGE1_BUNDLE } from './rules.js';

const $ = (id) => document.getElementById(id);

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

function fill(box, nodes) {
  box.replaceChildren(...nodes);
  box.hidden = nodes.length === 0;
}

function row({ ico, name, qty }) {
  const d = el('div', 'pg-row');
  const left = el('span', 'pg-name');
  left.append(el('span', 'pg-ico', ico), el('span', null, name));
  d.append(left, el('b', null, qty));
  return d;
}

function tile({ ico, name }) {
  const d = el('div', 'pg-tile');
  d.append(el('i', null, ico), el('b', null, name));
  return d;
}

export function letterView(view, lang) {
  if (view.stage === 2) {
    return { seal: '🎈', from: LETTER.from2, title: LETTER.title2, note: LETTER.note2, lines: [], tiles: [...DECOR_TILES], ps: null, take: LETTER.ok, login: null };
  }
  const from = (lang === 'en' ? view.labelEn : view.label) || LETTER.fallbackFrom;
  return {
    seal: '🌲', from, title: LETTER.title1, note: LETTER.note1,
    lines: stage1Lines(STAGE1_BUNDLE), tiles: [],
    ps: view.loggedIn ? null : LETTER.ps,
    take: LETTER.take, login: view.loggedIn ? null : LETTER.login,
  };
}

export function showLetter(view, { track, connect, code, lang }) {
  const modal = $('promo-gift-modal');
  if (!modal) return Promise.resolve();
  const v = letterView(view, lang);
  $('promo-gift-seal').textContent = v.seal;
  $('promo-gift-from').textContent = v.from;
  $('promo-gift-title').textContent = v.title;
  $('promo-gift-note').textContent = v.note;
  fill($('promo-gift-list'), v.lines.map(row));
  fill($('promo-gift-set'), v.tiles.map(tile));
  $('promo-gift-rule').hidden = v.lines.length === 0;
  $('promo-gift-ps').textContent = v.ps || '';
  $('promo-gift-ps').hidden = !v.ps;
  $('promo-gift-ok').textContent = v.take;
  $('promo-gift-cta').textContent = v.login || '';
  $('promo-gift-cta').hidden = !v.login;
  modal.classList.toggle('solo', !v.login);
  return new Promise((resolve) => {
    const close = () => { modal.classList.remove('show'); resolve(); };
    $('promo-gift-ok').onclick = close;
    $('promo-gift-cta').onclick = () => {
      track('promo_gift_login_click', { code });
      close();
      connect?.('promo_gift');
    };
    modal.classList.add('show');
  });
}

export function openCodeEntry({ submit }) {
  const modal = $('gift-code-modal');
  if (!modal) return;
  const input = $('gift-code-input');
  const msg = $('gift-code-msg');
  const go = $('gift-code-submit');
  $('gift-code-title').textContent = MENU.title;
  input.placeholder = MENU.placeholder;
  input.value = '';
  msg.textContent = '';
  go.textContent = MENU.submit;
  $('gift-code-close').textContent = MENU.close;
  $('gift-code-close').onclick = () => modal.classList.remove('show');
  go.onclick = async () => {
    go.disabled = true;
    const r = await submit(input.value, () => modal.classList.remove('show'));
    go.disabled = false;
    if (!r.ok) msg.textContent = FAIL[r.reason] || FAIL.unknown;
  };
  modal.classList.add('show');
  input.focus();
}
