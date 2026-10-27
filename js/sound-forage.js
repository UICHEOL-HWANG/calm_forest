const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const deg = (d, oct = 4) => 261.63 * Math.pow(2, (MAJOR[((d % 7) + 7) % 7] + 12 * (Math.floor(d / 7) + oct - 4)) / 12);

const MUD_E = 60 / 128 / 2;
const DIVE_E = 60 / 72 / 2;
export const MUDFLAT_BAR = MUD_E * 8 * 1000;
export const DIVE_BAR = DIVE_E * 8 * 1000;

const MUD_MEL = [
  [[4, 1], [4, 1], [5, 1], [7, 1]], [[7, 1], [5, 1], [4, 2]], [[2, 1], [4, 1], [5, 1], [4, 1]], [[2, 2], [0, 2]],
  [[4, 1], [4, 1], [5, 1], [7, 1]], [[9, 1], [7, 1], [5, 2]], [[4, 1], [5, 1], [4, 1], [2, 1]], [[0, 3], [-1, 1]],
];
const MUD_ROOT = [0, 3, 1, 4, 0, 3, 4, 0];
const DIVE_MEL = [[[4, 2], [2, 1], [4, 1], [7, 2], [5, 2]], [[4, 4], [2, 4]], [[5, 2], [4, 1], [5, 1], [9, 2], [7, 2]], [[4, 6], [-1, 2]]];
const DIVE_ROOT = [0, 5, 3, 4];

const longEcho = new WeakMap();
function longIn(c, out) {
  if (longEcho.has(out)) return longEcho.get(out);
  const d = c.createDelay(2); d.delayTime.value = 0.62;
  const fb = c.createGain(); fb.gain.value = 0.55;
  const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1400;
  const inp = c.createGain(); inp.connect(d); d.connect(lp).connect(fb).connect(d); lp.connect(out);
  longEcho.set(out, inp);
  return inp;
}

function tone(k, freq, dur, vol, t, { type = 'sine', atk = 0.008, wet = 0, long = 0, lp = 0, glide = 0 } = {}) {
  const { c, out } = k;
  const o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (glide) o.frequency.exponentialRampToValueAtTime(glide, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + atk);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  let node = o.connect(g);
  if (lp) { const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp; node = g.connect(f); }
  node.connect(out);
  if (wet) { const w = c.createGain(); w.gain.value = wet; node.connect(w).connect(k.echo); }
  if (long) { const w = c.createGain(); w.gain.value = long; node.connect(w).connect(longIn(c, out)); }
  o.start(t); o.stop(t + dur + 0.05);
}

const bass = (k, f, dur, vol, t) => tone(k, f, dur, vol, t, { atk: 0.01 });
const marimba = (k, f, vol, t) => { tone(k, f, 0.32, vol, t, { atk: 0.003, wet: 0.12 }); tone(k, f * 4, 0.06, vol * 0.25, t, { atk: 0.002 }); };
const pluck = (k, f, vol, t, dur) => tone(k, f, dur, vol, t, { type: 'triangle', atk: 0.004, lp: 2400 });
const pop = (k, t, vol) => tone(k, 500 + Math.random() * 300, 0.09, vol, t, { atk: 0.004, glide: 1500 });
const celesta = (k, f, dur, vol, t) => { tone(k, f, dur, vol, t, { long: 0.5 }); tone(k, f * 3, dur * 0.3, vol * 0.14, t, { long: 0.25 }); };
const pad = (k, f, dur, vol, t) => tone(k, f, dur, vol, t, { type: 'triangle', atk: Math.min(1.2, dur * 0.35), long: 0.3, lp: 1200 });
function bubbles(k, t, n, gap, vol) {
  for (let i = 0; i < n; i++) tone(k, 700 + i * 180 + Math.random() * 80, 0.06, vol, t + i * gap, { atk: 0.004, glide: 1400 + i * 200, long: 0.3 });
}

export function mudflatBar(k, t, bar) {
  const i = bar % 8, e = MUD_E, r = MUD_ROOT[i];
  [0, 2, 4, 6].forEach((s, j) => bass(k, deg(j % 2 ? r + 4 : r, 2), e * 1.4, 0.09, t + s * e));
  [1, 3, 5, 7].forEach(s => pluck(k, deg(r + 2, 3), 0.025, t + s * e, 0.18));
  let at = t;
  MUD_MEL[i].forEach(([d, n]) => { marimba(k, deg(d, 5), 0.07, at); at += e * n; });
  pop(k, t + e * 7.2, 0.035);
  if (i % 4 === 3) bubbles(k, t + e * 4, 3, 0.07, 0.025);
}

export function diveBar(k, t, bar) {
  const i = bar % 4, e = DIVE_E, r = DIVE_ROOT[i];
  pad(k, deg(r, 2), e * 8.4, 0.06, t);
  pad(k, deg(r + 2, 3), e * 8, 0.022, t);
  let at = t;
  DIVE_MEL[i].forEach(([d, n]) => { celesta(k, deg(d, 5), e * n * 2, 0.05, at); at += e * n; });
  if (Math.random() < 0.6) bubbles(k, t + e * (2 + Math.random() * 4), 5, 0.09, 0.02);
}
