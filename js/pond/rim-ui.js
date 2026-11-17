import { gameState, ui, requestSave, refreshInventoryUI } from '../game.js';
import { trackEvent } from '../analytics.js';
import { logEcon } from '../metrics.js';
import { rimView, applyRim } from './rim.js';
import { pondExists, setPondRim } from './index.js';
import { openBook, isBookOpen } from '../hud/collection-book.js';
import { POND_COPY } from './copy.js';

const DONE_TOAST_MS = 2600;

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}

function rowEl(r) {
  const row = el('div', 'cb-head');
  const name = el('span');
  name.append(el('span', null, r.ico), ' ', el('span', null, r.name));
  const b = el('button', 'cb-btn', r.using ? POND_COPY.rimUsing : r.owned ? POND_COPY.rimSwitch : `🪙 ${r.cost}`);
  b.disabled = r.using || (!r.owned && !r.canBuy);
  b.onclick = () => pickRim(r.id);
  row.append(name, b);
  return row;
}

export function openPondRim() {
  if (!pondExists()) return;
  const coins = gameState.inventory.coins || 0;
  const rows = rimView(gameState.hintsSeen, coins);
  const head = el('div', 'cb-rows');
  head.append(...rows.map(rowEl));
  openBook({
    title: POND_COPY.rimTitle,
    count: `🪙 ${coins}`,
    closeLabel: POND_COPY.bookClose,
    hint: rows.some(r => !r.owned) && !rows.some(r => r.canBuy) ? POND_COPY.rimShort : '',
    head,
    sections: [],
  });
}

export function pickRim(id) {
  const out = applyRim(gameState.inventory, gameState.hintsSeen, id);
  if (!out) return false;
  Object.assign(gameState.inventory, out.inventory);
  gameState.hintsSeen = out.hintsSeen;
  if (out.bought) logEcon('pond_rim', id, -out.cost, gameState.inventory.coins);
  refreshInventoryUI();
  trackEvent('pond_rim', { item: id, coins: out.cost });
  requestSave();
  try {
    setPondRim();
  } catch (err) {
    console.error('[pond] rim swap failed', err);
  }
  if (isBookOpen()) openPondRim();
  ui.toast?.(POND_COPY.rimDone, DONE_TOAST_MS);
  return true;
}
