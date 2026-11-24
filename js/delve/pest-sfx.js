import { audioBus, isSoundOn } from '../sound.js';

function env(g, t, a, v, d) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(v, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + d);
}

function osc(c, dest, type, f, t, d, v, glide, a = 0.01) {
  const o = c.createOscillator(), g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, t);
  if (glide) o.frequency.exponentialRampToValueAtTime(glide, t + d);
  env(g, t, a, v, d);
  o.connect(g).connect(dest);
  o.start(t);
  o.stop(t + d + 0.05);
  return o;
}

let noiseBuf = null;
function noiseBuffer(c) {
  if (noiseBuf && noiseBuf.sampleRate === c.sampleRate) return noiseBuf;
  noiseBuf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
  const x = noiseBuf.getChannelData(0);
  for (let i = 0; i < x.length; i++) x[i] = Math.random() * 2 - 1;
  return noiseBuf;
}

function noise(c, dest, t, d, f, { to = null, q = 1, v = 0.3, type = 'bandpass' } = {}) {
  const s = c.createBufferSource();
  s.buffer = noiseBuffer(c);
  const bp = c.createBiquadFilter();
  bp.type = type;
  bp.Q.value = q;
  bp.frequency.setValueAtTime(f, t);
  if (to) bp.frequency.exponentialRampToValueAtTime(to, t + d);
  const g = c.createGain();
  env(g, t, Math.min(0.03, d * 0.3), v, d);
  s.connect(bp).connect(g).connect(dest);
  s.start(t, Math.random());
  s.stop(t + d + 0.02);
}

const VOICES = {
  A: (c, out) => ({
    note(t, f, d, { glide, v = 0.3 } = {}) {
      osc(c, out, 'sine', f, t, d, v, glide, 0.02);
      osc(c, out, 'sine', f * 2, t, d * 0.7, v * 0.22, glide && glide * 2, 0.03);
    },
    nz(t, d, f, o = {}) { noise(c, out, t, d, f * 0.8, { ...o, to: o.to && o.to * 0.8, v: (o.v ?? 0.3) * 0.7, q: (o.q ?? 1) * 0.7 }); },
  }),
  B: (c, out) => ({
    note(t, f, d, { glide, v = 0.3 } = {}) {
      const dd = Math.min(d, 0.32);
      osc(c, out, 'sine', f, t, dd, v, null, 0.003);
      osc(c, out, 'sine', f * 3.93, t, dd * 0.35, v * 0.28, null, 0.002);
      if (!glide) return;
      osc(c, out, 'sine', glide, t + dd * 0.55, dd, v * 0.8, null, 0.003);
      osc(c, out, 'sine', glide * 3.93, t + dd * 0.55, dd * 0.3, v * 0.2, null, 0.002);
    },
    nz(t, d, f, o = {}) { noise(c, out, t, Math.min(d, 0.2), f * 1.4, { ...o, to: o.to && o.to * 1.4, q: (o.q ?? 1) * 2, v: (o.v ?? 0.3) * 0.8 }); },
  }),
  C: (c, out) => ({
    note(t, f, d, { glide, v = 0.3 } = {}) {
      const lp = c.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 2600;
      lp.connect(out);
      const g2 = glide ? f * Math.pow(glide / f, 1.35) : null;
      const o = osc(c, lp, 'square', f, t, d * 1.1, v * 0.45, g2, 0.005);
      if (d <= 0.12) return;
      const lfo = c.createOscillator(), lg = c.createGain();
      lfo.frequency.value = 11;
      lg.gain.value = f * 0.04;
      lfo.connect(lg).connect(o.frequency);
      lfo.start(t);
      lfo.stop(t + d * 1.1 + 0.05);
    },
    nz(t, d, f, o = {}) { noise(c, out, t, d, f, { ...o, v: (o.v ?? 0.3) * 1.1 }); },
  }),
};

