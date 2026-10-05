import { BY_ID, fitter } from './constellations.js';
import { COPY, starCopy } from './copy.js';
import { t } from '../i18n.js';

const GOLD = '#f3d27a';
const GOLD2 = '#d9b45a';
const NAVY = '#1a2552';
const INK = '#e9ecff';
const MISS_DOT = '#6b7088';   // 놓친 노트 — 회색(이은 금빛·남은 흐린 점과 구분)
const FAMILY = '-apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", sans-serif';


const clamp01 = (v) => Math.max(0, Math.min(1, v));
const easeOut = (v) => 1 - Math.pow(1 - clamp01(v), 3);

function rnd(seed) {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

export function ensureStyle() {
  if (document.getElementById('observatory-style')) return;
  const style = document.createElement('style');
  style.id = 'observatory-style';
  style.textContent = `
.observatory-layer{position:fixed;inset:0;z-index:3000;background:#05070f;color:${INK};overflow:hidden;touch-action:none}
.observatory-layer canvas{position:absolute;inset:0;width:100%;height:100%;display:block}
.observatory-close{position:absolute;right:clamp(14px,4vw,36px);top:calc(clamp(14px,4vw,34px) + var(--top-inset, 0px));width:42px;height:42px;border:1px solid rgba(233,236,255,.22);border-radius:21px;background:rgba(255,255,255,.12);color:${INK};font:700 18px ${FAMILY};cursor:pointer}
.observatory-card{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(360px,calc(100vw - 44px));padding:20px 18px 16px;border:1px solid rgba(243,210,122,.36);border-radius:8px;background:rgba(10,15,42,.92);box-shadow:0 20px 80px rgba(0,0,0,.45),0 0 34px rgba(243,210,122,.15);text-align:center}
.observatory-card h2{margin:0 0 8px;font:800 23px/1.2 ${FAMILY};letter-spacing:0;color:${INK}}
.observatory-card p{margin:0 0 14px;font:600 14px/1.55 ${FAMILY};color:rgba(233,236,255,.74)}
.observatory-card .score{margin:0 0 15px;font:800 30px/1 ${FAMILY};color:${GOLD}}
.observatory-card button{height:38px;padding:0 16px;border-radius:8px;border:1px solid rgba(243,210,122,.45);background:${GOLD};color:#18204a;font:800 14px ${FAMILY};cursor:pointer}
.observatory-book{display:flex;flex-direction:column;align-items:center;justify-content:center;justify-content:safe center;padding:calc(16px + var(--top-inset, 0px)) 16px 16px;overflow-y:auto;touch-action:pan-y}
.observatory-book h2{margin:0 0 4px;font:800 21px ${FAMILY};color:${INK}}
.observatory-book>p{margin:0 0 14px;font:500 13px ${FAMILY};color:rgba(233,236,255,.62);text-align:center}
.observatory-book .grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;width:min(560px,100%)}
.observatory-book .cst{border-radius:16px;padding:10px 8px;background:rgba(255,255,255,.06);border:1px solid rgba(233,236,255,.14);color:${INK};text-align:center;font-family:${FAMILY};cursor:pointer}
.observatory-book .cst:hover:not([disabled]),.observatory-book .cst:focus-visible{border-color:${GOLD}}
.observatory-book .cst[disabled]{opacity:.5;cursor:default}
.observatory-book .cst.fresh{border-color:${GOLD};box-shadow:0 0 22px rgba(243,210,122,.35)}
.observatory-layer.observatory-book canvas{position:static;inset:auto;width:100%;height:auto;aspect-ratio:1.5}
.observatory-book .cst b{display:block;margin-top:4px;font:700 13px ${FAMILY}}
.observatory-book .cst small{color:rgba(233,236,255,.62);font:600 11px ${FAMILY}}
@media (max-width:520px){.observatory-book .grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-height:560px){.observatory-book .grid{grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.observatory-layer.observatory-book canvas{aspect-ratio:2.4}.observatory-book h2{font-size:18px}.observatory-book>p{margin-bottom:8px}}
`;
  document.head.appendChild(style);
}

// 📱 토스 미니앱은 상단에 시스템 버튼(··· ✕)이 떠 있다 — index.html 의 --top-inset(= safe-area + --toss-reserve 52px)
//    만큼 캔버스 HUD 를 내린다. CSS 변수라 한 번 재서 캐시한다(프레임마다 재면 레이아웃 계산이 돈다).
let cachedTopInset = null;
function topInset() {
  if (cachedTopInset !== null) return cachedTopInset;
  try {
    const probe = document.createElement('div');
    probe.style.cssText = 'position:fixed;visibility:hidden;height:var(--top-inset, 0px)';
    document.body.appendChild(probe);
    cachedTopInset = probe.getBoundingClientRect().height || 0;
    probe.remove();
  } catch { cachedTopInset = 0; }
  return cachedTopInset;
}

export function layout(state) {
  const W = window.innerWidth || 1;
  const H = window.innerHeight || 1;
  const portrait = H > W;
  const r = portrait ? Math.min(W * 0.44, H * 0.27) : Math.min(H * 0.4, W * 0.3);
  const cx = W / 2;
  const cy = portrait ? H * 0.45 : H * 0.5;
  return { W, H, portrait, r, cx, cy, dpr: state.dpr, top: topInset() };
}

const lensC = state => state.c || BY_ID.big_dipper;
function starPoints(state, L) {
  const c = lensC(state), f = fitter(c, L.r);   // bbox 중심 맞춤 — 북두칠성은 옛 (x+0.6, y+0.25)·0.43r 와 같다
  return c.stars.map((_, i) => { const [x, y] = f(i); return [L.cx + x, L.cy + y]; });
}

function glowDot(g, x, y, rad, color, blur) {
  g.save();
  g.shadowColor = color;
  g.shadowBlur = blur;
  g.fillStyle = color;
  g.beginPath();
  g.arc(x, y, rad, 0, Math.PI * 2);
  g.fill();
  g.restore();
}

function sparkle(g, x, y, s, color) {
  g.save();
  g.translate(x, y);
  g.fillStyle = color;
  g.shadowColor = color;
  g.shadowBlur = s * 2;
  g.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4;
    const rr = i % 2 ? s * 0.28 : s;
    g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  g.closePath();
  g.fill();
  g.restore();
}

function makeCache(state, L) {
  const key = `${Math.round(L.W)}x${Math.round(L.H)}:${Math.round(L.r)}:${state.dpr}`;
  if (state.cacheKey === key) return;
  state.cacheKey = key;

  const w = Math.max(1, Math.ceil(L.W * state.dpr));
  const h = Math.max(1, Math.ceil(L.H * state.dpr));
  const bgCanvas = document.createElement('canvas');
  const rimCanvas = document.createElement('canvas');
  bgCanvas.width = rimCanvas.width = w;
  bgCanvas.height = rimCanvas.height = h;
  const bg = bgCanvas.getContext('2d');
  const rim = rimCanvas.getContext('2d');
  bg.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
  rim.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);

  bg.fillStyle = '#05070f';
  bg.fillRect(0, 0, L.W, L.H);
  bg.save();
  bg.beginPath();
  bg.arc(L.cx, L.cy, L.r, 0, Math.PI * 2);
  bg.clip();
  const sky = bg.createRadialGradient(L.cx, L.cy - L.r * 0.2, L.r * 0.1, L.cx, L.cy, L.r);
  sky.addColorStop(0, '#24336e');
  sky.addColorStop(0.7, NAVY);
  sky.addColorStop(1, '#0a0f2a');
  bg.fillStyle = sky;
  bg.fillRect(L.cx - L.r, L.cy - L.r, L.r * 2, L.r * 2);
  bg.save();
  bg.translate(L.cx, L.cy);
  bg.rotate(-0.5);
  const mw = bg.createLinearGradient(0, -L.r * 0.35, 0, L.r * 0.35);
  mw.addColorStop(0, 'rgba(150,170,255,0)');
  mw.addColorStop(0.5, 'rgba(150,170,255,0.10)');
  mw.addColorStop(1, 'rgba(150,170,255,0)');
  bg.fillStyle = mw;
  bg.fillRect(-L.r, -L.r * 0.35, L.r * 2, L.r * 0.7);
  bg.restore();
  const R = rnd(9);
  for (let i = 0; i < 220; i++) {
    const a = R() * Math.PI * 2;
    const d = Math.sqrt(R()) * L.r;
    bg.globalAlpha = 0.25 + R() * 0.55;
    bg.fillStyle = '#fff';
    bg.beginPath();
    bg.arc(L.cx + Math.cos(a) * d, L.cy + Math.sin(a) * d, 0.5 + R() * 1.1, 0, Math.PI * 2);
    bg.fill();
  }
  bg.globalAlpha = 1;
  const vg = bg.createRadialGradient(L.cx, L.cy, L.r * 0.7, L.cx, L.cy, L.r);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.55)');
  bg.fillStyle = vg;
  bg.fillRect(L.cx - L.r, L.cy - L.r, L.r * 2, L.r * 2);
  bg.restore();

  const rimW = Math.max(6, L.r * 0.035);
  rim.save();
  rim.lineWidth = rimW;
  rim.strokeStyle = GOLD2;
  rim.shadowColor = 'rgba(243,210,122,.35)';
  rim.shadowBlur = 18;
  rim.beginPath();
  rim.arc(L.cx, L.cy, L.r + rimW / 2, 0, Math.PI * 2);
  rim.stroke();
  rim.restore();
  rim.save();
  rim.strokeStyle = 'rgba(243,210,122,.55)';
  rim.lineWidth = 2;
  for (let i = 0; i < 48; i++) {
    const a = i / 48 * Math.PI * 2;
    const l = i % 4 ? 6 : 12;
    const rr = L.r + rimW + 4;
    rim.beginPath();
    rim.moveTo(L.cx + Math.cos(a) * rr, L.cy + Math.sin(a) * rr);
    rim.lineTo(L.cx + Math.cos(a) * (rr + l), L.cy + Math.sin(a) * (rr + l));
    rim.stroke();
  }
  rim.restore();

  state.bgCanvas = bgCanvas;
  state.rimCanvas = rimCanvas;
}

