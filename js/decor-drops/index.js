import { gameState, ui, requestSave, todayStr } from '../game.js';
import { IS_DEV_SESSION } from '../config.js';
import { trackEvent } from '../analytics.js';
import { DECOR } from '../data/catalog.js';
import { DROP_SOURCES, DECOR_SETS } from '../data/decor-sets.js';
import { rollDrop, setProgress, daysSince, bannerDue, extraRoll, extraRollOpen } from './rules.js';
import { dropToast, setCompleteToast, bannerCopy, extraMissToast } from './copy.js';
import { albumView, albumHtml } from './album.js';

const forceNext = () => IS_DEV_SESSION && new URLSearchParams(location.search).get('drop') === 'force';
const nameOf = (id) => DECOR.find(d => d.id === id)?.name ?? id;
const infoOf = (id) => { const d = DECOR.find(x => x.id === id); return { name: d?.name ?? id, ico: d?.ico ?? '🎁' }; };
const granted = () => (Array.isArray(gameState.house?.grantedDecor) ? gameState.house.grantedDecor : []);

function grant(id) {
  const stored = gameState.house.stored || {};
  gameState.house.stored = { ...stored, [id]: (stored[id] || 0) + 1 };
  gameState.house.grantedDecor = [...granted(), id];
}

export function completeSets() {
  return DECOR_SETS.filter(s => setProgress(granted(), s.id).complete).map(s => s.id);
}

export function applySetFx() {
  window.dispatchEvent(new CustomEvent('decor-set-fx', { detail: completeSets() }));
}

export function onPlay(src) {
  const def = DROP_SOURCES[src];
  if (!def || !gameState.house) return;
  const r = rollDrop(gameState.drops, granted(), src, Math.random(), forceNext());
  gameState.drops = r.drops;
  if (r.hit) land(r, def, src);
}

export const extraRollReady = (src) => !!gameState.house && extraRollOpen(gameState.drops, granted(), src);

export function onExtraRoll(src) {
  const def = DROP_SOURCES[src];
  if (!def || !extraRollReady(src)) return;
  const r = extraRoll(gameState.drops, granted(), src, forceNext() ? 0 : Math.random());
  gameState.drops = r.drops;
  if (r.hit) { land(r, def, src); return; }
  ui.toast?.(extraMissToast(), 2600);
  requestSave();
}

function land(r, def, src) {
  grant(r.item);
  const prog = setProgress(granted(), def.set);
  ui.toast?.(dropToast(nameOf(r.item), def.set, prog.n), 2800);
  trackEvent('decor_drop', { item: r.item, set: def.set, src, tries: r.tries, pity: r.pity ? 1 : 0 });
  if (prog.complete) {
    const bonus = DECOR_SETS.find(s => s.id === def.set).bonus;
    if (!granted().includes(bonus)) grant(bonus);
    setTimeout(() => ui.toast?.(setCompleteToast(def.set), 3200), 3000);
    trackEvent('decor_set_complete', { set: def.set, days_since_first: daysSince(gameState.firstDay, todayStr()) });
    applySetFx();
  }
  requestSave();
}

export function openDecorAlbum(from) {
  trackEvent('decor_album_open', { src: from });
  ui.openDecorAlbum?.(albumHtml(albumView(granted(), infoOf)));
}

export function decorBanner(src) {
  const def = DROP_SOURCES[src];
  if (!def || !gameState.house) return;
  const today = todayStr();
  if (!bannerDue(gameState.drops, granted(), def.set, today)) return;
  const burn = () => {
    const drops = gameState.drops || {};
    gameState.drops = { ...drops, banner: { ...(drops.banner || {}), [def.set]: today } };
    requestSave();
  };
  const c = bannerCopy(def.set, src);
  const set = DECOR_SETS.find(s => s.id === def.set);
  ui.showHintBanner?.({
    ico: '🎁', img: set.thumb, title: c.title, line: `${c.line} ${c.go}`, kind: 'feature', key: `decor-${def.set}`, burn,
    onShow: () => trackEvent('decor_banner', { set: def.set, act: 'show' }),
    onTap: () => { trackEvent('decor_banner', { set: def.set, act: 'tap' }); openDecorAlbum('banner'); },
    onDismiss: (reason) => { if (reason !== 'tap') trackEvent('decor_banner', { set: def.set, act: 'dismiss' }); },
  });
}
