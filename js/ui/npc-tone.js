import { NPCS } from '../data/npcs.js';

const CREAM = [255, 250, 241];
const TOO_LIGHT = 0.6;
const MIN_CONTRAST = 3.4;

const toRgb = (v) => {
  if (typeof v === 'number' && Number.isFinite(v)) return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
  const m = typeof v === 'string' && /^#?([0-9a-f]{6})$/i.exec(v.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const toHex = (rgb) => '#' + rgb.map(x => Math.round(x).toString(16).padStart(2, '0')).join('');
const mix = (a, b, k) => a.map((x, i) => x + (b[i] - x) * k);
const lum = (rgb) => {
  const [r, g, b] = rgb.map(x => x / 255).map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

const build = (c) => {
  let ink = c;
  for (let k = 0.08; contrast(ink, CREAM) < MIN_CONTRAST && k <= 1; k += 0.08) ink = mix(c, [0, 0, 0], k);
  return { c: toHex(c), t: toHex(mix(c, [255, 255, 255], 0.8)), i: toHex(ink), d: toHex(mix(ink, [0, 0, 0], 0.3)) };
};

export const DEFAULT_TONE = Object.freeze(build([95, 191, 98]));

export function toneOf(color, alt) {
  const pick = [toRgb(color), toRgb(alt)].find(rgb => rgb && lum(rgb) < TOO_LIGHT);
  return pick ? build(pick) : DEFAULT_TONE;
}

export function toneById(id) {
  const n = NPCS.find(x => x.id === id);
  return n ? toneOf(n.color, n.hat) : DEFAULT_TONE;
}

export function applyTone(el, tone) {
  if (!el) return;
  const s = el.style;
  s.setProperty('--nc', tone.c); s.setProperty('--nt', tone.t);
  s.setProperty('--ni', tone.i); s.setProperty('--nd', tone.d);
}