export function drawLens(state, L) {
  makeCache(state, L);
  state.g.drawImage(state.bgCanvas, 0, 0, L.W, L.H);
  state.g.drawImage(state.rimCanvas, 0, 0, L.W, L.H);
}

// ⭐ 별(최대 12개)의 빛번짐(shadowBlur)을 프레임마다 그리면 모바일에서 비싸다 —
//    켜진 별·꺼진 별 두 장을 크기가 바뀔 때만 오프스크린에 구워 두고 drawImage 로 찍는다.
function starSprites(state, s) {
  const key = `${s.toFixed(3)}:${state.dpr}`;
  if (state.starSprites?.key === key) return state.starSprites;
  const half = Math.ceil(40 * s);
  const make = (paint) => {
    const c = document.createElement('canvas');
    c.width = c.height = Math.max(1, Math.ceil(half * 2 * state.dpr));
    const g = c.getContext('2d');
    g.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    paint(g, half, half);
    return c;
  };
  const lit = make((g, x, y) => {
    glowDot(g, x, y, 9 * s, 'rgba(255,240,190,.35)', 24 * s);
    sparkle(g, x, y, 13 * s, '#fff6d6');
  });
  const dim = make((g, x, y) => {
    glowDot(g, x, y, 4.2 * s, 'rgba(220,228,255,.85)', 8 * s);
    g.strokeStyle = 'rgba(220,228,255,.22)';
    g.lineWidth = 1.2 * s;
    g.beginPath();
    g.arc(x, y, 14 * s, 0, Math.PI * 2);
    g.stroke();
  });
  return (state.starSprites = { key, half, lit, dim });
}

