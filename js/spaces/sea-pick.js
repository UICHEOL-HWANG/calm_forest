import { WEATHER, gameState, isNight, requestSave, ui } from '../game.js';
import { trackEvent } from '../analytics.js';
import { enterSea } from './sea.js';
import { enterMudflat } from './mudflat.js';
import { SEA_MODES, SEA_PICK_TITLE, NEW_BADGE, SOON_LABEL, isNewMode, pickCards, withLast } from '../forage/pick.js';
import { pickEventParams } from '../forage/run.js';

const ENTRY = {
  fish: () => enterSea(),
  mudflat: (o) => enterMudflat(o),
};

export function openSeaPick() {
  const forage = gameState.sea.forage;
  const ready = Object.fromEntries(Object.keys(ENTRY).map(k => [k, true]));
  ui.openSeaPick({
    title: SEA_PICK_TITLE,
    newBadge: NEW_BADGE,
    soon: SOON_LABEL,
    cards: pickCards(forage, ready),
    onPick: (mode) => {
      const m = SEA_MODES.find(x => x.mode === mode);
      if (!m || !ENTRY[mode]) return;
      trackEvent('sea_mode_pick', pickEventParams({ mode, first: isNewMode(m, forage), night: isNight(), weather: WEATHER }));
      gameState.sea = { ...gameState.sea, forage: withLast(forage, mode) };
      requestSave();
      ENTRY[mode]({ entry: 'pick', prevMode: forage?.last ?? null });
    },
    onCancel: () => trackEvent('sea_mode_pick', pickEventParams({ mode: 'cancel', first: !forage?.last, night: isNight(), weather: WEATHER })),
  });
}
