export const FINALE_CH = 9;
export const FINALE_KEY = 'treeFinale';

const chOf = (s) => {
  const n = Number(s?.story?.ch);
  return Number.isFinite(n) ? n : 0;
};

export const hasKeeperTitle = (s) => chOf(s) >= FINALE_CH;
export const finaleDue = (s) => hasKeeperTitle(s) && !s?.hintsSeen?.[FINALE_KEY];
export const showTeaser = (s) => !hasKeeperTitle(s);

export function finaleVia(chAtBoot, s, replay) {
  if (replay) return 'replay';
  return chAtBoot != null && chAtBoot < FINALE_CH && hasKeeperTitle(s) ? 'live' : 'boot';
}

export const markFinaleSeen = (hintsSeen, day) => ({ ...(hintsSeen || {}), [FINALE_KEY]: day });
export const isKeeperRow = (row) => row?.title === 'keeper';