export function drawConstellation(state, L, elapsed = 0) {
  const g = state.g;
  const ORDER = lensC(state).order;
  const pts = starPoints(state, L);
  const s = L.r / 300;
  const done = Math.max(0, state.judges.length);
  g.save();
  g.setLineDash([4 * s, 7 * s]);
  g.strokeStyle = 'rgba(233,236,255,.18)';
  g.lineWidth = 1.5 * s;
  for (let k = done; k < ORDER.length - 1; k++) {
    const [a, b] = [pts[ORDER[k]], pts[ORDER[k + 1]]];
    g.beginPath();
    g.moveTo(...a);
    g.lineTo(...b);
    g.stroke();
  }
  g.restore();

  if (done > 0) {
    g.save();
    g.strokeStyle = GOLD;
    g.lineWidth = 3.2 * s;
    g.lineCap = 'round';
    g.shadowColor = GOLD;
    g.shadowBlur = 16 * s;
    for (let k = 0; k < done; k++) {
      const missed = state.judges[k] === 'miss';
      g.setLineDash(missed ? [4 * s, 7 * s] : []);
      g.strokeStyle = missed ? 'rgba(233,236,255,.35)' : GOLD;
      g.shadowBlur = missed ? 0 : 16 * s;
      g.beginPath();
      g.moveTo(...pts[ORDER[k]]);
      g.lineTo(...pts[ORDER[k + 1]]);
      g.stroke();
    }
    g.restore();
  }

  const lit = new Set(elapsed >= state.chart[0].startMs ? ORDER.slice(0, done + 1) : []);   // 첫 별은 혜성이 출발할 때(800ms) 켜진다
  const sprites = starSprites(state, s);
  pts.forEach(([x, y], i) => {
    const img = lit.has(i) ? sprites.lit : sprites.dim;
    g.drawImage(img, x - sprites.half, y - sprites.half, sprites.half * 2, sprites.half * 2);
  });
  return pts;
}

