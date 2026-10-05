// =============================================================
//  calm forest · 🔭 천문대 렌즈 뷰
//  ------------------------------------------------------------
//  sims/observatory-eyepiece-sim.html?v=d 의 혜성+링 시안을 실제
//  미니게임 오버레이로 옮긴다. 보상·저장은 다음 단계에서 game.js 와 묶는다.
// =============================================================
import { buildChart, judgeTap, summarize } from './rhythm.js';
import { COPY } from './copy.js';
import { t } from '../i18n.js';
import { Input, trackDiffAbandon } from '../game.js';

import { ensureStyle, layout, drawLens, drawConstellation, drawComet, drawJudge, drawHud } from './render.js';

let view = null;

function showResult(state) {
  if (state.resultShown) return;
  state.resultShown = true;
  const summary = summarize(state.judges);
  // onResult pays out (game side) and reports what was actually given — never show a reward that wasn't paid.
  const run = { judges: [...state.judges], offsets: [...state.offsets], durationMs: performance.now() - state.startAt };
  const coins = state.onResult?.(summary, run)?.coins || 0;
  const reward = coins > 0 ? `<br>${t(COPY.reward)} +${coins}` : '';

  const card = document.createElement('div');
  card.className = 'observatory-card';
  card.innerHTML = `
    <h2>${t(summary.success ? COPY.complete : COPY.fail)}</h2>
    <div class="score">${summary.score}</div>
    <p>${t(COPY.result)} · ${t(COPY.perfect)} ${summary.perfect} · ${t(COPY.good)} ${summary.good} · ${t(COPY.miss)} ${summary.miss}${reward}</p>
    <button type="button">${t(COPY.close)}</button>
  `;
  card.querySelector('button').addEventListener('click', () => closeStarView('complete'), { signal: state.controller.signal });
  state.layer.appendChild(card);
}

function tap(state) {
  Input.setAnalog(0, 0);
  missExpired(state, performance.now() - state.startAt);
  if (state.resultShown) return;
  const note = state.chart[state.judges.length];
  if (!note) return;
  const offset = performance.now() - state.startAt - note.hitMs;
  const judge = judgeTap(offset, state.ease);
  if (judge === 'early') return;
  state.judges.push(judge);
  state.offsets.push(Math.round(offset));   // 탭한 노트만(만료 miss 는 오프셋이 없다)
  state.flash = { judge, until: performance.now() + 620 };
  if (state.judges.length >= state.chart.length) showResult(state);
}

function missExpired(state, elapsed) {
  if (state.resultShown) return;
  while (state.judges.length < state.chart.length) {
    const note = state.chart[state.judges.length];
    if (judgeTap(elapsed - note.hitMs, state.ease) !== 'miss') break;
    state.judges.push('miss');
    state.flash = { judge: 'miss', until: performance.now() + 620 };
  }
  if (state.judges.length >= state.chart.length) showResult(state);
}

function drawFrame(state) {
  const L = layout(state);
  if (state.canvas.width !== Math.round(L.W * state.dpr) || state.canvas.height !== Math.round(L.H * state.dpr)) {
    state.canvas.width = Math.round(L.W * state.dpr);
    state.canvas.height = Math.round(L.H * state.dpr);
    state.g.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    state.cacheKey = '';
  }
  const elapsed = performance.now() - state.startAt;
  missExpired(state, elapsed);
  drawLens(state, L);
  const pts = drawConstellation(state, L, elapsed);
  drawComet(state, L, pts, elapsed);
  drawJudge(state, L, pts);
  drawHud(state, L);
  // 결과 카드가 뜨면 마지막 판(이은 선)을 한 번 그려 두고 멈춘다 — 카드 뒤에서 계속 돌 이유가 없다
  state.raf = state.closed || state.resultShown ? 0 : requestAnimationFrame(() => drawFrame(state));
}

function abandon(state, reason) {
  if (state.resultShown || state.closed || !state.diff) return;   // 굴린 난이도가 없으면 기록하지 않는다(가짜 arm 금지)
  trackDiffAbandon('star', state.diff, reason, { constellation: 'big_dipper' });
}

function closeStarView(reason = 'close') {
  const state = view;
  if (!state || state.closed) return;
  if (reason !== 'complete') abandon(state, reason);
  state.closed = true;
  if (state.raf) cancelAnimationFrame(state.raf);
  state.controller.abort();
  document.body.classList.remove('menu-open', 'mg-open');
  state.layer.remove();
  view = null;
  state.onClose?.();
}

export async function openStarView(opts = {}) {
  if (view) closeStarView('replace');
  ensureStyle();
  Input.setAnalog(0, 0);
  document.body.classList.add('menu-open', 'mg-open');

  const layer = document.createElement('div');
  layer.className = 'observatory-layer';
  const canvas = document.createElement('canvas');
  const close = document.createElement('button');
  close.className = 'observatory-close';
  close.type = 'button';
  close.textContent = '✕';
  close.setAttribute('aria-label', t(COPY.close));
  layer.append(canvas, close);
  document.body.appendChild(layer);

  const controller = new AbortController();
  const state = {
    layer,
    canvas,
    controller,
    g: canvas.getContext('2d'),
    dpr: Math.min(window.devicePixelRatio || 1, 2),
    ease: opts.ease || 1,
    diff: opts.diff || null,
    chart: buildChart(opts.ease || 1),
    judges: [],
    offsets: [],
    flash: null,
    raf: 0,
    startAt: performance.now(),
    resultShown: false,
    closed: false,
    onClose: opts.onClose,
    onResult: opts.onResult,
    bgCanvas: null,
    rimCanvas: null,
    cacheKey: '',
  };
  view = state;

  canvas.addEventListener('pointerdown', () => tap(state), { signal: controller.signal });
  close.addEventListener('click', () => closeStarView('close'), { signal: controller.signal });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeStarView('esc');
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); if (!e.repeat) tap(state); }
  }, { signal: controller.signal });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) closeStarView('hidden');
  }, { signal: controller.signal });

  state.raf = requestAnimationFrame(() => drawFrame(state));
  return {
    close: () => closeStarView('api'),
  };
}

export function closeObservatoryStarView() {
  closeStarView('api');
}
