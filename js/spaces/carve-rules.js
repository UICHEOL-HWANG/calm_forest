export const GRAIN = Object.freeze({ fish: 'h', mush: 'h', heart: 'v', tree: 'v' });
export const GRAIN_REACH = 2;
export const COMBO_IDLE_MS = 3000;
export const COMBO_STEPS = Object.freeze([
  Object.freeze({ at: 15, mult: 1.3 }),
  Object.freeze({ at: 10, mult: 1.2 }),
  Object.freeze({ at: 5, mult: 1.1 }),
]);
export const COMBO_GAUGE_MAX = 15;
export const GEM_CHANCE = Object.freeze({ wood: 0.1, stone: 0.25 });
export const GEM_SPARKLE_MS = 4000;

export function grainOf(design) {
  if (!design || design.mat !== 'wood') return null;
  return GRAIN[design.id] || null;
}

export function strokeStep(from, to, grain, cols) {
  if (!grain || from === to) return null;
  const dc = (to % cols) - (from % cols);
  const dr = Math.floor(to / cols) - Math.floor(from / cols);
  if (grain === 'h' && dc !== 0 && Math.abs(dc) > Math.abs(dr)) return { dc: Math.sign(dc), dr: 0 };
  if (grain === 'v' && dr !== 0 && Math.abs(dr) > Math.abs(dc)) return { dc: 0, dr: Math.sign(dr) };
  return null;
}

export function grainSweep(cells, at, step, cols, rows, reach = GRAIN_REACH) {
  const out = [];
  let c = at % cols, r = Math.floor(at / cols);
  for (let n = 0; n < reach; n++) {
    c += step.dc; r += step.dr;
    if (c < 0 || c >= cols || r < 0 || r >= rows) break;
    const j = r * cols + c;
    if (cells[j] === 'k' || cells[j] === 's') break;
    if (cells[j] === 'w') out.push(j);
  }
  return out;
}

export function comboStart() {
  return { combo: 0, best: 0, lastAt: null };
}

const idleSince = (st, now) => st.lastAt != null && now - st.lastAt > COMBO_IDLE_MS;

export function comboCut(st, now, fresh) {
  const combo = idleSince(st, now) ? 1 : st.combo + (fresh ? 1 : 0);
  return { combo, best: Math.max(st.best, combo), lastAt: now };
}

export function comboScratch(st) {
  return { ...st, combo: 0 };
}

export function comboTick(st, now) {
  if (st.combo === 0 || !idleSince(st, now)) return st;
  return { ...st, combo: 0 };
}

export function comboMult(best) {
  return COMBO_STEPS.find(s => best >= s.at)?.mult ?? 1;
}

export function comboCrossed(prevBest, best) {
  const step = COMBO_STEPS.find(s => best >= s.at);
  return step && prevBest < step.at ? step : null;
}

export function comboGauge(combo) {
  return Math.min(combo, COMBO_GAUGE_MAX) / COMBO_GAUGE_MAX * 100;
}

export function carvePayout(pay, tierMult, best) {
  return Math.round(pay * tierMult * comboMult(best));
}

export function pickGemCell(cells, mat, rnd = Math.random) {
  if (!(rnd() < (GEM_CHANCE[mat] || 0))) return -1;
  const waste = [];
  cells.forEach((s, i) => { if (s === 'w') waste.push(i); });
  if (!waste.length) return -1;
  return waste[Math.min(waste.length - 1, Math.floor(rnd() * waste.length))];
}
