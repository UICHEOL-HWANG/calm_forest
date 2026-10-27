import { findItem } from '../cosmetics/catalog.js';
import { bundleCopy, choicesLeft } from './bundles.js';
import { wonLabel } from './cash.js';

const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
};
const fill = (tpl, v) => tpl.replace('{0}', v);

function head(bundle) {
  const h = el('div', 'bx-head');
  h.append(el('span', 'bx-ico', bundle.ico));
  const t = el('div', 'bx-titles');
  const copy = bundleCopy(bundle);
  t.append(el('b', null, copy.title), el('small', null, copy.sub));
  h.append(t);
  return h;
}

function tile(ico, name, won) {
  const d = el('div', 'bx-tile');
  d.append(el('span', 'bx-tile-ico', ico), el('span', 'bx-tile-name', name));
  if (won) d.append(el('span', 'bx-tile-won', wonLabel(won)));
  return d;
}

function overview(card, bundle, { mode, pending, onOpen, onLogin }) {
  const copy = bundleCopy(bundle);
  const tiles = el('div', 'bx-tiles');
  if (bundle.choose.length) {
    const sets = bundle.choose.map(id => findItem(id)?.ico || '').join('');
    const set0 = findItem(bundle.choose[0]);
    tiles.append(tile(sets, copy.setTile, set0?.price?.won || 0));
  }
  for (const id of bundle.fixed) {
    const it = findItem(id);
    if (it) tiles.append(tile(it.ico, it.name, it.price.won));
  }
  const value = el('div', 'bx-value');
  const list = el('span');
  if (bundle.listWon > bundle.won) list.append(el('span', null, copy.list), document.createTextNode(' '), el('s', null, wonLabel(bundle.listWon)));
  value.append(list, el('b', null, wonLabel(bundle.won)));
  const btn = el('button', 'bx-buy');
  btn.type = 'button';
  btn.textContent = mode === 'buy' ? fill(copy.buy, wonLabel(bundle.won)) : mode === 'login' ? copy.login : copy.na;
  btn.disabled = (mode !== 'buy' && mode !== 'login') || pending;
  btn.onclick = (ev) => { ev.stopPropagation(); if (!btn.disabled) mode === 'login' ? onLogin?.() : onOpen(); };
  card.append(tiles, value, btn, el('p', 'bx-note', copy.note));
}

function picker(card, bundle, { owned, pick, pending, onPick, onBuy, onBack }) {
  const copy = bundleCopy(bundle);
  card.append(el('p', 'bx-pick-title', copy.pick));
  const opts = el('div', 'bx-opts');
  for (const id of choicesLeft(bundle, owned)) {
    const it = findItem(id);
    if (!it) continue;
    const b = el('button', 'bx-opt' + (pick === id ? ' on' : ''));
    b.type = 'button';
    b.append(el('span', 'bx-opt-ico', it.ico), el('span', null, it.name));
    b.onclick = (ev) => { ev.stopPropagation(); onPick(id); };
    opts.append(b);
  }
  const buy = el('button', 'bx-buy');
  buy.type = 'button';
  buy.textContent = fill(copy.pickBuy, wonLabel(bundle.won));
  buy.disabled = !pick || pending;
  buy.onclick = (ev) => { ev.stopPropagation(); if (!buy.disabled) onBuy(pick); };
  const back = el('button', 'bx-back', copy.back);
  back.type = 'button';
  back.onclick = (ev) => { ev.stopPropagation(); onBack(); };
  card.append(opts, el('p', 'bx-note', copy.pickNote), buy, back);
}

export function drawBundleCard(box, { bundle, mode, owned = [], picking = false, pick = null, pending = false, onOpen, onLogin, onPick, onBuy, onBack }) {
  if (!bundle || mode === 'hidden') return null;
  const card = el('div', 'bx-card');
  card.append(el('span', 'bx-ribbon', bundleCopy(bundle).ribbon), head(bundle));
  if (picking && mode === 'buy' && bundle.choose.length) picker(card, bundle, { owned, pick, pending, onPick, onBuy, onBack });
  else overview(card, bundle, { mode, pending, onOpen, onLogin });
  box.append(card);
  return card;
}
