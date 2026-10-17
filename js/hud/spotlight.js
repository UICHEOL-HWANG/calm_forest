import { holeRect, bars, bubblePos } from './spot-geom.js';

const CSS = `
#spot-layer { position: fixed; inset: 0; z-index: 48; pointer-events: none; display: none; }
#spot-layer.on { display: block; }
body.spot-on #coach { visibility: hidden; }
#spot-layer .sp-bar { position: absolute; background: rgba(20,16,10,.66); pointer-events: auto; }
#spot-layer.dim-only .sp-bar { background: rgba(20,16,10,.38); }
#spot-layer .sp-catch { position: absolute; pointer-events: auto; background: transparent; }
#spot-layer .sp-ring { position: absolute; border-radius: 18px; border: 3px solid #ffd257; box-shadow: 0 0 0 6px rgba(255,210,87,.35); pointer-events: none;
  animation: spring 1.2s ease-in-out infinite; }
@keyframes spring { 0%, 100% { box-shadow: 0 0 0 4px rgba(255,210,87,.3); } 50% { box-shadow: 0 0 0 10px rgba(255,210,87,.12); } }
#spot-layer .sp-hand { position: absolute; font-size: 40px; line-height: 1; pointer-events: none; filter: drop-shadow(0 2px 3px rgba(0,0,0,.55)); }
#spot-layer .sp-hand[data-h="tap"], #spot-layer .sp-hand[data-h="click"] { animation: sptap 1s ease-in-out infinite; }
#spot-layer .sp-hand[data-h="hold"] { animation: sphold 1.8s ease-in-out infinite; }
#spot-layer .sp-hand[data-h="drag"] { animation: spdrag 1.6s ease-in-out infinite; }
@keyframes sptap { 0%, 100% { transform: translate(0, 0) scale(1); } 45% { transform: translate(0, 6px) scale(.88); } }
@keyframes sphold { 0% { transform: translate(0, 0) scale(1); } 25% { transform: translate(0, 6px) scale(.86); } 70% { transform: translate(-46px, -30px) scale(.86); } 100% { transform: translate(-46px, -30px) scale(1); opacity: .2; } }
@keyframes spdrag { 0%, 100% { transform: translate(0, 0); } 25% { transform: translate(22px, -18px); } 50% { transform: translate(0, -30px); } 75% { transform: translate(-22px, -18px); } }
#spot-layer .sp-bub { position: absolute; max-width: min(300px, calc(100vw - 24px)); background: #ffe68a; color: #5b4300; font-weight: 800; font-size: 15px;
  line-height: 1.4; border-radius: 14px; padding: 10px 14px; box-shadow: 0 6px 18px rgba(0,0,0,.3); pointer-events: none; }
#spot-layer .sp-keys { display: flex; gap: 6px; margin-top: 8px; flex-wrap: wrap; }
#spot-layer .sp-keys:empty { display: none; }
#spot-layer .sp-keys kbd { min-width: 30px; padding: 5px 8px; border-radius: 8px; background: #fff; color: #3d3426; font: 800 14px/1 inherit; text-align: center;
  box-shadow: 0 3px 0 #c9b98f; animation: spkey 1s ease-in-out infinite; }
@keyframes spkey { 0%, 100% { transform: none; } 50% { transform: translateY(2px); box-shadow: 0 1px 0 #c9b98f; } }
#spot-layer .sp-dots { position: absolute; top: calc(10px + var(--top-inset, 0px)); left: 50%; transform: translateX(-50%); display: flex; gap: 6px; pointer-events: none; }
#spot-layer .sp-dots i { width: 8px; height: 8px; border-radius: 50%; background: rgba(255,255,255,.35); }
#spot-layer .sp-dots i.on { background: #fff; }
#spot-layer .sp-next { position: absolute; display: none; pointer-events: auto; border: none; border-radius: 10px; padding: 6px 12px; background: rgba(255,255,255,.92);
  color: #3d3426; font: 800 13px/1 inherit; cursor: pointer; }
#spot-layer .sp-next.show { display: block; }
`;

const STUCK_MS = 20000;
const PAD = 8;
const GONE_MS = 3000;

