import { FAN, fanLayout, clampFan, pickSlot, stepTool, swipeDir } from './fan-layout.js';

const SEEN_KEY = 'cf_toolfan_seen';
const seen = () => { try { return !!localStorage.getItem(SEEN_KEY); } catch (e) { return false; } };
const markSeen = () => { try { localStorage.setItem(SEEN_KEY, '1'); } catch (e) {} };

export function createToolFan({ Input, t, act, trackEvent }) {
  let tools = [], cur = 0, page = 'farm';
  let fan = null, pts = [], items = [], open = false, hover = -1, held = false;
  let timer = 0, start = null, swiped = false;

  const btn = document.createElement('button');
  btn.id = 'tool-btn'; btn.type = 'button';
  btn.innerHTML = '<span class="tb-ico"></span><span class="tb-arr l">◀</span><span class="tb-arr r">▶</span><span class="tb-tip"></span>';
  const name = document.createElement('div');
  name.id = 'tool-name';

  const order = () => [...tools.keys()].sort((a, b) => (tools[a].grp === 'farm' ? 0 : 1) - (tools[b].grp === 'farm' ? 0 : 1) || a - b);

  function render() {
    const tool = tools[cur];
    const bare = page === 'none';
    btn.querySelector('.tb-ico').innerHTML = bare ? '✋' : (tool?.ico || '');
    btn.dataset.page = page;
    name.textContent = bare ? t('맨손') : t(tool?.name || '');
    btn.querySelector('.tb-tip').textContent = t('탭해서 도구 바꾸기');
    btn.classList.toggle('fresh', !seen());
  }

  function mount(bar) {
    if (!bar || bar.contains(btn)) return;
    bar.appendChild(btn); bar.appendChild(name);
    layout();
  }

  let retry = 0;
  function layout() {
    const a = document.getElementById('action-btn')?.getBoundingClientRect();
    if (!a || !a.width) {
      btn.classList.remove('placed'); name.classList.remove('placed');
      if (!retry) retry = setTimeout(() => { retry = 0; layout(); }, 300);
      return;
    }
    btn.classList.add('placed'); name.classList.add('placed');
    const s = btn.offsetWidth || 58;
    btn.style.left = Math.round(a.left - s - 10) + 'px';
    btn.style.top = Math.round(a.top - s * 0.4) + 'px';
    name.style.left = Math.round(a.left + a.width / 2) + 'px';
    name.style.top = Math.round(Math.min(a.bottom + 3, innerHeight - 24)) + 'px';
    const top = Math.min(btn.getBoundingClientRect().top, a.top);
    document.documentElement.style.setProperty('--hud-bottom', Math.round(innerHeight - top) + 'px');
  }

  function choose(it) {
    if (!it) return;
    if (it.kind === 'bare') Input.setPage?.('none');
    else Input.selectTool(it.i);
    act?.('toolpage');
    markSeen(); render();
    trackEvent?.('tool_wheel_pick', { tool: it.kind === 'bare' ? 'bare' : tools[it.i].id, via: 'fan' });
  }

  function buildFan() {
    const farm = order().filter(i => tools[i].grp === 'farm').map(i => ({ kind: 'tool', i }));
    const out = order().filter(i => tools[i].grp !== 'farm').map(i => ({ kind: 'tool', i }));
    items = [...farm, ...out, { kind: 'bare' }];
    const r = btn.getBoundingClientRect();
    const raw = fanLayout({ cx: r.left + r.width / 2, cy: r.top + r.height / 2, inner: farm.length, outer: out.length + 1 });
    const top = document.getElementById('topright')?.getBoundingClientRect().bottom || 0;
    pts = clampFan(raw, { w: innerWidth, h: innerHeight, pad: 30, top });
    fan = document.createElement('div');
    fan.id = 'tool-fan';
    fan.innerHTML = items.map((it, k) => {
      const tool = it.kind === 'tool' ? tools[it.i] : null;
      const on = it.kind === 'bare' ? page === 'none' : page !== 'none' && it.i === cur;
      const cls = it.kind === 'bare' ? 'bare' : tool.grp === 'farm' ? 'farm' : 'out';
      return `<div class="tf-slot ${cls}${on ? ' on' : ''}" data-k="${k}" style="left:${pts[k].x}px;top:${pts[k].y}px"><span class="tf-ico">${tool ? tool.ico : '✋'}</span><span class="tf-name"></span></div>`;
    }).join('');
    fan.querySelectorAll('.tf-slot').forEach(el => {
      const it = items[+el.dataset.k];
      el.querySelector('.tf-name').textContent = it.kind === 'bare' ? t('맨손') : t(tools[it.i].name);
      el.addEventListener('pointerup', (e) => { if (held) return; e.stopPropagation(); choose(it); close(); });
    });
    fan.addEventListener('pointerup', (e) => { if (!held && e.target === fan) close(); });
    document.body.appendChild(fan);
  }

  function openFan() {
    if (open) return;
    open = true; hover = -1;
    buildFan();
    document.body.classList.add('tool-fan-open');
    trackEvent?.('tool_wheel_open', {});
  }

  function close() {
    open = false; held = false; hover = -1;
    fan?.remove(); fan = null;
    document.body.classList.remove('tool-fan-open');
  }

  function setHover(k) {
    if (k === hover || !fan) return;
    hover = k;
    fan.querySelectorAll('.tf-slot').forEach(el => el.classList.toggle('hover', +el.dataset.k === k));
  }

  btn.addEventListener('pointerdown', (e) => {
    e.preventDefault(); e.stopPropagation();
    if (open) { close(); return; }
    try { btn.setPointerCapture(e.pointerId); } catch (err) {}
    start = { x: e.clientX, y: e.clientY }; swiped = false; held = false;
    clearTimeout(timer);
  });
  btn.addEventListener('pointermove', (e) => {
    if (!start) return;
    if (open && held) { setHover(pickSlot(pts, e.clientX, e.clientY)); return; }
    if (swiped || open) return;
    const dir = swipeDir(e.clientX - start.x, e.clientY - start.y);
    if (!dir) return;
    clearTimeout(timer); swiped = true;
    const next = stepTool(order(), cur, dir);
    Input.selectTool(next);
    act?.('toolpage');
    markSeen(); render();
    trackEvent?.('tool_wheel_pick', { tool: tools[next].id, via: 'swipe' });
  });
  btn.addEventListener('pointerup', () => {
    clearTimeout(timer);
    if (!start) return;
    start = null;
    if (open && held) {
      if (hover >= 0) { choose(items[hover]); close(); }
      held = false;
      return;
    }
    if (!swiped && !open) openFan();
  });
  btn.addEventListener('pointercancel', () => { clearTimeout(timer); start = null; if (held) close(); });
  btn.addEventListener('contextmenu', (e) => e.preventDefault());

  addEventListener('resize', () => { layout(); if (open) close(); });

  return {
    btn,
    mount,
    layout,
    close,
    isOpen: () => open,
    onTool(idx, list, pg) { tools = list; cur = idx; page = pg; render(); },
  };
}
