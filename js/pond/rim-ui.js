import { gameState, ui, requestSave, refreshInventoryUI } from '../game.js';
import { trackEvent } from '../analytics.js';
import { logEcon } from '../metrics.js';
import { rimCards, applyRim } from './rim.js';
import { rimPic, rimPicsFailed, drawRimPics } from './rim-thumbs.js';
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

function cardEl(c, pic) {
  const b = el('button', `cb-pick ${c.state}`);
  b.type = 'button';
  if (c.off) b.setAttribute(c.using ? 'aria-current' : 'aria-disabled', 'true');
  const img = el('i');
  if (pic) img.style.backgroundImage = `url(${pic})`;
  b.append(img,el('b', null, c.name), el('span', 'cb-pill', c.label));
  b.onclick = () => pickRim(c.id);
  return b;
}

export function openPondRim() {
  if (!pondExists()) return;
  const coins = gameState.inventory.coins || 0;
  const { cards, short } = rimCards(gameState.hintsSeen, coins);
  const drawn = !rimPicsFailed();
  const head = el('div', drawn ? 'cb-picks' : 'cb-rows');
  head.append(...cards.map(c => (drawn ? cardEl(c, rimPic(c.id)) : rowEl(c))));
  openBook({
    title: POND_COPY.rimTitle,
    count: '',
    coins: `🪙 ${coins}`,
    wide: drawn,
    closeLabel: POND_COPY.bookClose,
    hint: short ? POND_COPY.rimShort : '',
    head,
    sections: [],
  });
  drawRimPics(() => { if (isBookOpen() && document.querySelector('#cb-head .cb-picks')) openPondRim(); });
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