const RECIPES = {
  notice(t, V) { V.note(t, 660, 0.09, { v: 0.22 }); V.note(t + 0.1, 990, 0.13, { v: 0.22 }); },
  snatch(t, V) { V.nz(t, 0.2, 2200, { to: 600, q: 1.5, v: 0.35 }); V.note(t + 0.04, 700, 0.16, { glide: 360, v: 0.25 }); },
  lost(t, V) { [523, 440, 349].forEach((f, i) => V.note(t + i * 0.13, f, 0.2, { v: 0.2 })); },
  tap(t, V) { V.note(t, 1250, 0.06, { v: 0.3 }); V.nz(t, 0.05, 3000, { v: 0.2, q: 2 }); },
  startle(t, V) { V.note(t, 520, 0.18, { glide: 1500, v: 0.22 }); [0.2, 0.29, 0.38].forEach(d => V.nz(t + d, 0.05, 1300, { v: 0.18, q: 3 })); },
  bait(t, V) { V.nz(t, 0.26, 600, { to: 1900, q: 1.2, v: 0.25 }); V.note(t + 0.28, 240, 0.12, { glide: 150, v: 0.3 }); },
  munch(t, V) { [0, 0.17, 0.34].forEach(d => { V.note(t + d, 340 + d * 80, 0.06, { v: 0.18 }); V.nz(t + d, 0.05, 900, { v: 0.15, q: 2 }); }); },
  plug(t, V) { V.note(t, 115, 0.2, { glide: 70, v: 0.55 }); V.nz(t, 0.14, 320, { v: 0.35, q: 0.8 }); },
  confused(t, V) { V.note(t, 440, 0.14, { glide: 640, v: 0.22 }); V.note(t + 0.16, 640, 0.18, { glide: 430, v: 0.2 }); },
  snore(t, V) { V.nz(t, 0.7, 450, { to: 850, q: 0.8, v: 0.12, type: 'lowpass' }); V.note(t + 0.1, 170, 0.5, { v: 0.06 }); },
  hush(t, V) { V.nz(t, 0.45, 4200, { q: 2.5, v: 0.13 }); V.note(t + 0.32, 1568, 0.22, { v: 0.12 }); },
  wake(t, V) { V.note(t, 950, 0.2, { glide: 320, v: 0.3 }); V.nz(t, 0.25, 700, { q: 0.7, v: 0.35 }); },
  ringdrop(t, V) { V.note(t, 1175, 0.1, { v: 0.16 }); V.note(t + 0.08, 1568, 0.14, { v: 0.13 }); },
  swoop(t, V) { V.nz(t, 0.38, 420, { to: 2600, q: 1.6, v: 0.3 }); V.note(t + 0.05, 900, 0.3, { glide: 460, v: 0.16 }); },
  dig(t, V) { [0, 0.2].forEach(d => { V.nz(t + d, 0.15, 480, { q: 0.8, v: 0.4 }); V.note(t + d, 140, 0.1, { glide: 90, v: 0.25 }); }); },
  reclaim(t, V) { [784, 1047, 1568].forEach((f, i) => V.note(t + i * 0.08, f, 0.2, { v: 0.2 })); },
  lightsOff(t, V) { V.note(t, 784, 0.5, { glide: 196, v: 0.2 }); V.nz(t, 0.45, 1300, { to: 300, q: 1, v: 0.15 }); },
  flutter(t, V) { [0, 0.07, 0.14, 0.21].forEach(d => V.nz(t + d, 0.04, 3200, { q: 3, v: 0.12 })); },
  lightsOn(t, V) { V.note(t, 392, 0.3, { glide: 784, v: 0.16 }); },
  curl(t, V) { V.note(t, 880, 0.14, { glide: 440, v: 0.18 }); V.nz(t + 0.12, 0.08, 1500, { v: 0.12, q: 3 }); },
  real(t, V) { [1047, 1319, 1568].forEach((f, i) => V.note(t + i * 0.07, f, 0.22, { v: 0.2 })); },
  fake(t, V) { V.note(t, 300, 0.18, { glide: 900, v: 0.28 }); V.note(t + 0.2, 220, 0.1, { v: 0.2 }); },
  roll(t, V) { V.nz(t, 0.55, 240, { to: 160, q: 0.9, v: 0.3, type: 'lowpass' }); [0, 0.13, 0.26, 0.39].forEach(d => V.note(t + d, 330 - d * 200, 0.07, { v: 0.12 })); },
  heart(t, V) { V.note(t, 988, 0.08, { v: 0.18 }); V.note(t + 0.09, 740, 0.14, { v: 0.16 }); },
  combo1(t, V) { V.note(t, 784, 0.14, { v: 0.18 }); },
  combo2(t, V) { V.note(t, 784, 0.1, { v: 0.16 }); V.note(t + 0.08, 988, 0.16, { v: 0.18 }); },
  combo3(t, V) { V.note(t, 784, 0.1, { v: 0.16 }); V.note(t + 0.08, 988, 0.1, { v: 0.17 }); V.note(t + 0.16, 1175, 0.2, { v: 0.2 }); },
  bonus(t, V) { [1047, 1319, 1568, 2093].forEach((f, i) => V.note(t + i * 0.06, f, 0.3, { v: 0.16 })); },
  comboBreak(t, V) { V.note(t, 330, 0.24, { glide: 220, v: 0.2 }); },
  giveUp(t, V) { V.note(t, 620, 0.7, { glide: 300, v: 0.16 }); V.nz(t + 0.1, 0.6, 500, { q: 0.8, v: 0.08, type: 'lowpass' }); },
  gift(t, V) { [784, 988, 1175, 1568].forEach((f, i) => V.note(t + i * 0.08, f, 0.35, { v: 0.17 })); },
  dive(t, V) { V.note(t, 420, 0.14, { glide: 170, v: 0.25 }); V.nz(t, 0.2, 700, { q: 1, v: 0.25 }); },
  bubble(t, V) { [0, 0.12, 0.24].forEach(d => V.note(t + d, 480 + d * 900, 0.06, { glide: 900 + d * 600, v: 0.1 })); },
  feint(t, V) { V.nz(t, 0.22, 900, { to: 400, q: 1.4, v: 0.2 }); },
  rumble(t, V) { V.nz(t, 1.0, 180, { to: 260, q: 0.9, v: 0.28, type: 'lowpass' }); },
  dust(t, V) { V.nz(t, 0.22, 900, { q: 0.8, v: 0.25 }); V.note(t + 0.05, 200, 0.1, { v: 0.15 }); },
  shuffle(t, V) { [0, 0.18, 0.36].forEach(d => V.nz(t + d, 0.14, 1600, { to: 900, q: 1.5, v: 0.16 })); },
};

