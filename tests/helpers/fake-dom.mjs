// Minimal DOM for overlay behaviour tests (node:test has no DOM).
// Only what js/observatory/ui.js + render.js touch: elements, classList, listeners with
// AbortSignal, innerHTML → querySelector for the few tags the result card uses.
class FakeClassList {
  constructor() { this.set = new Set(); }
  add(...c) { c.forEach(x => this.set.add(x)); }
  remove(...c) { c.forEach(x => this.set.delete(x)); }
  contains(c) { return this.set.has(c); }
}

class FakeEventTarget {
  constructor() { this.listeners = []; }
  addEventListener(type, fn, opts = {}) {
    const entry = { type, fn };
    if (opts.signal?.aborted) return;
    opts.signal?.addEventListener?.('abort', () => { this.listeners = this.listeners.filter(l => l !== entry); });
    this.listeners.push(entry);
  }
  removeEventListener(type, fn) { this.listeners = this.listeners.filter(l => l.type !== type || l.fn !== fn); }
  dispatch(type, ev = {}) {
    const e = { type, key: '', repeat: false, preventDefault() {}, ...ev };
    for (const l of [...this.listeners]) if (l.type === type) l.fn(e);
    return e;
  }
}

class FakeElement extends FakeEventTarget {
  constructor(tag) {
    super();
    this.tagName = tag.toUpperCase(); this.children = []; this.parentNode = null;
    this.classList = new FakeClassList(); this.attrs = {}; this.style = {};
    this.textContent = ''; this._html = ''; this.width = 0; this.height = 0; this.id = '';
  }
  set className(v) { this.classList = new FakeClassList(); String(v).split(/\s+/).filter(Boolean).forEach(c => this.classList.add(c)); }
  get className() { return [...this.classList.set].join(' '); }
  set innerHTML(v) { this._html = v; this.children = []; this._parsed = parse(v, this); }
  get innerHTML() { return this._html; }
  setAttribute(k, v) { this.attrs[k] = v; }
  appendChild(c) { c.parentNode?.removeChild?.(c); c.parentNode = this; this.children.push(c); return c; }
  append(...cs) { cs.forEach(c => this.appendChild(c)); }
  removeChild(c) { this.children = this.children.filter(x => x !== c); c.parentNode = null; return c; }
  remove() { this.parentNode?.removeChild(this); }
  contains(el) { for (let e = el; e; e = e.parentNode) if (e === this) return true; return false; }
  querySelector(sel) { return this.querySelectorAll(sel)[0] || null; }
  querySelectorAll(sel) {
    const out = [];
    const match = el => sel.startsWith('.') ? el.classList.contains(sel.slice(1)) : el.tagName === sel.toUpperCase();
    const walk = el => { for (const c of [...el.children, ...(el._parsed || [])]) { if (match(c)) out.push(c); walk(c); } };
    walk(this);
    return out;
  }
  click() { this.dispatch('click'); }
  getContext() { return this.ctx || (this.ctx = canvasContext()); }
}

// innerHTML → flat list of elements for <h2>, <p>, <button>, <div class=…> (text kept, tags stripped).
function parse(html, parent) {
  const out = [];
  const re = /<(h2|p|button|div)([^>]*)>([\s\S]*?)<\/\1>/g;
  let m;
  while ((m = re.exec(html))) {
    const el = new FakeElement(m[1]);
    const cls = /class="([^"]*)"/.exec(m[2]);
    if (cls) el.className = cls[1];
    el.textContent = m[3].replace(/<br\s*\/?>/g, '\n').replace(/<[^>]+>/g, '').trim();
    el.parentNode = parent;
    out.push(el);
  }
  return out;
}

export function canvasContext() {
  const calls = [];
  return new Proxy({ calls }, {
    get: (target, key) => key === 'calls' ? calls : (...args) => {
      calls.push([key, ...args]);
      if (key === 'createLinearGradient' || key === 'createRadialGradient') return { addColorStop() {} };
    },
    set: (target, key, value) => { calls.push(['=' + String(key), value]); return true; },
  });
}

export function fakeDom() {
  let now = 0, rafId = 0;
  const rafs = new Map();
  const head = new FakeElement('head'), body = new FakeElement('body');
  const document = new FakeEventTarget();
  Object.assign(document, {
    head, body, hidden: false,
    createElement: tag => new FakeElement(tag),
    getElementById: id => [...head.children, ...body.children].find(e => e.id === id) || null,
    querySelector: sel => body.querySelector(sel),
  });
  const window = new FakeEventTarget();
  Object.assign(window, { innerWidth: 1280, innerHeight: 800, devicePixelRatio: 1 });
  return {
    document, window,
    performance: { now: () => now },
    requestAnimationFrame: fn => { rafs.set(++rafId, fn); return rafId; },
    cancelAnimationFrame: id => { rafs.delete(id); },
    /** advance the clock and run the frames queued so far */
    tick(ms = 16) { now += ms; const due = [...rafs]; rafs.clear(); for (const [, fn] of due) fn(now); },
    setNow(v) { now = v; },
    pendingFrames: () => rafs.size,
  };
}
