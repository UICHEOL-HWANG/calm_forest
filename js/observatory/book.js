// =============================================================
//  🔭 별자리 수첩 — 망원경을 들여다보면 먼저 뜨는 고르기 화면(도감 겸용)
//  ------------------------------------------------------------
//  시안 C 확정(2026-10-05, sims/constellation-sim.html?v=c). 카드를 누르면 렌즈 뷰가 열린다.
//  잠긴 별자리는 흐린 실루엣 + 🔒 — 다음 목표가 보이게. 해금은 cleared 로 계산한다.
// =============================================================
import { CONSTELLATIONS, fitter, unlockedIds } from './constellations.js';
import { COPY, fill, starCopy } from './copy.js';
import { ensureStyle } from './render.js';
import { t } from '../i18n.js';

let book = null;

/** 카드 안 작은 별자리 그림 — 깬 것은 금빛, 열린 것은 점선, 잠긴 것은 회색 실루엣 */
function paint(canvas, c, mode) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = canvas.clientWidth || 150, h = canvas.clientHeight || 100;
  canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
  const g = canvas.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const r = Math.min(w / 1.7, h / 1.5), f = fitter(c, r);
  const pts = c.stars.map((_, i) => { const [x, y] = f(i); return [w / 2 + x, h / 2 + y]; });
  const lit = mode === 'cleared', locked = mode === 'locked';
  g.lineCap = 'round';
  g.strokeStyle = locked ? 'rgba(107,112,136,.35)' : lit ? 'rgba(243,210,122,.9)' : 'rgba(233,236,255,.35)';
  g.lineWidth = Math.max(1, r * 0.025) * (lit ? 1.4 : 1);
  g.setLineDash(lit || locked ? [] : [r * 0.05, r * 0.05]);
  g.beginPath();
  c.order.forEach((k, i) => (i ? g.lineTo : g.moveTo).call(g, ...pts[k]));
  g.stroke();
  g.setLineDash([]);
  g.fillStyle = locked ? 'rgba(107,112,136,.7)' : lit ? '#fff6d6' : 'rgba(220,228,255,.9)';
  for (const [x, y] of pts) { g.beginPath(); g.arc(x, y, Math.max(1.6, r * 0.035), 0, Math.PI * 2); g.fill(); }
}

function cardHtml(c, mode, best) {
  const sc = starCopy(c.id);
  if (mode === 'locked') return `<canvas></canvas><b>🔒 ???</b><small>${t(COPY.bookLocked)}</small>`;
  const sub = mode === 'cleared' ? t(fill(COPY.bookBest, best || 0)) : `${'★'.repeat(c.level || 1)} · ${t(COPY.bookNew)}`;
  return `<canvas></canvas><b>${t(sc.name)}</b><small>${sub}</small>`;
}

export function closeStarBook() {
  if (!book) return;
  const b = book;
  book = null;
  b.controller.abort();
  b.layer.remove();
  b.onClose?.();
}

/** opts: { cleared, best, fresh(방금 열린 id), onPick(c), onClose() } — 고르면 수첩은 조용히 닫히고(onClose 안 부름) onPick 만 */
export function openStarBook({ cleared = {}, best = {}, fresh = null, onPick, onClose } = {}) {
  if (book) closeStarBook();
  ensureStyle();
  const open = new Set(unlockedIds(cleared));
  const done = CONSTELLATIONS.filter(c => cleared[c.id]).length;

  const layer = document.createElement('div');
  layer.className = 'observatory-layer observatory-book';
  layer.innerHTML = `<h2>${t(COPY.bookTitle)}</h2>
    <p>${t(fill(COPY.bookProgress, done, CONSTELLATIONS.length))}</p><div class="grid"></div>`;
  const close = document.createElement('button');
  close.className = 'observatory-close';
  close.type = 'button';
  close.textContent = '✕';
  close.setAttribute('aria-label', t(COPY.close));
  layer.append(close);
  document.body.appendChild(layer);

  const controller = new AbortController();
  book = { layer, controller, onClose };
  const grid = layer.querySelector('.grid');
  for (const c of CONSTELLATIONS) {
    const mode = !open.has(c.id) ? 'locked' : cleared[c.id] ? 'cleared' : 'open';
    const card = document.createElement('button');
    card.type = 'button';
    card.className = c.id === fresh ? 'cst fresh' : 'cst';   // ✨ 방금 열린 별자리
    card.dataset.id = c.id;
    if (mode === 'locked') card.disabled = true;
    card.innerHTML = cardHtml(c, mode, best[c.id]);
    grid.appendChild(card);
    paint(card.querySelector('canvas'), c, mode);
    if (mode !== 'locked') {
      card.addEventListener('click', () => {
        if (!book) return;
        const b = book;
        book = null;              // 고르기는 '닫기'가 아니다 — onClose(자세 풀기)를 부르지 않는다
        b.controller.abort();
        b.layer.remove();
        onPick?.(c);
      }, { signal: controller.signal });
    }
  }
  close.addEventListener('click', () => closeStarBook(), { signal: controller.signal });
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeStarBook(); }, { signal: controller.signal });
  return { close: closeStarBook };
}
