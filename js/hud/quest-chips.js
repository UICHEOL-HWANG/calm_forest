import { chipState, snapshot, progressed, sheetTab, sheetPlacement } from './quest-chips-model.js';
import { ICONS, QUEST_CHIPS_CSS } from './quest-chips-css.js';

const GLOW_MS = 3000;
const LABEL = { q: '의뢰', a: '친해지기' };
const KEYS = ['q', 'a'];

const el = (tag, props = {}, html = '') => {
  const n = Object.assign(document.createElement(tag), props);
  if (html) n.innerHTML = html;
  return n;
};
const visibleRect = (id) => {
  const n = document.getElementById(id);
  const r = n?.getBoundingClientRect();
  return r && r.width && getComputedStyle(n).display !== 'none' ? r : null;
};

function buildButton(k, t) {
  const b = el('button', { type: 'button', className: 'qc-rb', hidden: true }, `<span class="qc-in">${ICONS[k]}</span>`);
  b.dataset.k = k;
  b.setAttribute('aria-label', t(LABEL[k]));
  b.setAttribute('aria-controls', 'qc-sheet');
  b.setAttribute('aria-expanded', 'false');
  b.append(el('span', { className: k === 'q' ? 'qc-badge' : 'qc-dot', hidden: k === 'a' }));
  return b;
}

function buildTab(k, t) {
  const b = el('button', { type: 'button', className: 'qc-tab', id: `qc-tab-${k}` }, ICONS[k]);
  b.dataset.k = k;
  b.setAttribute('role', 'tab');
  b.append(el('span', { textContent: t(LABEL[k]) }));
  return b;
}

function buildSheet(t) {
  const sheet = el('div', { id: 'qc-sheet', hidden: true });
  sheet.setAttribute('role', 'dialog');
  const tabs = el('div', { className: 'qc-tabs' });
  tabs.setAttribute('role', 'tablist');
  const tabBtns = Object.fromEntries(KEYS.map(k => [k, buildTab(k, t)]));
  const x = el('button', { type: 'button', className: 'qc-x' }, ICONS.x);
  x.setAttribute('aria-label', t('닫기'));
  tabs.append(tabBtns.q, tabBtns.a, x);
  const body = el('div', { className: 'qc-body' });
  const panes = Object.fromEntries(KEYS.map(k => [k, el('div', { className: 'qc-pane', hidden: true })]));
  Object.values(panes).forEach(p => p.setAttribute('role', 'tabpanel'));
  body.append(panes.q, panes.a);
  sheet.append(el('div', { className: 'qc-grab' }), tabs, body);
  return { sheet, tabBtns, x, panes };
}

