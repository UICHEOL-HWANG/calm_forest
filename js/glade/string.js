export const THRESHOLDS = Object.freeze([3, 8, 15, 25, 40, 60, 85, 115, 150, 190, 240]);
export const JARS_PER_SEG = 4;
export const SEG_COINS = Object.freeze([10, 10, 15, 15, 20, 20, 25, 25, 30, 30, 0]);
export const KIND_CODE = Object.freeze({ yellow: 'y', blue: 'b', green: 'g', rainbow: 'r', petal: 'p', ember: 'e', amber: 'a', frost: 'f' });
const CODE_KIND = Object.freeze(Object.fromEntries(Object.entries(KIND_CODE).map(([k, c]) => [c, k])));

export const segmentsLit = (caught) => THRESHOLDS.filter(t => caught >= t).length;
export const nextThreshold = (caught) => THRESHOLDS.find(t => caught < t) ?? null;

function parseSeg(str) {
  const out = {};
  for (const m of String(str || '').matchAll(/([a-z])(\d+)/g)) if (CODE_KIND[m[1]]) out[m[1]] = (out[m[1]] || 0) + Number(m[2]);
  return out;
}

const encodeSeg = (counts) => Object.entries(counts).filter(([, n]) => n > 0).map(([c, n]) => c + n).join('');

const cleanString = (str) => [...String(str || '')].filter(c => CODE_KIND[c]).join('').slice(0, THRESHOLDS.length * JARS_PER_SEG);

export function splitColors(counts, n = JARS_PER_SEG) {
  const entries = Object.entries(counts).filter(([c, v]) => CODE_KIND[c] && v > 0);
  const total = entries.reduce((s, [, v]) => s + v, 0);
  if (!total) return 'y'.repeat(n);
  const parts = entries.map(([c, v]) => ({ c, v, whole: Math.floor((v * n) / total), rest: ((v * n) / total) % 1 }));
  let left = n - parts.reduce((s, p) => s + p.whole, 0);
  for (const p of [...parts].sort((a, b) => b.rest - a.rest || b.v - a.v)) {
    if (left <= 0) break;
    p.whole += 1; left -= 1;
  }
  return parts.sort((a, b) => b.whole - a.whole || b.v - a.v).map(p => p.c.repeat(p.whole)).join('');
}

export function addCatch(state, kindId) {
  const caught = (state.caught | 0) + 1;
  const counts = parseSeg(state.seg);
  const code = KIND_CODE[kindId] || 'y';
  counts[code] = (counts[code] || 0) + 1;
  const string = cleanString(state.string);
  const after = segmentsLit(caught);
  if (after === segmentsLit(caught - 1)) return { caught, seg: encodeSeg(counts), string, lit: null };
  return { caught, seg: '', string: (string + splitColors(counts)).slice(0, THRESHOLDS.length * JARS_PER_SEG), lit: after };
}

export function stringColors(str) {
  const s = cleanString(str), out = [];
  for (let i = 0; i + JARS_PER_SEG <= s.length; i += JARS_PER_SEG) out.push([...s.slice(i, i + JARS_PER_SEG)].map(c => CODE_KIND[c]));
  return out;
}
