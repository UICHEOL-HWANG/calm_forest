import { PANTRY_KEYS, PANTRY_ICO } from './data.js';

const LABEL = '🧺 섬 바구니';
let root = null, cells = null, lastKey = '';

export function basketKey(pantry = {}) {
  return PANTRY_KEYS.map(k => Math.max(0, pantry[k] | 0)).join(',');
}

function build(host) {
  root = document.createElement('div');
  root.id = 'port-basket';
  root.innerHTML = `<span class="pb-tag">${LABEL}</span>` +
    PANTRY_KEYS.map(k => `<div class="pb-slot" data-k="${k}"><i class="uico">${PANTRY_ICO[k]}</i><em>0</em></div>`).join('');
  host.appendChild(root);
  cells = Object.fromEntries([...root.querySelectorAll('.pb-slot')].map(el => [el.dataset.k, { el, n: el.querySelector('em') }]));
}

export function setIslandHud(host, on) {
  host.classList.toggle('port-island', !!on);
  if (on && !root) build(host);
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
