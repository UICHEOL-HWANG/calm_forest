import { MAX_STAR } from './rules.js';
import { HAMMER, beatTimes, newRun, tapRun, expireRun, runDone, struckAny, canCancel, runScore, refundBand } from './hammer.js';
import {
  FORGE_COPY, METER, gameTitle, refundLine, foretell,
} from './copy.js';

const RING_GROW = 1.3;

function starMarks(on, next) {
  return Array.from({ length: MAX_STAR }, (_, i) => {
    const n = i + 1;
    if (n <= on) return '<i class="on">★</i>';
    if (n === next) return '<i class="next">★</i>';
    return '<i>★</i>';
  }).join('');
}

export function starsHtml(on, next = 0) { return `<span class="fg-stars">${starMarks(on, next)}</span>`; }

export function meterHtml(score) {
  const band = refundBand(score);
  return METER.map((m, i) => `<div${i === band ? ' class="on"' : ''}>${m.label}<br>${m.rate}</div>`).join('');
}

export function resultTitle(score) { return FORGE_COPY.resultTitles[refundBand(score)]; }

export function strikesHtml(marks) {
  return marks.map(m => `<i class="sk${m === 2 ? ' p' : m === 1 ? ' g' : m === 0 ? ' m' : ''}"></i>`).join('');
}

function stageHtml(tool, star, ico) {
  return `<div class="fg-panel">
    <div class="fg-top"><span class="fg-title">${gameTitle(tool, star)}</span><button class="fg-quit">${FORGE_COPY.quit}</button></div>
    <span class="fg-count">0/${HAMMER.strikes}</span>
    <div class="fg-ring"><div class="fg-target"></div><div class="fg-shrink"></div></div>
    <span class="fg-pop"></span>
    <div class="fg-anvil"><div class="horn"></div><div class="top"></div><div class="waist"></div><div class="foot"></div><div class="fg-tool">${ico}</div><div class="fg-hammer">🔨</div></div>
    <div class="fg-bottom"><div class="fg-strikes">${strikesHtml(newRun().marks)}</div><div class="fg-hint">${FORGE_COPY.ringHint}</div></div>
  </div>
  <div class="fg-result"></div>`;
}

function resultHtml(ico, marks, score, refund, star) {
  return `<div class="r-ico">${ico}</div>
    <div class="r-title">${resultTitle(score)}</div>
    <div class="fg-strikes">${strikesHtml(marks)}</div>
    <div class="fg-meter">${meterHtml(score)}</div>
    <div class="r-big">${refundLine(refund)}</div>
    <div class="r-sub">${foretell(star)}</div>
    <button class="fg-ok">${FORGE_COPY.ok}</button>`;
}

export function createForgeGame(host, { onAbort, onFinish, onClose, onHit } = {}) {
  let raf = 0, t0 = 0, run = null, cur = null, finished = false;
  const q = sel => host.querySelector(sel);
  const beats = beatTimes();

  const pop = pts => {
    const el = q('.fg-pop');
    el.textContent = FORGE_COPY.judge[pts];
    el.className = `fg-pop ${pts === 2 ? 'p' : pts === 1 ? 'g' : 'm'}`;
    void el.offsetWidth;
    el.classList.add('show');
  };

  const paint = () => {
    q('.fg-strikes').innerHTML = strikesHtml(run.marks);
    q('.fg-count').textContent = `${run.marks.filter(m => m !== null).length}/${HAMMER.strikes}`;
    q('.fg-quit').hidden = !canCancel(run);
  };

  const swing = () => {
    const hm = q('.fg-hammer'), anvil = q('.fg-anvil');
    hm.classList.remove('hit'); anvil.classList.remove('hit');
    void hm.offsetWidth;
    hm.classList.add('hit'); anvil.classList.add('hit');
  };

  const ringAt = now => {
    const ring = q('.fg-shrink');
    const i = run.marks.findIndex(m => m === null);
    if (i < 0) { ring.style.opacity = '0'; return; }
    const p = (now - (beats[i] - HAMMER.beatMs)) / HAMMER.beatMs;
    if (p < 0) { ring.style.opacity = '0'; return; }
    ring.style.opacity = String(Math.min(1, 0.35 + p));
    ring.style.transform = `scale(${Math.max(0.6, 1 + RING_GROW * (1 - p))})`;
  };

  const stop = () => { if (raf) cancelAnimationFrame(raf); raf = 0; };

  const close = () => {
    stop();
    window.removeEventListener('keydown', onKey, true);
    document.removeEventListener('visibilitychange', onVisibility);
    host.removeEventListener('pointerdown', onPointer);
    host.classList.remove('show');
    host.innerHTML = '';
    document.body.classList.remove('mg-open', 'menu-open');
    const tool = cur?.tool;
    cur = null; run = null;
    return tool;
  };

  const finish = () => {
    if (finished) return;
    finished = true;
    stop();
    const score = runScore(run);
    const res = onFinish?.(score) || { refund: 0 };
    const card = q('.fg-result');
    card.innerHTML = resultHtml(cur.ico, run.marks, score, res.refund || 0, cur.star);
    card.classList.add('show');
    q('.fg-quit').hidden = true;
    card.querySelector('.fg-ok').addEventListener('click', () => { const tool = close(); onClose?.(tool); });
  };

  const tick = () => {
    const now = performance.now() - t0;
    const e = expireRun(run, now);
    if (e.missed.length) { run = e.run; pop(0); paint(); }
    ringAt(now);
    if (runDone(run)) { finish(); return; }
    raf = requestAnimationFrame(tick);
  };

  const strike = () => {
    if (!run || finished) return;
    const r = tapRun(run, performance.now() - t0);
    run = r.run;
    if (!r.hit) return;
    swing();
    pop(r.hit.pts);
    onHit?.(r.hit.pts);
    paint();
    if (runDone(run)) finish();
  };

  function onPointer(e) {
    if (e.target.closest('button') || finished) return;
    e.preventDefault();
    strike();
  }

  function onKey(e) {
    if (!cur || finished) return;
    if (e.key === ' ' || e.code === 'Space' || e.key === 'Enter') {
      e.preventDefault(); e.stopImmediatePropagation();
      if (!e.repeat) strike();
    }
  }

  let hiddenAt = 0;
  function onVisibility() {
    if (!cur || finished) return;
    if (document.hidden) { hiddenAt = performance.now(); cancelAnimationFrame(raf); return; }
    if (hiddenAt) { t0 += performance.now() - hiddenAt; hiddenAt = 0; raf = requestAnimationFrame(tick); }
  }

  return {
    open({ tool, star, ico }) {
      cur = { tool, star, ico };
      run = newRun();
      finished = false;
      host.innerHTML = stageHtml(tool, star, ico);
      host.classList.add('show');
      document.body.classList.add('menu-open', 'mg-open');
      q('.fg-quit').addEventListener('click', () => {
        if (!run || !canCancel(run) || struckAny(run)) return;
        onAbort?.();
        const t = close();
        onClose?.(t);
      });
      host.addEventListener('pointerdown', onPointer);
      window.addEventListener('keydown', onKey, true);
      document.addEventListener('visibilitychange', onVisibility);
      hiddenAt = 0;
      t0 = performance.now();
      raf = requestAnimationFrame(tick);
    },
    active() { return !!cur; },
  };
}
