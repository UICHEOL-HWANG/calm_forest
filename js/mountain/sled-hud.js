import { t } from '../i18n.js';
import { COURSE } from './course.js';
import { stepLines, boostLeft } from './boost-lines.js';

let root = null;
let shown = {};

function ensure() {
  if (!root) {
    root = document.createElement('div');
    root.id = 'sled-hud';
    root.innerHTML = `
    <canvas class="sled-lines"></canvas>
    <div class="sled-top"><span class="sled-time"></span><span class="sled-acorns"></span></div>
    <div class="sled-count"></div>
    <button type="button" class="sled-boost" data-sled-boost></button>
    <div class="sled-result" data-sled-ui hidden></div>
    <div class="sled-stick" hidden><div class="sled-knob"></div></div>`;
    const style = document.createElement('style');
    style.textContent = `
    body.sled-run #mobile-controls, body.sled-run #talk-btn, body.sled-run #hotbar{display:none !important}
    #sled-hud{position:fixed;inset:0;pointer-events:none;z-index:40}
    #sled-hud .sled-top{position:absolute;left:50%;top:calc(var(--top-inset) + 12px);transform:translateX(-50%);display:flex;gap:12px;padding:6px 14px;border-radius:999px;background:rgba(20,28,40,.55);color:#fff;font-size:16px}
    #sled-hud .sled-count{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:64px;color:#fff;text-shadow:0 2px 8px rgba(0,0,0,.4)}
    #sled-hud .sled-lines{position:absolute;inset:0;width:100%;height:100%}
    #sled-hud .sled-boost{position:absolute;left:50%;transform:translateX(-50%);bottom:calc(env(safe-area-inset-bottom) + 18px);width:84px;height:84px;border-radius:50%;border:0;--boost-left:0;background:radial-gradient(circle closest-side,#9a6a2f calc(100% - 6px),transparent calc(100% - 5px)),conic-gradient(#ffd27a calc(var(--boost-left) * 1turn),#9a6a2f 0);box-shadow:0 0 0 3px rgba(255,210,122,calc(var(--boost-left) * .9));color:#fff;font-size:15px;pointer-events:auto}
    #sled-hud .sled-boost:disabled{opacity:.45}
    #sled-hud .sled-result{position:absolute;left:50%;bottom:calc(env(safe-area-inset-bottom) + 24px);transform:translateX(-50%);min-width:240px;padding:18px 20px;border-radius:16px;background:#fffdf7;color:#2a2a28;text-align:center;pointer-events:auto;line-height:1.6}
    #sled-hud .sled-result[hidden]{display:none}
    #sled-hud .sled-stick{position:absolute;width:92px;height:92px;margin:-46px 0 0 -46px;border-radius:50%;background:rgba(20,28,40,.22);border:2px solid rgba(255,255,255,.85);box-sizing:border-box}
    #sled-hud .sled-stick[hidden]{display:none}
    #sled-hud .sled-knob{position:absolute;left:50%;top:50%;width:42px;height:42px;margin:-21px 0 0 -21px;border-radius:50%;background:#fff;box-shadow:0 2px 6px rgba(20,28,40,.3)}
    #sled-hud .sled-result button{margin-top:10px;padding:8px 18px;border:0;border-radius:10px;background:#3f6b34;color:#fff;font-size:15px}
    @media (orientation: portrait){#sled-hud .sled-top{top:calc(var(--top-inset) + 78px)}}
    @media (orientation: landscape) and (max-height: 500px){#sled-hud .sled-result{bottom:calc(env(safe-area-inset-bottom) + 10px);display:flex;flex-wrap:wrap;justify-content:center;align-items:center;gap:6px 14px;min-width:0;max-width:calc(100vw - 24px - env(safe-area-inset-left) - env(safe-area-inset-right));box-sizing:border-box;padding:10px 16px;line-height:1.3;font-size:14px}#sled-hud .sled-result div{white-space:nowrap}#sled-hud .sled-result button{margin:0 0 0 4px;flex:none}}`;
    document.head.appendChild(style);
    document.body.appendChild(root);
  }
  root.style.display = '';
  return root;
}

const sec = ms => (ms / 1000).toFixed(2);

export function boostButton() {
  const b = ensure().querySelector('.sled-boost');
  b.style.display = '';
  return b;
}

export function showCountdown(n) {
  ensure().querySelector('.sled-count').textContent = n > 0 ? String(n) : t('🛷 출발!');
}

