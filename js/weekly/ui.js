import { progressOf, questById } from './rules.js';
import { TICKET_CAP, TICKETS_PER_QUEST } from '../data/weekly.js';
import { WEEKLY_COPY, WEEKLY_ART, fill } from './copy.js';
import { WEEKLY_CSS, FLY_MS } from './style.js';

const rank = (r) => (r.status === 'claim' || r.status === 'capped' ? 0 : r.status === 'claimed' ? 2 : 1);

export function boardView(state) {
  const rows = state.quests.map((id) => {
    const q = questById(id);
    const group = q?.group || 'any';
    const accent = group === 'any' ? WEEKLY_ART.typeGroup[q?.type] || 'village' : group;
    const p = progressOf(state, id);
    const status = p.claimed ? 'claimed' : !p.done ? 'progress' : state.tickets >= TICKET_CAP ? 'capped' : 'claim';
    return { id, label: WEEKLY_COPY.quests[id] || q?.type || id, group, accent, status, ...p };
  });
  return { rows: [...rows].sort((a, b) => rank(a) - rank(b)), tickets: state.tickets, capped: state.tickets >= TICKET_CAP };
}

export function marketView(state, theme, ctx) {
  const rows = [theme.hero, ...theme.props].map((item) => {
    const copy = WEEKLY_COPY.items[item.id] || { name: item.id, desc: '' };
    const short = Math.max(0, item.cost - state.tickets);
    const status = !ctx.open ? 'closed' : ctx.hasArt && !ctx.hasArt(item.id) ? 'soon' : ctx.isGuest ? 'guest' : ctx.ownsDecor(item.id) ? 'owned' : short > 0 ? 'short' : 'buy';
    return { id: item.id, name: copy.name, desc: copy.desc, cost: item.cost, status, short };
  });
  return { open: ctx.open, tickets: state.tickets, rows };
}

const SVG_NS = 'http://www.w3.org/2000/svg';

let root = null;
let isOpen = false;

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

function closeIcon() {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', 'M6 6l12 12M18 6L6 18');
  svg.append(path);
  return svg;
}

function onKey(e) {
  if (e.key !== 'Escape') return;
  e.preventDefault();
  e.stopPropagation();
  closeWeekly();
}

export function closeWeekly() {
  if (!root) return;
  isOpen = false;
  root.classList.remove('show');
  root.replaceChildren();
  window.removeEventListener('keydown', onKey, true);
}

function ensureRoot() {
  if (root) return;
  const style = el('style');
  style.id = 'weekly-style';
  style.textContent = WEEKLY_CSS;
  document.head.append(style);
  root = el('div');
  root.id = 'weekly-modal';
  root.addEventListener('click', (e) => { if (e.target === root) closeWeekly(); });
  document.body.append(root);
}