export function createSpotlight({ t, trackEvent, blocked = () => false }) {
  if (!document.getElementById('spot-css')) {
    const st = document.createElement('style'); st.id = 'spot-css'; st.textContent = CSS; document.head.appendChild(st);
  }
  const layer = document.createElement('div'); layer.id = 'spot-layer';
  layer.innerHTML = '<div class="sp-bar"></div><div class="sp-bar"></div><div class="sp-bar"></div><div class="sp-bar"></div>'
    + '<div class="sp-catch"></div><div class="sp-ring"></div><div class="sp-hand"></div><div class="sp-bub"><span class="sp-txt"></span><div class="sp-keys"></div></div>'
    + '<div class="sp-dots"></div><button type="button" class="sp-next"></button>';
  document.body.appendChild(layer);
  const $ = (s) => layer.querySelector(s);
  const barEls = [...layer.querySelectorAll('.sp-bar')];

  let run = null;
  const stack = [];
  let raf = 0;

  function advance(via) {
    if (!run) return;
    const s = run.steps[run.i];
    trackEvent?.('tutorial_spot', { step: s.key, ms: Date.now() - run.t, via });
    run.onStep?.(s, run.i);
    run.i += 1; run.t = Date.now(); run.stuck = false; run.gone = 0;
    if (run.i >= run.steps.length) return finish();
    paint();
  }

  function finish() {
    const done = run;
    trackEvent?.('tutorial_spot_end', { kind: done.kind, ms: Date.now() - done.t0 });
    run = stack.pop() || null;
    if (run) { run.t = Date.now(); run.stuck = false; run.gone = 0; paint(); } else hide();
    done.resolve?.();
  }

  function hide() {
    layer.classList.remove('on'); document.body.classList.remove('spot-on');
    cancelAnimationFrame(raf); raf = 0;
  }

  function paint() {
    if (!run) return;
    const s = run.steps[run.i];
    $('.sp-txt').textContent = t(s.text);
    $('.sp-keys').innerHTML = '';
    (s.keys || []).forEach((k) => { const kb = document.createElement('kbd'); kb.textContent = k; $('.sp-keys').appendChild(kb); });
    const hand = $('.sp-hand');
    hand.dataset.h = s.hand;
    hand.textContent = s.hand === 'click' ? '🖱️' : s.hand === 'key' ? '' : '👆';
    $('.sp-dots').innerHTML = run.steps.map((_, k) => `<i class="${k <= run.i ? 'on' : ''}"></i>`).join('');
    const nx = $('.sp-next'); nx.textContent = t('다음 ›'); nx.classList.remove('show');
    $('.sp-catch').style.display = s.done === 'tap' ? 'block' : 'none';
    if (!raf) raf = requestAnimationFrame(loop);
  }

  function place(el, r) { Object.assign(el.style, { left: r.l + 'px', top: r.t + 'px', width: r.w + 'px', height: r.h + 'px' }); }

  function loop() {
    raf = 0;
    if (!run) return;
    const s = run.steps[run.i];
    if (!run.stuck && Date.now() - run.t > STUCK_MS) { run.stuck = true; $('.sp-next').classList.add('show'); }
    if (s.done.startsWith('open:') && document.getElementById(s.done.slice(5))?.classList.contains('show')) { advance('act'); return; }
    if (s.done === 'menu' && document.getElementById('menu-sheet')?.classList.contains('show')) { advance('act'); return; }
    if (run.blocked?.()) { finish(); return; }
    const isBlocked = run.blocked ? false : blocked();
    const el = s.target ? document.querySelector(s.target) : null;
    const r = el?.getBoundingClientRect();
    const visible = !s.target || (r && r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden');
    if (!isBlocked && !visible) {
      run.gone = run.gone || Date.now();
      if (Date.now() - run.gone > GONE_MS) { advance('timeout'); return; }
    } else run.gone = 0;
    const show = !isBlocked && visible;
    layer.classList.toggle('on', show);
    document.body.classList.toggle('spot-on', show);
    if (show) {
      const vw = innerWidth, vh = innerHeight;
      const h = s.target ? holeRect(r, PAD, vw, vh) : { l: vw / 2, t: vh / 2, r: vw / 2, b: vh / 2 };
      layer.classList.toggle('dim-only', !s.target);
      bars(h, vw, vh).forEach((b, k) => place(barEls[k], b));
      place($('.sp-catch'), { l: h.l, t: h.t, w: h.r - h.l, h: h.b - h.t });
      const ring = $('.sp-ring');
      ring.style.display = s.target ? 'block' : 'none';
      place(ring, { l: h.l - 3, t: h.t - 3, w: h.r - h.l, h: h.b - h.t });
      const hand = $('.sp-hand');
      hand.style.display = s.hand === 'key' ? 'none' : 'block';
      hand.style.left = Math.round((h.l + h.r) / 2 - 10) + 'px';
      hand.style.top = Math.round((h.t + h.b) / 2 - 4) + 'px';
      const bub = $('.sp-bub');
      const bw = bub.offsetWidth || 240, bh = bub.offsetHeight || 48;
      const p = s.target ? bubblePos(h, bw, bh, vw, vh, 14) : { x: (vw - bw) / 2, y: vh * 0.62, side: 'below' };
      bub.style.left = Math.round(p.x) + 'px'; bub.style.top = Math.round(p.y) + 'px';
      const nx = $('.sp-next');
      nx.style.left = Math.round(p.x) + 'px'; nx.style.top = Math.round(p.side === 'above' ? p.y - 40 : p.y + bh + 8) + 'px';
    }
    raf = requestAnimationFrame(loop);
  }

  const onTap = (e) => {
    e.preventDefault(); e.stopPropagation();
    if (run && run.steps[run.i].done === 'tap') advance('click');
  };
  barEls.forEach((b) => b.addEventListener('pointerdown', onTap));
  $('.sp-catch').addEventListener('pointerdown', onTap);
  $('.sp-next').addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); advance('timeout'); });
  addEventListener('pointerdown', (e) => {
    if (!run || !layer.classList.contains('on')) return;
    const s = run.steps[run.i];
    if (s.done !== 'click' || !s.target) return;
    const el = document.querySelector(s.target);
    if (el && el.contains(e.target)) setTimeout(() => advance('click'), 0);
  }, true);

  return {
    run(steps, { kind, startAt = 0, onStep, blocked: blk } = {}) {
      const list = steps.slice(startAt);
      if (!list.length) return Promise.resolve();
      return new Promise((resolve) => {
        if (run) stack.push(run);
        run = { steps: list, i: 0, kind, onStep, blocked: blk, resolve, t: Date.now(), t0: Date.now(), stuck: false, gone: 0 };
        paint();
      });
    },
    notify(sig) {
      if (!run) return;
      const s = run.steps[run.i];
      if (s.done === sig) advance('act');
    },
    active: () => !!run,
    kind: () => run?.kind || null,
    stop() { [run, ...stack].forEach((r) => r?.resolve?.()); stack.length = 0; run = null; hide(); },
  };
}
