import { gameState, ui, requestSave, todayStr } from '../game.js';
import { IS_DEV_SESSION } from '../config.js';
import { trackEvent } from '../analytics.js';
import { DECOR } from '../data/catalog.js';
import { DROP_SOURCES, DECOR_SETS } from '../data/decor-sets.js';
import { rollDrop, setProgress, daysSince, bannerDue } from './rules.js';
import { dropToast, setCompleteToast, bannerCopy } from './copy.js';

const forceNext = () => IS_DEV_SESSION && new URLSearchParams(location.search).get('drop') === 'force';
const nameOf = (id) => DECOR.find(d => d.id === id)?.name ?? id;
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
  if (!r.hit) return;
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
  ui.openDecorAlbum?.();
}

export function decorBanner(src) {
  const def = DROP_SOURCES[src];
  if (!def || !gameState.house) return;
  const today = todayStr();
  if (!bannerDue(gameState.drops, granted(), def.set, today)) return;
  const drops = gameState.drops || {};
  gameState.drops = { ...drops, banner: { ...(drops.banner || {}), [def.set]: today } };
  const c = bannerCopy(def.set, src);
  const set = DECOR_SETS.find(s => s.id === def.set);
  ui.showHintBanner?.({
    ico: '🎁', img: set.thumb, title: c.title, line: `${c.line} ${c.go}`,
    onShow: () => trackEvent('decor_banner', { set: def.set, act: 'show' }),
    onTap: () => { trackEvent('decor_banner', { set: def.set, act: 'tap' }); openDecorAlbum('banner'); },
    onDismiss: (reason) => { if (reason !== 'tap') trackEvent('decor_banner', { set: def.set, act: 'dismiss' }); },
  });
  requestSave();
}