const MIX = {
  tap: 'B', plug: 'B', dig: 'B', combo1: 'B', combo2: 'B', combo3: 'B', real: 'B', ringdrop: 'B', heart: 'B', snatch: 'B',
  fake: 'C', confused: 'C', startle: 'C', feint: 'C', swoop: 'C', roll: 'C',
};

const GAIN = {
  notice: 1.22, snatch: 1.27, lost: 1.07, tap: 2.14, startle: 2.75, bait: 1.5, munch: 2.14, plug: 0.68, confused: 3.02, snore: 2.19,
  hush: 1.66, wake: 1.17, ringdrop: 1.4, swoop: 2.63, dig: 1.48, reclaim: 1.27, lightsOff: 1.1, flutter: 12, lightsOn: 1.08, curl: 1.41,
  real: 1.19, fake: 2.21, roll: 3.2, heart: 2.14, combo1: 2.26, combo2: 1.82, combo3: 1.58, bonus: 1.24, comboBreak: 1.57, giveUp: 0.76,
  gift: 1.19, dive: 1.04, bubble: 3.76, feint: 6.68, rumble: 6.46, dust: 1.86, shuffle: 10.72,
};

export const PEST_SFX = Object.freeze(Object.fromEntries(Object.entries(RECIPES).map(([k, play]) => [k, { voice: MIX[k] || 'A', gain: GAIN[k], play }])));
export const PEST_SFX_KEYS = Object.freeze(Object.keys(PEST_SFX));

export function pestSfx(key) {
  const sfx = PEST_SFX[key];
  if (!sfx || typeof window === 'undefined' || !isSoundOn()) return;
  try {
    const { ctx, out } = audioBus();
    if (!ctx || !out) return;
    const g = ctx.createGain();
    g.gain.value = sfx.gain;
    g.connect(out);
    sfx.play(ctx.currentTime + 0.02, VOICES[sfx.voice](ctx, g));
  } catch {
    return;
  }
}