export function clearCountdown() {
  const c = root?.querySelector('.sled-count');
  if (c && c.textContent) c.textContent = '';
}

export function hudPatch(prev, next) {
  return Object.fromEntries(Object.entries(next).filter(([k, v]) => prev[k] !== v));
}

const HUD_WRITES = [
  ['time', '.sled-time', 'textContent'],
  ['acorns', '.sled-acorns', 'textContent'],
  ['boost', '.sled-boost', 'textContent'],
  ['off', '.sled-boost', 'disabled'],
];

export function showRunHud({ timeMs, acorns }) {
  const r = ensure();
  const next = { time: `⏱️ ${sec(timeMs)}`, acorns: `🌰 ${acorns}`, boost: `${t('🌰 부스터')} ${acorns}`, off: acorns <= 0 };
  const patch = hudPatch(shown, next);
  HUD_WRITES.forEach(([key, sel, prop]) => { if (key in patch) r.querySelector(sel)[prop] = patch[key]; });
  shown = next;
}

export function showResult({ timeMs, best, newBest, coins, leftToday, flags }, onClose) {
  const r = ensure();
  r.querySelector('.sled-count').textContent = '';
  r.querySelector('.sled-boost').style.display = 'none';
  const lines = [
    `<b>${t('🏁 완주!')}</b>`,
    `⏱️ ${sec(timeMs)} · 🚩 ${flags}/${COURSE.flags.length}`,
    newBest ? t('🏆 새 최고 기록!') : `🏆 ${sec(best)}`,
    coins > 0 ? `🪙 +${coins}` : '',
    leftToday > 0 ? t(`오늘 보상 ${leftToday}판 남음`) : t('오늘 보상은 다 받았어요. 기록 도전은 계속할 수 있어요'),
  ].filter(Boolean);
  const box = r.querySelector('.sled-result');
  box.innerHTML = `${lines.map(l => `<div>${l}</div>`).join('')}<button type="button">${t('확인')}</button>`;
  box.querySelector('button').onclick = onClose;
  box.hidden = false;
}

export function showStick(st) {
  const el = root?.querySelector('.sled-stick');
  if (!el) return;
  el.hidden = !st;
  if (!st) return;
  el.style.left = `${st.x}px`;
  el.style.top = `${st.y}px`;
  el.firstElementChild.style.transform = `translateX(${st.dx}px)`;
}

let lines = [];
let linesDrawn = false;
let shownLeft = '';
let linesCtx = null;

export function showBoostFx(sled, dt) {
  const cv = root?.querySelector('.sled-lines');
  if (!cv) return;
  const left = boostLeft(sled);
  if (!lines.length && !linesDrawn && left <= 0) return setLeft('0.00');
  const w = cv.clientWidth, h = cv.clientHeight, diag = Math.hypot(w, h) / 2;
  setLeft(left.toFixed(2));
  lines = stepLines(lines, dt, { active: left > 0, diag });
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
  const g = linesCtx || (linesCtx = cv.getContext('2d'));
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, w, h);
  const cx = w / 2, cy = h * 0.42;
  g.lineCap = 'round';
  g.lineWidth = 2;
  lines.forEach(l => {
    g.strokeStyle = `rgba(255,255,255,${0.75 * Math.min(1, (l.r / diag - 0.3) * 2)})`;
    g.beginPath();
    g.moveTo(cx + Math.cos(l.a) * l.r, cy + Math.sin(l.a) * l.r);
    g.lineTo(cx + Math.cos(l.a) * (l.r + l.len), cy + Math.sin(l.a) * (l.r + l.len));
    g.stroke();
  });
  linesDrawn = lines.length > 0;
}

function setLeft(v) {
  if (v === shownLeft) return;
  shownLeft = v;
  root.querySelector('.sled-boost').style.setProperty('--boost-left', v);
}

function clearBoostFx() {
  lines = [];
  if (root) setLeft('0.00');
  if (!linesDrawn) return;
  linesDrawn = false;
  const cv = root?.querySelector('.sled-lines');
  if (cv && linesCtx) linesCtx.clearRect(0, 0, cv.width, cv.height);
}

export function hideBoost() {
  ensure().querySelector('.sled-boost').style.display = 'none';
  clearBoostFx();
}

export function hideSledHud() {
  if (!root) return;
  root.querySelector('.sled-result').hidden = true;
  root.querySelector('.sled-stick').hidden = true;
  clearBoostFx();
  root.querySelector('.sled-count').textContent = '';
  root.querySelector('.sled-boost').style.display = '';
  root.style.display = 'none';
}
