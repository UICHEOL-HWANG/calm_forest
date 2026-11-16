import { test } from 'node:test';
import assert from 'node:assert/strict';
import { weeklyDefault, claim } from '../js/weekly/rules.js';
import { MARKET_THEMES } from '../js/data/weekly.js';
import { WEEKLY_COPY, fill } from '../js/weekly/copy.js';

const textOf = (e) => (e.textContent || '') + (e.nodeText || '') + e.children.map(textOf).join('');

class El {
  constructor(tag) {
    this.tag = tag;
    this.children = [];
    this.attrs = {};
    this.parent = null;
    this.textContent = '';
    this.style = { setProperty() {} };
    this.cls = new Set();
    this.classList = {
      add: (...c) => c.forEach(x => this.cls.add(x)),
      remove: (...c) => c.forEach(x => this.cls.delete(x)),
      contains: (c) => this.cls.has(c),
    };
  }
  set className(v) { this.cls = new Set(String(v).split(/\s+/).filter(Boolean)); }
  get className() { return [...this.cls].join(' '); }
  append(...kids) {
    for (const k of kids) {
      if (typeof k === 'string') this.children.push({ nodeText: k, children: [] });
      else { k.parent = this; this.children.push(k); }
    }
  }
  replaceChildren(...kids) { this.children = []; this.append(...kids); }
  remove() { if (this.parent) this.parent.children = this.parent.children.filter(c => c !== this); }
  setAttribute(k, v) { this.attrs[k] = v; }
  addEventListener() {}
  focus() {}
  getBoundingClientRect() { return { left: 0, top: 0, width: 0, height: 0 }; }
  all(cls) {
    return this.children.flatMap(c => [...(c.cls?.has(cls) ? [c] : []), ...(c.all ? c.all(cls) : [])]);
  }
  querySelector(sel) {
    const parts = sel.split(' ').map(p => p.slice(1));
    const walk = (node, i) => {
      for (const c of node.all(parts[i])) {
        if (i === parts.length - 1) return c;
        const r = walk(c, i + 1);
        if (r) return r;
      }
      return null;
    };
    return walk(this, 0);
  }
}

const listeners = { add: [], remove: [] };
globalThis.document = { createElement: (t) => new El(t), createElementNS: (_, t) => new El(t), head: new El('head'), body: new El('body') };
globalThis.window = { addEventListener: (...a) => listeners.add.push(a), removeEventListener: (...a) => listeners.remove.push(a) };
globalThis.matchMedia = () => ({ matches: true });

const { showBoard, showMarket, closeWeekly } = await import('../js/weekly/ui.js');

const rootEl = () => document.body.children.find(c => c.id === 'weekly-modal');
const base = { ...weeklyDefault(), week: 2970, quests: ['w_harvest', 'w_fish'], counts: { harvest: 25, fish: 4 }, claimed: [], tickets: 7 };
const capText = fill(WEEKLY_COPY.board.capNo, 15);

function board(initial) {
  let s = initial;
  let calls = 0;
  const onClaim = (id) => { calls++; const r = claim(s, id); if (r.ok) s = r.state; return r; };
  showBoard({ state: () => s, onClaim });
  return { calls: () => calls, state: () => s };
}

test('capped board shows the cap notice on first draw and keeps a focusable claim button', () => {
  board({ ...base, tickets: 15 });
  const root = rootEl();
  assert.ok(textOf(root).includes(capText));
  const btn = root.querySelector('.wk-claim');
  assert.equal(btn.tag, 'button');
  assert.ok(btn.cls.has('dim'));
  assert.equal(typeof btn.onclick, 'function');
  closeWeekly();
});

test('uncapped board shows no cap notice', () => {
  board({ ...base, tickets: 14 });
  assert.ok(!textOf(rootEl()).includes(capText));
  assert.ok(!rootEl().querySelector('.wk-claim').cls.has('dim'));
  closeWeekly();
});

test('pressing claim calls onClaim once and the redraw shows the claimed label', () => {
  const b = board(base);
  rootEl().querySelector('.wk-claim').onclick();
  assert.equal(b.calls(), 1);
  assert.equal(b.state().tickets, 9);
  assert.equal(rootEl().all('wk-claim').length, 0);
  assert.equal(rootEl().all('wk-stamp').length, 1);
  assert.ok(textOf(rootEl().all('wk-stamp')[0]).includes(WEEKLY_COPY.board.claimed));
  closeWeekly();
});

test('pressing claim at the cap goes through onClaim and keeps the notice and the button', () => {
  const b = board({ ...base, tickets: 15 });
  rootEl().querySelector('.wk-claim').onclick();
  assert.equal(b.calls(), 1);
  assert.equal(b.state().tickets, 15);
  assert.ok(textOf(rootEl()).includes(capText));
  assert.equal(rootEl().all('wk-claim').length, 1);
  closeWeekly();
});