export function drawJudge(state, L, pts) {
  if (!state.flash || performance.now() > state.flash.until) return;
  const g = state.g;
  const s = L.r / 300;
  const done = state.judges.length;
  const [x, y] = pts[lensC(state).order[Math.max(0, done)]];
  const text = state.flash.judge === 'perfect' ? t(COPY.perfect) : state.flash.judge === 'good' ? t(COPY.good)
    : state.flash.why === 'early' ? t(COPY.missEarly) : t(COPY.missLate);   // 🔭 놓친 이유(빨랐어요/늦었어요)
  const color = state.flash.judge === 'miss' ? 'rgba(233,236,255,.72)' : GOLD;
  g.save();
  g.font = `800 ${Math.round(22 * s + 6)}px ${FAMILY}`;
  g.textAlign = 'center';
  g.fillStyle = color;
  g.shadowColor = color;
  g.shadowBlur = 12;
  g.fillText(text, x, y - 30 * s);
  g.restore();
}

export function drawComet(state, L, pts, elapsed) {
  const note = state.chart.find(n => elapsed >= n.startMs && elapsed < n.hitMs)
    || (elapsed >= state.chart.at(-1).hitMs ? state.chart.at(-1) : null);
  if (!note) return;
  const g = state.g;
  const s = L.r / 300;
  const prev = note.from;
  const next = note.to;
  const [px, py] = pts[prev];
  const [x, y] = pts[next];
  const T = easeOut((elapsed - note.startMs) / Math.max(1, note.hitMs - note.startMs));

  g.save();
  g.strokeStyle = 'rgba(243,210,122,.9)';
  g.lineWidth = 2 * s;
  g.beginPath();
  g.arc(x, y, 16 * s, 0, Math.PI * 2);
  g.stroke();
  g.lineWidth = 3.5 * s;
  g.strokeStyle = `rgba(243,210,122,${0.3 + T * 0.55})`;
  g.shadowColor = GOLD;
  g.shadowBlur = 12 * s;
  g.beginPath();
  g.arc(x, y, 16 * s + (1 - T) * 56 * s, 0, Math.PI * 2);
  g.stroke();
  g.restore();

  const hx = px + (x - px) * T;
  const hy = py + (y - py) * T;
  g.save();
  const t0 = Math.max(0, T - 0.45);
  const tl = g.createLinearGradient(px + (x - px) * t0, py + (y - py) * t0, hx, hy);
  tl.addColorStop(0, 'rgba(243,210,122,0)');
  tl.addColorStop(1, 'rgba(255,240,190,.95)');
  g.strokeStyle = tl;
  g.lineWidth = 5 * s;
  g.lineCap = 'round';
  g.shadowColor = GOLD;
  g.shadowBlur = 18 * s;
  g.beginPath();
  g.moveTo(px + (x - px) * t0, py + (y - py) * t0);
  g.lineTo(hx, hy);
  g.stroke();
  g.restore();
  glowDot(g, hx, hy, 7 * s, '#fff6d6', 26 * s);
  const R = rnd(3);
  for (let i = 0; i < 9; i++) {
    const t2 = Math.max(0, T - R() * 0.4);
    glowDot(g, px + (x - px) * t2 + (R() - 0.5) * 12 * s, py + (y - py) * t2 + (R() - 0.5) * 12 * s, (1 + R() * 1.6) * s, 'rgba(255,230,160,.8)', 0);   // 1~3px 입자 — blur 는 안 보이고 비용만 든다
  }
}

