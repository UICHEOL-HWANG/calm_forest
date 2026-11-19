import { gameState, buffs, clock, ui, requestSave, isOpen, RES_LABEL, guideShortAd, tableBiteAdOffered, tableBiteAdButton } from '../game.js';
import { emitBuffs, COOK_TIERS } from '../spaces/cooking.js';
import { trackEvent } from '../analytics.js';
import { kstDate } from '../kst-date.js';
import { RECIPES, BUFF_META } from '../data/catalog.js';
import { CAFE_CAPS } from '../guide/prepass-rules.js';
import { openBook, closeBook } from '../hud/collection-book.js';
import { yardGuidePointTo } from '../pond/yard-guide.js';
import { biteStatus, afterBite, afterBiteAd, biteSeconds, biteBuffEnd, cookbook, tableDishes } from './rules.js';
import { tableExists, markTableRingSeen } from './index.js';
import { TABLE_COPY as C } from './copy.js';
import { loadInbox, showInbox } from './dish-inbox.js';
import { DISH_COPY, fill } from '../neighbors/dish-copy.js';

let opensSinceBite = 0;

const tierName = (id) => COOK_TIERS.find(t => t.id === id)?.name ?? '';
const onTable = () => tableDishes(gameState.kitchen?.best, RECIPES, COOK_TIERS);

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}

function btn(text, onClick) {
  const b = el('button', 'cb-btn', text);
  b.onclick = onClick;
  return b;
}

export function cookbookAfterBite() {
  return opensSinceBite > 0;
}

export function takeBite(id, kind = 'free') {
  if (!tableExists()) return false;
  const day = kstDate();
  const st = biteStatus(gameState.hintsSeen, day);
  if (kind === 'free' && st.bit) return false;
  if (kind === 'ad' && !st.adLeft) return false;
  const dish = onTable().find(d => d.id === id);
  if (!dish || !BUFF_META[dish.buff]) return false;
  gameState.hintsSeen = kind === 'ad' ? afterBiteAd(gameState.hintsSeen, day) : afterBite(gameState.hintsSeen, day);
  buffs[dish.buff] = biteBuffEnd(buffs[dish.buff], clock.elapsedTime, biteSeconds(dish.tier, COOK_TIERS));
  emitBuffs();
  opensSinceBite = 0;
  ui.toast?.(C.biteDone, 2600);
  trackEvent('table_bite', { recipe: dish.id, quality: dish.tier, kind });
  requestSave();
  return true;
}

function pickInfo(d, mode) {
  const meta = BUFF_META[d.buff];
  const line = `${meta.ico} ${meta.name} · ${C.biteLine.replace('{0}', biteSeconds(d.tier, COOK_TIERS))}`;
  if (mode === 'ad') return { line, extra: tableBiteAdButton(d.id, ok => { if (ok) closeBook(); }) };
  return { line, go: { label: C.biteEat, onClick: () => { closeBook(); takeBite(d.id, 'free'); } } };
}

export function openBitePick(mode = 'free') {
  const dishes = onTable();
  if (!tableExists() || !dishes.length) return;
  openBook({
    title: C.biteTitle,
    count: '',
    closeLabel: C.bookClose,
    hint: C.biteHint,
    sections: [{ title: C.secDish, slots: dishes.map(d => ({ ...d, got: true, label: d.name })) }],
    onSlot: d => pickInfo(d, mode),
  });
}

function biteRow() {
  const st = biteStatus(gameState.hintsSeen, kstDate());
  const row = el('div', 'cb-head');
  loadInbox().then((v) => {
    if (!v.rows.length || !row.isConnected) return;
    row.append(btn(fill(DISH_COPY.bookBtn, v.rows.length), () => { closeBook(); showInbox(v); }));
  });
  if (!st.bit) {
    row.append(btn(C.biteBtn, () => openBitePick('free')));
    return row;
  }
  row.append(el('span', null, C.bitToday));
  if (st.adLeft && tableBiteAdOffered()) row.append(btn(C.adMore, () => openBitePick('ad')));
  return row;
}

function goKitchen() {
  closeBook();
  yardGuidePointTo('kitchen');
}

function slotInfo(slot) {
  if (slot.got) return { line: `${slot.ico} ${slot.name} · ${tierName(slot.tier)}` };
  const pieces = slot.cost.map(c => `${RES_LABEL[c.k] || c.k} ${c.have}/${c.need}`);
  const station = slot.station ? [C.station[slot.station]] : [];
  if (!isOpen('kitchen')) return { line: [...pieces, ...station, C.kitchenLocked].join(' · ') };
  const extra = slot.short.length ? guideShortAd('cook_ingredient', slot.short, ok => { if (ok) render(slot.id); }, CAFE_CAPS) : null;
  return { line: [...pieces, ...station].join(' · '), go: { label: C.goKitchen, onClick: goKitchen }, extra };
}

function render(sel) {
  const book = cookbook(gameState.kitchen?.best, gameState.inventory, RECIPES, COOK_TIERS);
  openBook({
    title: C.bookTitle,
    count: `${book.got} / ${book.total}`,
    closeLabel: C.bookClose,
    hint: C.bookHint,
    head: biteRow(),
    sections: [{ title: C.secDish, slots: book.slots.map(s => ({ ...s, label: s.name })) }],
    onSlot: slotInfo,
  });
  const i = book.slots.findIndex(s => s.id === sel);
  if (i >= 0) document.querySelector(`#cb-body .cb-slot[data-k="0:${i}"]`)?.click();
  return book;
}

export function openCookbook() {
  if (!tableExists()) return;
  const book = render(null);
  markTableRingSeen();
  opensSinceBite += 1;
  if (!gameState.hintsSeen.cookbookSeen) { gameState.hintsSeen.cookbookSeen = true; requestSave(); }
  trackEvent('cookbook_open', { count: book.got });
}
