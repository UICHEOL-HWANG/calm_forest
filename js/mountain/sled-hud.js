import { t } from '../i18n.js';
import { COURSE } from './course.js';

let root = null;

function ensure() {
  if (!root) {
    root = document.createElement('div');
    root.id = 'sled-hud';
    root.innerHTML = `
    <div class="sled-top"><span class="sled-time"></span><span class="sled-acorns"></span></div>
    <div class="sled-count"></div>
    <button type="button" class="sled-boost" data-sled-boost></button>
    <div class="sled-result" data-sled-ui hidden></div>`;
    const style = document.createElement('style');
    style.textContent = `
    body.sled-run #mobile-controls, body.sled-run #talk-btn{display:none !important}
    #sled-hud{position:fixed;inset:0;pointer-events:none;z-index:40}
    #sled-hud .sled-top{position:absolute;left:50%;top:calc(env(safe-area-inset-top) + 12px);transform:translateX(-50%);display:flex;gap:12px;padding:6px 14px;border-radius:999px;background:rgba(20,28,40,.55);color:#fff;font-size:16px}
    #sled-hud .sled-count{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:64px;color:#fff;text-shadow:0 2px 8px rgba(0,0,0,.4)}
    #sled-hud .sled-boost{position:absolute;right:calc(env(safe-area-inset-right) + 18px);bottom:calc(env(safe-area-inset-bottom) + 18px);width:84px;height:84px;border-radius:50%;border:0;background:#9a6a2f;color:#fff;font-size:15px;pointer-events:auto}
    #sled-hud .sled-boost:disabled{opacity:.45}
    #sled-hud .sled-result{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);min-width:240px;padding:18px 20px;border-radius:16px;background:#fffdf7;color:#2a2a28;text-align:center;pointer-events:auto;line-height:1.6}
    #sled-hud .sled-result[hidden]{display:none}
    #sled-hud .sled-result button{margin-top:10px;padding:8px 18px;border:0;border-radius:10px;background:#3f6b34;color:#fff;font-size:15px}`;
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

export function showRunHud({ timeMs, acorns }) {
  const r = ensure();
  r.querySelector('.sled-time').textContent = `⏱️ ${sec(timeMs)}`;
  r.querySelector('.sled-acorns').textContent = `🌰 ${acorns}`;
  const b = r.querySelector('.sled-boost');
  b.textContent = `${t('🌰 부스터')} ${acorns}`;
  b.disabled = acorns <= 0;
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
    leftToday > 0 ? t(`오늘 보상 ${leftToday}판 남음`) : t('오늘 보상은 다 받았어요 · 기록 도전은 계속할 수 있어요'),
  ].filter(Boolean);
  const box = r.querySelector('.sled-result');
  box.innerHTML = `${lines.map(l => `<div>${l}</div>`).join('')}<button type="button">${t('확인')}</button>`;
  box.querySelector('button').onclick = onClose;
  box.hidden = false;
}

export function hideSledHud() {
  if (!root) return;
  root.querySelector('.sled-result').hidden = true;
  root.querySelector('.sled-count').textContent = '';
  root.querySelector('.sled-boost').style.display = '';
  root.style.display = 'none';
}
