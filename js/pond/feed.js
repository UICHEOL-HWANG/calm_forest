import { gameState, buffs, clock, ui, requestSave, todayStr, pondFeedAdButton, isOpen } from '../game.js';
import { emitBuffs } from '../spaces/cooking.js';
import { trackEvent } from '../analytics.js';
import { kstDate } from '../kst-date.js';
import { FISH_KINDS } from '../data/catalog.js';
import { SEA_SPECIES } from '../data/places.js';
import { DEX } from '../data/dex.js';
import { SEASON_IDS, seasonInfo } from '../season.js';
import { feedStatus, afterFeed, afterFeedAd, fishBook, FEED_BUFF_SEC } from './actions.js';
import { pondExists, pondCount, pondGather } from './index.js';
import { openBook, closeBook } from '../hud/collection-book.js';
import { yardGuidePointTo } from './yard-guide.js';
import { POND_COPY } from './copy.js';

const RIVER_ORDER = ['common', 'uncommon', 'rare', 'sakura_trout', 'puffer', 'maple_carp', 'ice_smelt'];

function riverList() {
  return RIVER_ORDER.map(id => FISH_KINDS.find(k => k.rarity === id)).filter(Boolean).map(k => ({
    id: k.rarity, name: k.name, ico: DEX.fish.find(f => f.id === k.rarity)?.ico || '🐟', season: k.season || null,
  }));
}

function seaList() {
  return SEA_SPECIES.map(s => ({ id: s.id, name: s.name, ico: s.ico }));
}

export function feedPond(kind = 'free') {
  if (!pondExists()) return false;
  const day = kstDate();
  const st = feedStatus(gameState.hintsSeen, day);
  if (kind === 'free' && st.fed) return false;
  if (kind === 'ad' && !st.adLeft) return false;
  gameState.hintsSeen = kind === 'ad' ? afterFeedAd(gameState.hintsSeen, day) : afterFeed(gameState.hintsSeen, day);
  buffs.luck = Math.max(buffs.luck, clock.elapsedTime) + FEED_BUFF_SEC;
  emitBuffs();
  pondGather();
  ui.toast?.(POND_COPY.fedToast, 2600);
  trackEvent('pond_feed', { kind, count: pondCount() });
  requestSave();
  return true;
}

function feedRow() {
  const st = feedStatus(gameState.hintsSeen, kstDate());
  const row = document.createElement('div');
  row.className = 'cb-head';
  if (!st.fed) {
    const b = document.createElement('button');
    b.className = 'cb-btn';
    b.textContent = POND_COPY.feedBtn;
    b.onclick = () => { closeBook(); feedPond('free'); };
    row.append(b);
    return row;
  }
  const line = document.createElement('span');
  line.textContent = POND_COPY.fedToday;
  row.append(line);
  const ad = st.adLeft ? pondFeedAdButton(ok => { if (ok) closeBook(); }) : null;
  if (ad) row.append(ad);
  return row;
}

function go(kind) {
  closeBook();
  yardGuidePointTo(kind);
}

function slotInfo(slot) {
  if (slot.got) return { line: `${slot.ico} ${slot.name}` };
  const h = slot.hint;
  if (h.kind === 'season') return { line: `${POND_COPY.season[h.season]} · ${POND_COPY.until[h.season].replace('{0}', h.days)}` };
  if (h.kind === 'sea' && !isOpen('sea')) return { line: POND_COPY.hintSeaLocked };
  if (h.kind === 'sea') return { line: POND_COPY.hintSea, go: { label: POND_COPY.goSea, onClick: () => go('sea') } };
  return { line: h.now ? POND_COPY.hintLakeNow : POND_COPY.hintLake, go: { label: POND_COPY.goLake, onClick: () => go('lake') } };
}

export function openPondBook() {
  if (!pondExists()) return;
  const info = seasonInfo(todayStr());
  const book = fishBook({ dexFish: gameState.dex?.fish, seaBest: gameState.sea?.best }, { river: riverList(), sea: seaList() }, { season: info.season.id, left: info.left }, SEASON_IDS);
  const label = s => ({ ...s, label: s.w != null ? `${s.w}kg` : s.name });
  openBook({
    title: POND_COPY.bookTitle,
    count: `${book.got} / ${book.total}`,
    closeLabel: POND_COPY.bookClose,
    hint: POND_COPY.bookHint,
    head: feedRow(),
    sections: [{ title: POND_COPY.secRiver, slots: book.river.map(label) }, { title: POND_COPY.secSea, slots: book.sea.map(label) }],
    onSlot: slotInfo,
  });
  if (!gameState.hintsSeen.pondBook) { gameState.hintsSeen.pondBook = true; requestSave(); }
  trackEvent('pond_book_open', { count: book.got });
}