export function drawHud(state, L) {
  const g = state.g;
  const { W, H, portrait, r, cx, cy } = L;
  const fs = portrait ? 15 : 17;
  const done = state.judges.length;
  const combo = state.judges.reduce((n, j) => j === 'miss' ? 0 : n + 1, 0);
  g.save();
  g.textBaseline = 'middle';
  const tx = portrait ? 18 : 32;
  const ty = (portrait ? 34 : 40) + L.top;   // 토스 상단 버튼 아래로
  g.font = `700 ${fs + 4}px ${FAMILY}`;
  g.fillStyle = INK;
  const sc = starCopy(lensC(state).id);
  g.fillText(`🔭 ${t(sc.name)}`, tx, ty);
  g.font = `600 ${fs - 2}px ${FAMILY}`;
  g.fillStyle = 'rgba(233,236,255,.6)';
  g.fillText(t(sc.subtitle), tx, ty + fs + 8);
  for (let i = 0; i < state.chart.length; i++) {
    const x = tx + 6 + i * (fs + 2);
    const y = ty + fs * 2 + 22;
    g.beginPath();
    g.arc(x, y, 5, 0, Math.PI * 2);
    g.fillStyle = i < done ? (state.judges[i] === 'miss' ? MISS_DOT : GOLD) : (i === done ? 'rgba(243,210,122,.45)' : 'rgba(233,236,255,.18)');
    g.fill();
  }
  g.textAlign = 'right';
  g.font = `800 ${fs + 10}px ${FAMILY}`;
  g.fillStyle = GOLD;
  const rx = W - (portrait ? 64 : 92);
  g.fillText(String(Math.max(0, combo)), rx, ty + 2);
  g.font = `600 ${fs - 2}px ${FAMILY}`;
  g.fillStyle = 'rgba(233,236,255,.65)';
  g.fillText(t(COPY.combo), rx, ty + fs + 10);
  g.textAlign = 'center';
  g.font = `600 ${fs}px ${FAMILY}`;
  g.fillStyle = 'rgba(233,236,255,.85)';
  const hy = Math.min(H - 40, cy + r + (portrait ? 56 : 46));
  g.fillText(t(COPY.tapGuide), cx, hy);
  g.restore();
}
