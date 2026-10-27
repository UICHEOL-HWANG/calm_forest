export const MUDFLAT = { TIDE: 60, FRONT0: -15, FRONT1: 12, WINDOW: .3, MISS_LIMIT: 2, REACH: 1.35 };
export const DIVE = { BREATH: 20, DIVES: 3, ASCEND: 3, DESCEND: 3.2, REFILL: .8, REACH: 1.4 };

export const MUD_SPECIES = [
  { id: 'clam', key: 'mf_clam', name: '바지락', ico: '🐚', w: 46, depth: 1, coin: 1, sell: 2 },
  { id: 'crab', key: 'mf_crab', name: '칠게', ico: '🦀', w: 14, depth: 1, coin: 1, sell: 1 },
  { id: 'cockle', key: 'mf_cockle', name: '꼬막', ico: '🐚', w: 22, depth: 2, coin: 1, sell: 3 },
  { id: 'razor', key: 'mf_razor', name: '맛조개', ico: '🐚', w: 10, depth: 2, coin: 1, sell: 4 },
  { id: 'scallop', key: 'mf_scallop', name: '가리비', ico: '🐚', w: 6, depth: 3, coin: 2, sell: 6 },
  { id: 'octo', key: 'mf_octo', name: '낙지', ico: '🐙', w: 2, depth: 3, coin: 5, sell: 15, rare: true },
];

export const DIVE_SPECIES = [
  { id: 'conch', key: 'dv_conch', name: '소라', ico: '🐚', minD: 0, w: 40, coin: 1, sell: 2 },
  { id: 'star', key: 'dv_star', name: '불가사리', ico: '⭐', minD: 0, w: 32, coin: 1, sell: 1 },
  { id: 'abalone', key: 'dv_abalone', name: '전복', ico: '🦪', minD: 4, w: 18, coin: 2, sell: 5 },
  { id: 'octo', key: 'dv_octo', name: '문어', ico: '🐙', minD: 6, w: 8, coin: 3, sell: 8 },
  { id: 'pearl', key: 'dv_pearl', name: '진주', ico: '💎', minD: 8, w: 3, coin: 5, sell: 18, rare: true },
];

export function tideProgress(t, tide = MUDFLAT.TIDE) {
  const p = Math.min(1, Math.max(0, t / tide)), k = .75;
  return p < k ? .35 * (p / k) : .35 + .65 * Math.pow((p - k) / (1 - k), 1.15);
}

export function tideFront(t, tide = MUDFLAT.TIDE) {
  return MUDFLAT.FRONT0 + (MUDFLAT.FRONT1 - MUDFLAT.FRONT0) * tideProgress(t, tide);
}

export const breathPhase = phase => ((phase % 1) + 1) % 1;
export const inBreathWindow = (phase, win = MUDFLAT.WINDOW) => breathPhase(phase) < win;
export const digResult = phase => (inBreathWindow(phase) ? 'hit' : 'miss');

export function pickWeighted(pool, r) {
  const sum = pool.reduce((a, s) => a + s.w, 0);
  let left = r * sum;
  for (const s of pool) { left -= s.w; if (left < 0) return s; }
  return pool[pool.length - 1];
}

export const diveSpeciesPool = depth => DIVE_SPECIES.filter(s => depth >= s.minD);

export const mudWindow = ease => Math.min(.6, MUDFLAT.WINDOW * ease);
export const diveBreath = ease => Math.round(DIVE.BREATH * ease * 10) / 10;

export const airAfter = (air, dt, breath = DIVE.BREATH) => Math.max(0, air - dt / breath);
export const airNeeded = (depth, ascend = DIVE.ASCEND, breath = DIVE.BREATH) => depth / ascend / breath + .05;

export function roundOver(mode, s) {
  return mode === 'dive' ? s.dives >= DIVE.DIVES : s.t >= MUDFLAT.TIDE;
}

export function summarizeBag(species, bag) {
  const items = species
    .filter(s => bag[s.id])
    .map(s => ({ id: s.id, key: s.key, ico: s.ico, name: s.name, count: bag[s.id], coin: s.coin, sell: s.sell, rare: !!s.rare }))
    .sort((a, b) => Number(b.rare) - Number(a.rare) || b.sell - a.sell);
  return {
    items,
    count: items.reduce((a, it) => a + it.count, 0),
    coins: items.reduce((a, it) => a + it.count * it.coin, 0),
    sellValue: items.reduce((a, it) => a + it.count * it.sell, 0),
  };
}

export const FORAGE_SPECIES = [...MUD_SPECIES, ...DIVE_SPECIES];
export const FORAGE_KEYS = FORAGE_SPECIES.map(s => s.key);
export const FORAGE_SELL = Object.fromEntries(FORAGE_SPECIES.map(s => [s.key, s.sell]));
export const FORAGE_ICO = Object.fromEntries(FORAGE_SPECIES.map(s => [s.key, s.ico]));
export const FORAGE_LABEL = Object.fromEntries(FORAGE_SPECIES.map(s => [s.key, s.ico + s.name]));
export const FORAGE_META = Object.fromEntries(FORAGE_SPECIES.map(s => [s.key, { ico: s.ico, name: s.name }]));
