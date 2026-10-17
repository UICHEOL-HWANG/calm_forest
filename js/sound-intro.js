export const INTRO_SCORE_LEN = 26.4;

const bell = (t, n, dur, vol, wet = 0.6) => ({ t, kind: 'bell', notes: [n], dur, vol, wet });
const pad = (t, notes, dur, vol, o = {}) => ({ t, kind: 'pad', notes, dur, vol, wet: 0.5, att: 1.2, ...o });
const vox = (t, notes, dur, vol, att) => ({ t, kind: 'vox', notes, dur, vol, wet: 0.5, att });

export const INTRO_SCORE = [
  vox(0, [60], 5.6, 0.05, 1.4),
  pad(0, [36, 43], 5.6, 0.03, { sine: true }),
  bell(0.4, 79, 2.4, 0.06), bell(1.3, 76, 2.4, 0.06), bell(2.2, 72, 2.4, 0.06), bell(3.1, 74, 2.4, 0.06), bell(4.0, 76, 2.4, 0.06),
  vox(5.6, [57], 5.4, 0.045, 1),
  pad(5.6, [45, 52], 5.4, 0.025, { sine: true }),
  bell(6.0, 76, 2.6, 0.05, 0.65), bell(7.1, 72, 2.6, 0.05, 0.65), bell(8.2, 69, 2.6, 0.05, 0.65), bell(9.4, 67, 2.6, 0.05, 0.65),
  { t: 9.4, kind: 'wind', notes: [], dur: 5.6, vol: 0.035, wet: 0.3 },
  pad(11, [45], 4.4, 0.03, { sine: true }),
  bell(12, 81, 3, 0.03, 0.8),
  vox(15.6, [62], 3.8, 0.035, 0.8),
  bell(15.9, 76, 1.6, 0.06), bell(16.4, 72, 2, 0.05),
  bell(17.6, 76, 1.6, 0.025, 0.85), bell(18.1, 72, 2, 0.02, 0.85),
  pad(19.4, [41, 48], 4.2, 0.035, { sine: true, att: 2 }),
  vox(19.6, [69, 76], 3.8, 0.03, 2.4),
  ...[81, 88, 86, 81, 88, 86].map((n, i) => bell(20 + i * 0.45, n, 2, 0.02, 0.85)),
  pad(21.6, [53, 60, 67, 71], 2.4, 0.03, { cut: 900, cutTo: 3200, att: 1.4 }),
  vox(23.4, [60, 67, 76], 3, 0.045, 0.6),
  bell(23.5, 72, 2.9, 0.07), bell(23.8, 79, 2.6, 0.07), bell(24.1, 88, 2.3, 0.07),
].sort((a, b) => a.t - b.t);

const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);

const irCache = new WeakMap();
function verbIR(c) {
  if (irCache.has(c)) return irCache.get(c);
  const len = Math.floor(c.sampleRate * 2), ir = c.createBuffer(1, len, c.sampleRate), d = ir.getChannelData(0);
  const k = Math.pow(0.001, 1 / len);
  let amp = 1;
  for (let i = 0; i < len; i++) { d[i] = (Math.random() * 2 - 1) * amp; amp *= k; }
  irCache.set(c, ir);
  return ir;
}

function makeVerb(c, dest) {
  const verb = c.createConvolver(); verb.buffer = verbIR(c);
  const g = c.createGain(); g.gain.value = 0.6;
  verb.connect(g); g.connect(dest);
  return verb;
}

function voice(c, dest, verb, wet) {
  const g = c.createGain(); g.connect(dest);
  if (wet) { const s = c.createGain(); s.gain.value = wet; g.connect(s); s.connect(verb); }
  return g;
}

function swell(g, t, vol, att, dur) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + att);
  g.gain.setValueAtTime(vol, t + Math.max(att, dur - 1.2));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
}

function playBell(c, out, e, t, srcs) {
  for (const [mul, v] of [[1, 1], [3, 0.18], [5.4, 0.05]]) {
    const o = c.createOscillator(), g = c.createGain();
    o.type = 'sine'; o.frequency.value = hz(e.notes[0]) * mul;
    const d = e.dur / (mul > 1 ? 2.5 : 1);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(e.vol * v, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.006 + d);
    o.connect(g); g.connect(out); o.start(t); o.stop(t + e.dur + 0.1);
    srcs.push(o);
  }
}

function playPad(c, out, e, t, vowel, srcs) {
  const g = c.createGain();
  swell(g, t, e.vol, e.att, e.dur);
  if (vowel) {
    for (const [fq, q, v] of [[730, 8, 1], [1090, 10, 0.6], [2440, 12, 0.25]]) {
      const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = fq; bp.Q.value = q;
      const vg = c.createGain(); vg.gain.value = v * 3;
      g.connect(bp); bp.connect(vg); vg.connect(out);
    }
  } else {
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 0.7;
    lp.frequency.setValueAtTime(e.cut || 900, t);
    if (e.cutTo) lp.frequency.exponentialRampToValueAtTime(e.cutTo, t + e.dur);
    g.connect(lp); lp.connect(out);
  }
  for (const m of e.notes) for (const det of [-6, 6]) {
    const o = c.createOscillator();
    o.type = vowel ? 'sawtooth' : e.sine ? 'sine' : 'sawtooth';
    o.frequency.value = hz(m); o.detune.value = det;
    if (vowel) {
      const lfo = c.createOscillator(), depth = c.createGain();
      lfo.frequency.value = 4.6; depth.gain.value = 5;
      lfo.connect(depth); depth.connect(o.detune); lfo.start(t); lfo.stop(t + e.dur + 0.1);
      srcs.push(lfo);
    }
    o.connect(g); o.start(t); o.stop(t + e.dur + 0.1);
    srcs.push(o);
  }
}

function playWind(c, out, e, t, srcs) {
  const len = Math.floor(c.sampleRate * e.dur), buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource(); src.buffer = buf;
  const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 0.8;
  bp.frequency.setValueAtTime(300, t);
  bp.frequency.linearRampToValueAtTime(800, t + e.dur * 0.5);
  bp.frequency.linearRampToValueAtTime(350, t + e.dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(e.vol, t + e.dur * 0.4);
  g.gain.exponentialRampToValueAtTime(0.0001, t + e.dur);
  src.connect(bp); bp.connect(g); g.connect(out); src.start(t); src.stop(t + e.dur);
  srcs.push(src);
}

export function playIntroScore(c, dest, at) {
  const verb = makeVerb(c, dest), srcs = [];
  for (const e of INTRO_SCORE) {
    const out = voice(c, dest, verb, e.wet), t = at + e.t;
    if (e.kind === 'bell') playBell(c, out, e, t, srcs);
    else if (e.kind === 'pad') playPad(c, out, e, t, false, srcs);
    else if (e.kind === 'vox') playPad(c, out, e, t, true, srcs);
    else if (e.kind === 'wind') playWind(c, out, e, t, srcs);
  }
  return srcs;
}
