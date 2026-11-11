import { COOK, FLIP, CHOP_TAPS, CHOP_GAP, PATIENCE, STAR, STAR_UP, MENU_KEYS, DDA_MIN, DDA_MAX, DDA_EASY, DDA_HARD, DDA_EASY_BELOW, DDA_HARD_FROM, STARTER_STOCK } from './data.js';

const nat = v => (Number.isFinite(v) && v > 0 ? Math.floor(v) : 0);
const clampDda = v => Math.round(Math.max(DDA_MIN, Math.min(DDA_MAX, v)) * 100) / 100;
const ddaVal = v => (Number.isFinite(v) ? clampDda(v) : 1);

export function defaultRestaurant() {
  return { v: 1, star: 1, rating: 0, served: Object.fromEntries(MENU_KEYS.map(k => [k, 0])), combo: 0, bestCombo: 0,
    dda: { iv: 1, pat: 1, win: 1 }, starterGiven: false, guideDone: false, services: 0 };
}

export function sanitizeRestaurant(raw) {
  const base = defaultRestaurant();
  if (!raw || typeof raw !== 'object') return base;
  const star = Math.min(4, Math.max(1, nat(raw.star) || 1));
  return {
    ...base, star, rating: nat(raw.rating),
    served: Object.fromEntries(MENU_KEYS.map(k => [k, nat(raw.served?.[k])])),
    combo: nat(raw.combo), bestCombo: nat(raw.bestCombo),
    dda: { iv: ddaVal(raw.dda?.iv), pat: ddaVal(raw.dda?.pat), win: ddaVal(raw.dda?.win) },
    starterGiven: raw.starterGiven === true, guideDone: raw.guideDone === true, services: nat(raw.services),
  };
}

export function cookState(kind, t, win) {
  const k = COOK[kind];
  const w = k.win * win;
  if (t < k.cook) return 'raw';
  if (t < k.cook + w) return 'perfect';
  if (t < k.cook + w + k.burn) return 'over';
  return 'burnt';
}

export function panState(t) {
  if (t < COOK.pan.cook) return 'raw';
  if (t < COOK.pan.cook + COOK.pan.burn) return 'done';
  return 'burnt';
}

export function flipZone(win) {
  const r = v => Math.round(v * 100) / 100;
  return [r(FLIP.at - FLIP.half * win), r(FLIP.at + FLIP.half * win)];
}

export function flipOk(t, win) {
  const [a, b] = flipZone(win);
  return t >= a && t <= b;
}

export function chopTap(c, now) {
  if (c.last >= 0 && now - c.last < CHOP_GAP) return c;
  return { taps: Math.min(CHOP_TAPS, c.taps + 1), last: now };
}

export function chopDone(c) {
  return c.taps >= CHOP_TAPS;
}

export function serveStars(wait, quality, pat) {
  const [a, b] = PATIENCE;
  const late = wait < a * pat ? 0 : wait < b * pat ? 1 : 2;
  return Math.max(1, 5 - late - (quality < 1 ? 1 : 0));
}

export function spawnInterval(star, elapsed, ivMul) {
  const [s, e] = STAR[star].iv;
  return (s + (e - s) * Math.min(1, elapsed / 100)) * ivMul;
}

export function serviceAvg(stars, unserved) {
  const all = [...stars, ...Array(unserved).fill(1)];
  return all.length ? all.reduce((a, b) => a + b, 0) / all.length : 0;
}

export function adjustDda(dda, { avg, late, unserved, served }) {
  if (avg < DDA_EASY_BELOW || served === 0) return { dir: 'easy', dda: { iv: clampDda(dda.iv + DDA_EASY), pat: clampDda(dda.pat + DDA_EASY), win: clampDda(dda.win + DDA_EASY) } };
  if (avg >= DDA_HARD_FROM && late === 0 && unserved <= 1) return { dir: 'hard', dda: { iv: clampDda(dda.iv - DDA_HARD), pat: clampDda(dda.pat - DDA_HARD), win: clampDda(dda.win - DDA_HARD) } };
  return { dir: 'keep', dda: { ...dda } };
}

export function recordServe(rest, menu, stars) {
  const combo = stars >= 4 ? rest.combo + 1 : 0;
  return { ...rest, rating: rest.rating + stars, served: { ...rest.served, [menu]: (rest.served[menu] || 0) + 1 },
    combo, bestCombo: Math.max(rest.bestCombo, combo) };
}

export function starUpReady(rest) {
  const c = STAR_UP[rest.star + 1];
  if (!c) return false;
  if (rest.rating < c.rating) return false;
  if (c.combo && rest.bestCombo < c.combo) return false;
  for (const [k, n] of Object.entries(c.served || {})) if ((rest.served[k] || 0) < n) return false;
  return true;
}

export function applyStarUp(rest) {
  if (!starUpReady(rest)) return { rest, coins: 0 };
  return { rest: { ...rest, star: rest.star + 1 }, coins: STAR_UP[rest.star + 1].coins };
}

export function takeIngredient(port, kind) {
  const n = nat(port?.pantry?.[kind]);
  if (n < 1) return { ok: false, port };
  return { ok: true, port: { ...port, pantry: { ...port.pantry, [kind]: n - 1 } } };
}

export function grantStarter(rest, port) {
  if (rest.starterGiven) return { given: false, rest, port };
  const pantry = { ...port.pantry };
  for (const [k, n] of Object.entries(STARTER_STOCK)) pantry[k] = nat(pantry[k]) + n;
  return { given: true, rest: { ...rest, starterGiven: true }, port: { ...port, pantry } };
}

export function settleService(rest, result) {
  const { dir, dda } = adjustDda(rest.dda, result);
  const up = applyStarUp({ ...rest, dda, services: rest.services + 1 });
  return { rest: up.rest, bonus: up.coins, starUp: up.rest.star !== rest.star, dir };
}