test('closed market renders no buy button and the closed notice', () => {
  showMarket({ state: () => base, theme: MARKET_THEMES[0], open: false, isGuest: false, ownsDecor: () => false, onBuy: () => ({ ok: false }) });
  const root = rootEl();
  assert.equal(root.all('wk-buy').length, 0);
  assert.ok(textOf(root).includes(WEEKLY_COPY.market.closed));
  assert.ok(!textOf(root).includes(WEEKLY_COPY.market.sub));
  closeWeekly();
});

test('a market that closes while the dialog is open redraws as closed after a refused buy', () => {
  let open = true;
  showMarket({ state: () => base, theme: MARKET_THEMES[0], isOpen: () => open, isGuest: false, ownsDecor: () => false, onBuy: () => (open ? { ok: true } : { ok: false, reason: 'closed' }) });
  const buys = rootEl().all('wk-buy');
  assert.equal(buys.length, 3);
  open = false;
  buys[0].onclick();
  const root = rootEl();
  assert.equal(root.all('wk-buy').length, 0);
  assert.ok(textOf(root).includes(WEEKLY_COPY.market.closed));
  assert.ok(!textOf(root).includes(WEEKLY_COPY.market.sub));
  closeWeekly();
});

test('open market renders buy buttons that call onBuy', () => {
  let bought = null;
  showMarket({ state: () => base, theme: MARKET_THEMES[0], open: true, isGuest: false, ownsDecor: () => false, onBuy: (item) => { bought = item.id; return { ok: true }; } });
  const buys = rootEl().all('wk-buy');
  assert.equal(buys.length, 3);
  buys[0].onclick();
  assert.equal(bought, 'teadeck');
  closeWeekly();
});

test('an item with a thumbnail shows an image tile and one without falls back to the emoji', () => {
  const thumbs = { teadeck: 'data:image/png;base64,AAAA' };
  showMarket({ state: () => base, theme: MARKET_THEMES[0], open: true, isGuest: false, ownsDecor: () => false, hasArt: () => true, thumbs, onBuy: () => ({ ok: true }) });
  const tiles = rootEl().all('wk-thumb');
  assert.equal(tiles.length, 3);
  const [hero, ...props] = tiles;
  assert.equal(hero.children.length, 1);
  assert.equal(hero.children[0].tag, 'img');
  assert.equal(hero.children[0].src, thumbs.teadeck);
  assert.equal(hero.textContent, '');
  for (const p of props) {
    assert.equal(p.children.length, 0);
    assert.ok(p.textContent.length > 0);
  }
  closeWeekly();
});

test('a row with no art renders no buy button and no short or owned stamp', () => {
  showMarket({ state: () => base, theme: MARKET_THEMES[0], open: true, isGuest: false, ownsDecor: () => false, hasArt: (id) => id === 'teadeck', onBuy: () => ({ ok: true }) });
  assert.equal(rootEl().all('wk-buy').length, 1);
  assert.equal(rootEl().all('wk-short').length, 0);
  closeWeekly();
});

test('closing the dialog removes the Escape listener it added', () => {
  const adds0 = listeners.add.length;
  const removes0 = listeners.remove.length;
  board(base);
  rootEl().querySelector('.wk-claim').onclick();
  assert.equal(listeners.add.length - adds0, 1);
  const [type, handler, capture] = listeners.add.at(-1);
  assert.equal(type, 'keydown');
  assert.equal(capture, true);
  handler({ key: 'Escape', preventDefault() {}, stopPropagation() {} });
  assert.equal(listeners.remove.length - removes0, 1);
  assert.equal(listeners.remove.at(-1)[1], handler);
  assert.ok(!rootEl().classList.contains('show'));
});

test('owned item shows where it waits and the guide button closes the market and asks for the way', () => {
  let asked = null;
  const theme = MARKET_THEMES[0];
  showMarket({ state: () => base, theme, open: true, isGuest: false, ownsDecor: (id) => id === theme.hero.id, whereOf: () => ({ key: 'outdoor', guide: 'bench' }), onGuide: (g) => { asked = g; }, onBuy: () => ({ ok: true }) });
  const root = rootEl();
  assert.ok(textOf(root).includes(WEEKLY_COPY.where.outdoor));
  const btn = root.querySelector('.wk-where').children.find(c => c.tag === 'button');
  assert.equal(btn.textContent, WEEKLY_COPY.where.go);
  btn.onclick();
  assert.equal(asked, 'bench');
  assert.ok(!rootEl().classList.contains('show'));
});

test('houseless indoor line has no guide button', () => {
  const theme = MARKET_THEMES[0];
  showMarket({ state: () => base, theme, open: true, isGuest: false, ownsDecor: (id) => id === theme.props[0].id, whereOf: () => ({ key: 'indoorNoHouse', guide: null }), onGuide: () => {}, onBuy: () => ({ ok: true }) });
  assert.ok(textOf(rootEl()).includes(WEEKLY_COPY.where.indoorNoHouse));
  assert.equal(rootEl().querySelector('.wk-where').children.find(c => c.tag === 'button'), undefined);
  closeWeekly();
});