function reducedMotion() {
  return !!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

function present(dlg, keepScroll) {
  const was = root.querySelector('.wk-main')?.scrollTop || 0;
  root.replaceChildren(dlg);
  if (keepScroll) dlg.querySelector('.wk-main').scrollTop = was;
  if (!isOpen) {
    isOpen = true;
    root.classList.add('show');
    window.addEventListener('keydown', onKey, true);
  }
  dlg.focus({ preventScroll: true });
}

function shell(kind, title) {
  const dlg = el('section', `wk wk-${kind}`);
  dlg.setAttribute('role', 'dialog');
  dlg.setAttribute('aria-modal', 'true');
  dlg.setAttribute('aria-label', title);
  dlg.tabIndex = -1;
  return dlg;
}

function head(title, sub, tickets, bump) {
  const sign = el('div', 'wk-sign');
  sign.append(el('h2', 'wk-t', title));
  if (sub) sign.append(el('p', 'wk-s', sub));
  const num = el('span', bump ? 'num wk-bump' : 'num', String(tickets));
  const chip = el('span', 'wk-chip');
  chip.append(el('span', null, '🎟️'), num, el('small', null, `/${TICKET_CAP}`));
  const x = el('button', 'wk-x');
  x.type = 'button';
  x.id = 'weekly-close';
  x.setAttribute('aria-label', WEEKLY_COPY.close);
  x.append(closeIcon());
  x.onclick = closeWeekly;
  const h = el('header', 'wk-head');
  h.append(sign, chip, x);
  return h;
}

function tag(ico, text, cls) {
  const t = el('div', cls ? `wk-tag ${cls}` : 'wk-tag');
  if (ico) t.append(el('span', 'ei', ico));
  t.append(el('p', null, text));
  return t;
}

function fly(from, to) {
  if (!from || !to) return;
  const f = el('span', 'wk-fly', '🎟️');
  const a = from.getBoundingClientRect();
  const b = to.getBoundingClientRect();
  const x = a.left + a.width / 2 - 11;
  const y = a.top - 6;
  f.style.left = `${x}px`;
  f.style.top = `${y}px`;
  f.style.setProperty('--dx', `${b.left + b.width / 2 - 11 - x}px`);
  f.style.setProperty('--dy', `${b.top - 6 - y}px`);
  document.body.append(f);
  setTimeout(() => f.remove(), FLY_MS);
}

function noteRow(args, row, extra) {
  const status = row.status === 'claimed' ? 'done' : row.status === 'progress' ? 'run' : 'claim';
  const n = el('div', `wk-n g-${row.accent} st-${status}`);
  if (extra.justId === row.id) n.classList.add('just');
  const hd = el('div', 'wk-hd');
  hd.append(el('span', 'wk-ic', WEEKLY_ART.groups[row.accent]), el('p', 'wk-nm', row.label));
  const ct = el('span', 'wk-ct num');
  ct.append(el('b', null, String(row.have)), ` / ${row.target}`);
  const bar = el('div', 'wk-bar');
  const fillBar = el('i');
  fillBar.style.width = `${row.target ? (row.have / row.target) * 100 : 0}%`;
  bar.append(fillBar);
  const pg = el('div', 'wk-pg');
  pg.append(ct, bar);
  const tx = el('div', 'wk-tx');
  tx.append(hd, pg);
  n.append(tx);
  if (status === 'claim') {
    const stub = el('div', 'wk-stub');
    const b = el('button', row.status === 'capped' ? 'wk-claim dim' : 'wk-claim', fill(WEEKLY_COPY.board.claim, TICKETS_PER_QUEST));
    b.type = 'button';
    if (row.status === 'capped') b.setAttribute('aria-disabled', 'true');
    b.onclick = () => claimRow(args, row.id, b, n);
    stub.append(b);
    n.append(stub);
    if (row.status === 'capped') n.append(el('p', 'wk-msg', fill(WEEKLY_COPY.board.capNo, TICKET_CAP)));
  }
  if (status === 'done') n.append(el('span', 'wk-stamp', WEEKLY_COPY.board.claimed));
  const ad = status === 'done' && extra.justId === row.id ? args.adFor?.(() => drawBoard(args, { bump: true })) : null;
  if (ad) { ad.style.whiteSpace = 'nowrap'; n.append(ad); requestAnimationFrame(() => ad.scrollIntoView({ block: 'nearest' })); }
  return n;
}

function claimRow(args, id, btn, rowEl) {
  if (rowEl.classList.contains('claiming')) return;
  const r = args.onClaim(id);
  if (!r?.ok) {
    drawBoard(args);
    return;
  }
  const done = () => { if (isOpen) drawBoard(args, { justId: id, bump: true }); };
  if (reducedMotion()) {
    done();
    return;
  }
  rowEl.classList.add('claiming');
  fly(btn, root.querySelector('.wk-chip .num'));
  setTimeout(done, FLY_MS);
}

function drawBoard(args, extra = {}) {
  const v = boardView(args.state());
  const dlg = shell('board', WEEKLY_COPY.board.title);
  const list = el('div', 'wk-list');
  list.append(...v.rows.map(r => noteRow(args, r, extra)));
  const main = el('div', 'wk-main');
  main.append(list);
  const foot = el('div', 'wk-foot');
  foot.append(tag(null, fill(WEEKLY_COPY.board.cap, TICKET_CAP), 'lite'), tag('🛒', WEEKLY_COPY.market.closed));
  dlg.append(head(WEEKLY_COPY.board.title, fill(WEEKLY_COPY.board.sub, TICKETS_PER_QUEST), v.tickets, extra.bump), main, foot);
  present(dlg, true);
}

export function showBoard(args) {
  ensureRoot();
  args.onOpen?.();
  drawBoard(args);
}

function thumb(id, url) {
  const a = WEEKLY_ART.items[id] || { ic: '🎁', th: '#e8cf9f' };
  const t = el('div', 'wk-thumb', url ? undefined : a.ic);
  t.style.setProperty('--th', a.th);
  if (url) {
    const img = el('img', 'wk-art');
    img.src = url;
    img.alt = '';
    img.setAttribute('aria-hidden', 'true');
    t.append(img);
  }
  return t;
}

function itemAct(args, row, item) {
  const act = el('div', 'act');
  if (row.status === 'buy') {
    const b = el('button', 'wk-buy', fill(WEEKLY_COPY.market.buy, row.cost));
    b.type = 'button';
    b.onclick = () => { args.onBuy(item); drawMarket(args); };
    act.append(b);
  } else if (row.status === 'short') {
    const s = el('div', 'wk-short', fill(WEEKLY_COPY.market.short, row.short));
    s.setAttribute('aria-disabled', 'true');
    act.append(s);
  } else if (row.status === 'owned') {
    act.append(el('div', 'wk-own', WEEKLY_COPY.market.owned));
  } else {
    return null;
  }
  return act;
}

function itemBody(row) {
  const body = el('div');
  body.append(el('p', 'nm', row.name), el('p', 'ds', row.desc));
  const price = el('span', 'wk-price');
  price.append('🎟️ ', el('span', 'num', String(row.cost)));
  body.append(price);
  return body;
}

function guestBox(args) {
  const g = el('div', 'wk-guest');
  const b = el('button', null, WEEKLY_COPY.market.loginBtn);
  b.type = 'button';
  b.onclick = () => { closeWeekly(); args.onLogin?.(); };
  g.append(el('p', null, WEEKLY_COPY.market.guest), b);
  return g;
}

function drawMarket(args) {
  const items = [args.theme.hero, ...args.theme.props];
  const v = marketView(args.state(), args.theme, { open: args.isOpen ? args.isOpen() : args.open, isGuest: args.isGuest, ownsDecor: args.ownsDecor, hasArt: args.hasArt });
  const art = args.thumbs || {};
  const dlg = shell('market', WEEKLY_COPY.market.title);
  dlg.append(el('div', 'wk-awn'));
  dlg.append(head(WEEKLY_COPY.market.title, v.open ? WEEKLY_COPY.market.sub : null, v.tickets, false));
  const [heroRow, ...propRows] = v.rows;
  const crate = el('div', 'wk-crate wk-it');
  const heroAct = itemAct(args, heroRow, items[0]);
  crate.append(thumb(heroRow.id, art[heroRow.id]), itemBody(heroRow));
  if (heroAct) crate.append(heroAct);
  const side = el('div', 'wk-side');
  side.append(crate);
  const tags = el('div', 'wk-tags');
  propRows.forEach((row, i) => {
    const h = el('div', 'wk-hang wk-it');
    const act = itemAct(args, row, items[i + 1]);
    const body = itemBody(row);
    h.append(thumb(row.id, art[row.id]), ...body.children);
    if (act) h.append(act);
    tags.append(h);
  });
  const main = el('div', 'wk-main');
  main.append(tags);
  const foot = el('div', 'wk-foot');
  if (!v.open) foot.append(tag('🛒', WEEKLY_COPY.market.closed));
  else if (args.isGuest) foot.append(guestBox(args));
  if (foot.children.length) dlg.classList.add('wk-strip');
  dlg.append(side, main, foot);
  present(dlg, true);
}

export function showMarket(args) {
  ensureRoot();
  args.onOpen?.();
  drawMarket(args);
}
