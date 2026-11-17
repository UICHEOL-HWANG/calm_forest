import { gameState, plots, ui, requestSave, refreshInventoryUI, guideShortAd } from '../game.js';
import { HOUSE_POS } from '../data/places.js';
import { trackEvent } from '../analytics.js';
import { logEcon } from '../metrics.js';
import { pondStageShort } from '../guide/prepass-rules.js';
import { pondStageInfo, pondExpandView, pondDecorInWay, pondPlotsInWay, applyExpand } from './stage.js';
import { pondStage, pondExists, rebuildPond, outdoorRel } from './index.js';
import { pondBook } from './feed.js';
import { openBook, closeBook, isBookOpen } from '../hud/collection-book.js';
import { yardGuidePointTo } from './yard-guide.js';
import { POND_COPY } from './copy.js';

const MOVE_STAGE = 2;
const DONE_TOAST_MS = 3600;

const fill = (s, ...v) => v.reduce((out, x, i) => out.replace(`{${i}}`, x), s);

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}

function current() {
  const info = pondStageInfo(pondStage(), gameState.inventory, pondBook().got);
  return { info, view: info.maxed ? null : pondExpandView(info, pondDecorInWay(outdoorRel(), info.next.stage), pondPlotsInWay(plots, HOUSE_POS, info.next.stage)) };
}

function rowEl(r) {
  const row = el('div', r.ok ? 'cb-head' : 'cb-head no');
  const num = el('span', 'cb-num');
  num.append(el('span', null, r.k === 'book' ? fill(POND_COPY.growBookNum, r.have, r.need) : `${r.have} / ${r.need}`));
  if (r.ok) num.append(el('b', null, '✓'));
  row.append(el('span', null, POND_COPY.growRow[r.k]), num);
  return row;
}

export function openPondExpand() {
  if (!pondExists()) return;
  const { info, view } = current();
  if (!view) return;
  const head = el('div', 'cb-rows');
  head.append(...view.rows.map(rowEl));
  const short = pondStageShort(info.cur.stage, gameState.inventory);
  const ad = short ? guideShortAd(short.slot, short.list, (ok) => { if (ok && isBookOpen()) openPondExpand(); }) : null;
  if (ad) head.append(ad);
  openBook({
    title: POND_COPY.growTitle[info.next.stage],
    count: fill(POND_COPY.growCount, info.cur.stage, info.next.stage),
    closeLabel: POND_COPY.bookClose,
    hint: view.hint ? POND_COPY.growHint[view.hint] : '',
    go: { label: POND_COPY.growBuy, disabled: !view.canBuy, onClick: expandPond },
    head,
    foot: info.next.stage === MOVE_STAGE ? el('div', 'cb-hint', POND_COPY.growWhere) : null,
    sections: [],
  });
}

export function expandPond() {
  const { info, view } = current();
  const out = applyExpand(gameState.inventory, gameState.hintsSeen, info, !!view?.canBuy);
  if (!out) return false;
  Object.assign(gameState.inventory, out.inventory);
  gameState.hintsSeen = out.hintsSeen;
  logEcon('pond_expand', 'stage' + out.stage, -out.cost.coins, gameState.inventory.coins);
  refreshInventoryUI();
  trackEvent('pond_expand', { stage: out.stage, wood: out.cost.wood, stone: out.cost.stone, coins: out.cost.coins });
  requestSave();
  closeBook();
  try {
    rebuildPond();
  } catch (err) {
    console.error('[pond] rebuild after expand failed', err);
  }
  ui.toast?.(POND_COPY.growDone[out.stage], DONE_TOAST_MS);
  if (out.stage === MOVE_STAGE) yardGuidePointTo('pond');
  return true;
}
