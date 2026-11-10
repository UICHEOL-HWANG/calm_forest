import { PANTRY_KEYS, PANTRY_ICO } from './data.js';

const LABEL = '🧺 섬 바구니';
export const BASKET_TIP = '도구 대신 섬에서 모은 재료가 담겨요';
const TIP_KEY = 'cf_port_basket_tip', TIP_MS = 6000;
let root = null, cells = null, lastKey = '';

export function basketKey(pantry = {}) {
  return PANTRY_KEYS.map(k => Math.max(0, pantry[k] | 0)).join(',');
}

function build(host) {
  root = document.createElement('div');
  root.id = 'port-basket';
  root.innerHTML = `<span class="pb-tip" hidden>${BASKET_TIP}</span><span class="pb-tag">${LABEL}</span>` +
    PANTRY_KEYS.map(k => `<div class="pb-slot" data-k="${k}"><i class="uico">${PANTRY_ICO[k]}</i><em>0</em></div>`).join('');
  host.appendChild(root);
  cells = Object.fromEntries([...root.querySelectorAll('.pb-slot')].map(el => [el.dataset.k, { el, n: el.querySelector('em') }]));
}

function tipSeen() { try { return !!localStorage.getItem(TIP_KEY); } catch (e) { return false; } }
function markTipSeen() { try { localStorage.setItem(TIP_KEY, '1'); } catch (e) {} }

function showTipOnce() {
  if (tipSeen()) return;
  markTipSeen();
  const tip = root.querySelector('.pb-tip');
  tip.hidden = false;
  setTimeout(() => { tip.hidden = true; }, TIP_MS);
}

export function setIslandHud(host, on) {
  host.classList.toggle('port-island', !!on);
  if (on && !root) build(host);
  if (on) showTipOnce();
}

export function updateBasket(pantry) {
  if (!root) return;
  const key = basketKey(pantry);
  if (key === lastKey) return;
  lastKey = key;
  for (const k of PANTRY_KEYS) {
    const n = Math.max(0, pantry?.[k] | 0), c = cells[k];
    c.n.textContent = n > 99 ? '99+' : String(n);
    c.el.classList.toggle('zero', n === 0);
  }
}
