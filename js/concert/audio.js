import { OUTPUT_LAG_MS } from '../data/concert.js';

const LOOK_AHEAD = 0.15;
const PUMP_MS = 40;
const hz = (midi) => 440 * Math.pow(2, (midi - 69) / 12);

function tone(ctx, out, { at, freq, dur, vol, type = 'triangle', slide = 1 }) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, at);
  if (slide !== 1) osc.frequency.exponentialRampToValueAtTime(freq * slide, at + dur);
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(vol, at + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  osc.connect(gain).connect(out);
  osc.start(at);
  osc.stop(at + dur + 0.05);
}

function noise(ctx, out, { at, dur, vol, band }) {
  const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = band;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(vol, at);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  src.connect(filter).connect(gain).connect(out);
  src.start(at);
  src.stop(at + dur + 0.02);
}

export const VOICES = {
  tick: (ctx, out, e) => noise(ctx, out, { at: e.at, dur: 0.04, vol: 0.12, band: 3200 }),
  bass: (ctx, out, e) => tone(ctx, out, { at: e.at, freq: hz(e.midi), dur: 0.42, vol: 0.2, type: 'sine' }),
  chord: (ctx, out, e) => e.midis.forEach(m => tone(ctx, out, { at: e.at, freq: hz(m + 12), dur: 0.24, vol: 0.045 })),
  lead: (ctx, out, e) => tone(ctx, out, { at: e.at, freq: hz(e.midi), dur: 0.26, vol: 0.06, type: 'sine' }),
};

const strum = (root) => (ctx, out, at) => [0, 4, 7, 12].forEach((s, i) => tone(ctx, out, { at: at + i * 0.012, freq: hz(root + s), dur: 0.5, vol: 0.07 }));
const bell = (midi) => (ctx, out, at) => {
  tone(ctx, out, { at, freq: hz(midi), dur: 0.9, vol: 0.12, type: 'sine' });
  tone(ctx, out, { at, freq: hz(midi) * 2.76, dur: 0.4, vol: 0.03, type: 'sine' });
};

export const HITS = {
  drum: [
    (ctx, out, at) => tone(ctx, out, { at, freq: 150, dur: 0.16, vol: 0.34, type: 'sine', slide: 0.5 }),
    (ctx, out, at) => { noise(ctx, out, { at, dur: 0.09, vol: 0.26, band: 1900 }); tone(ctx, out, { at, freq: 240, dur: 0.07, vol: 0.14 }); },
  ],
  bass: [
    (ctx, out, at) => tone(ctx, out, { at, freq: 78, dur: 0.34, vol: 0.5, type: 'sine', slide: 0.55 }),
    (ctx, out, at) => tone(ctx, out, { at, freq: 96, dur: 0.3, vol: 0.46, type: 'sine', slide: 0.55 }),
  ],
  guitar: [strum(55), strum(60)],
  bells: [bell(84), bell(88)],
  maracas: [
    (ctx, out, at) => noise(ctx, out, { at, dur: 0.07, vol: 0.3, band: 6200 }),
    (ctx, out, at) => noise(ctx, out, { at, dur: 0.07, vol: 0.3, band: 7600 }),
  ],
};

export function createConcertAudio({ ctx, out, on = true, voices = VOICES, hits = HITS }) {
  let t0 = 0;
  let queue = [];
  let next = 0;
  let timer = null;

  const pump = () => {
    const until = ctx.currentTime + LOOK_AHEAD;
    while (next < queue.length && t0 + queue[next].t / 1000 <= until) {
      const e = queue[next];
      next += 1;
      if (on) voices[e.kind]?.(ctx, out, { ...e, at: Math.max(ctx.currentTime, t0 + e.t / 1000) });
    }
  };

  const stop = () => {
    if (timer) clearInterval(timer);
    timer = null;
    queue = [];
    next = 0;
  };

  return {
    start(events, leadInSec = 0.3) {
      stop();
      t0 = ctx.currentTime + leadInSec;
      queue = events;
      pump();
      timer = setInterval(pump, PUMP_MS);
    },
    stop,
    pump,
    nowMs: () => (ctx.currentTime - t0) * 1000 - OUTPUT_LAG_MS,
    hit(instrumentId, lane) {
      if (on) hits[instrumentId]?.[lane]?.(ctx, out, ctx.currentTime);
    },
  };
}