export function createQuestChips({ panel, t, trackEvent, tracker, unread }) {
  document.head.append(el('style', { id: 'quest-chips-css', textContent: QUEST_CHIPS_CSS }));
  const shade = el('div', { id: 'qc-shade' });
  const btnBox = el('div', { id: 'qc-btns' });
  const btns = Object.fromEntries(KEYS.map(k => [k, buildButton(k, t)]));
  btnBox.append(btns.q, btns.a);
  const dim = el('div', { id: 'qc-dim', hidden: true });
  const { sheet, tabBtns, x, panes } = buildSheet(t);
  panes.q.append(...['quest-list', 'quest-foot'].map(id => document.getElementById(id)).filter(Boolean));
  const aff = document.getElementById('aff-track');
  if (aff) panes.a.append(aff);
  panel.append(shade, btnBox, dim, sheet);

  let state = { open: null, opener: null, chips: chipState({ list: [], tracker: null, unread: 0 }), snap: null };
  let glowTimer = 0;

  function paint(chips) {
    btns.q.hidden = !chips.q.show;
    btns.q.style.setProperty('--p', chips.q.pct);
    btns.q.querySelector('.qc-badge').textContent = chips.q.badge;
    btns.a.hidden = !chips.a.show;
    btns.a.style.setProperty('--p', chips.a.pct);
    btns.a.querySelector('.qc-dot').hidden = !chips.a.dot;
    KEYS.forEach(k => { tabBtns[k].hidden = !chips[k].show; });
    panel.classList.toggle('show', chips.q.show || chips.a.show);
  }

  function glow(k) {
    const r = btns[k].getBoundingClientRect();
    panel.style.setProperty('--sx', Math.round(r.left + r.width / 2) + 'px');
    panel.style.setProperty('--sy', Math.round(r.top + r.height / 2) + 'px');
    KEYS.forEach(o => btns[o].classList.toggle('qc-on', o === k));
    panel.classList.add('qc-glow');
    clearTimeout(glowTimer);
    glowTimer = setTimeout(() => {
      panel.classList.remove('qc-glow');
      KEYS.forEach(o => btns[o].classList.remove('qc-on'));
    }, GLOW_MS);
  }

  function place() {
    const tools = ['action-btn', 'tool-btn'].map(visibleRect).filter(r => r && r.left > innerWidth / 2);
    const p = sheetPlacement({
      vw: innerWidth, vh: innerHeight, joy: visibleRect('joy-base'),
      tools: tools.length ? { left: Math.min(...tools.map(r => r.left)) } : null,
    });
    Object.assign(sheet.style, { left: p.left + 'px', width: p.width + 'px', bottom: p.bottom + 'px', maxHeight: p.maxHeight + 'px' });
    dim.style.bottom = p.dimBottom + 'px';
  }

  function show(k) {
    KEYS.forEach(o => {
      tabBtns[o].setAttribute('aria-selected', String(o === k));
      tabBtns[o].tabIndex = o === k ? 0 : -1;
      panes[o].hidden = o !== k;
      btns[o].setAttribute('aria-expanded', String(o === k));
    });
    sheet.setAttribute('aria-labelledby', `qc-tab-${k}`);
  }

  function open(k, opener) {
    const first = !state.open;
    state = { ...state, open: k, opener: opener || state.opener };
    show(k);
    dim.hidden = false;
    sheet.hidden = false;
    panel.classList.add('qc-open');
    document.body.classList.add('quest-sheet-open');
    place();
    if (first) trackEvent?.('quest_chip_open', { tab: k });
    tabBtns[k].focus({ preventScroll: true });
  }

  function close() {
    if (!state.open) return;
    const hadFocus = sheet.contains(document.activeElement);
    const opener = state.opener;
    state = { ...state, open: null, opener: null };
    dim.hidden = true;
    sheet.hidden = true;
    panel.classList.remove('qc-open');
    document.body.classList.remove('quest-sheet-open');
    KEYS.forEach(o => btns[o].setAttribute('aria-expanded', 'false'));
    if (hadFocus && opener && !opener.hidden) opener.focus({ preventScroll: true });
    else if (hadFocus) document.activeElement?.blur?.();
  }

  function sync(list = []) {
    const tv = tracker() || null;
    const chips = chipState({ list, tracker: tv, unread: unread() });
    const snap = snapshot(list, tv);
    const ups = progressed(state.snap, snap);
    state = { ...state, chips, snap };
    paint(chips);
    const tab = sheetTab(state.open, chips);
    if (!tab) close();
    else if (tab !== state.open) open(tab);
    if (ups.length && !state.open) glow(ups[0]);
  }

  KEYS.forEach(k => {
    btns[k].addEventListener('click', (e) => { e.stopPropagation(); state.open === k ? close() : open(k, btns[k]); });
    tabBtns[k].addEventListener('click', (e) => { e.stopPropagation(); open(k); });
  });
  x.addEventListener('click', (e) => { e.stopPropagation(); close(); });
  dim.addEventListener('click', (e) => { e.stopPropagation(); close(); });
  panes.a.addEventListener('click', (e) => { if (e.target.closest('#aff-track')) close(); });
  document.addEventListener('pointerdown', (e) => { if (state.open && e.target.closest?.('#joy-base')) close(); }, true);
  document.addEventListener('keydown', (e) => { if (state.open && e.key === 'Escape') close(); });
  addEventListener('resize', () => { if (state.open) place(); });
  new MutationObserver(() => { if (state.open && !panel.getClientRects().length) close(); })
    .observe(document.body, { attributes: true, attributeFilter: ['class'] });

  return { sync, close, isOpen: () => !!state.open };
}
