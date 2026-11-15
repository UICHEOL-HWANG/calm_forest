export const SONG_IDS = Object.freeze(['morning', 'march', 'waltz', 'lullaby', 'polka', 'firefly']);
export const BASE_INSTRUMENT = 'drum';

export const INSTRUMENTS = Object.freeze([
  Object.freeze({ id: 'drum', cost: 0 }),
  Object.freeze({ id: 'maracas', cost: 20 }),
  Object.freeze({ id: 'bells', cost: 25 }),
  Object.freeze({ id: 'bass', cost: 35 }),
  Object.freeze({ id: 'guitar', cost: 40 }),
]);

export const CONCERT_DECOR = Object.freeze([
  Object.freeze({ id: 'musicstand', kind: 'indoor', cost: 10 }),
  Object.freeze({ id: 'metronome', kind: 'indoor', cost: 15 }),
  Object.freeze({ id: 'musicbox', kind: 'indoor', cost: 20 }),
  Object.freeze({ id: 'noteflags', kind: 'outdoor', cost: 25 }),
  Object.freeze({ id: 'hornpost', kind: 'outdoor', cost: 30 }),
  Object.freeze({ id: 'reedorgan', kind: 'outdoor', cost: 30 }),
]);
export const CONCERT_DECOR_IDS = Object.freeze(CONCERT_DECOR.map(d => d.id));

export const PAID_PLAYS = 3;
export const STAR_CUTS = Object.freeze({
  morning: Object.freeze([0.3, 0.6, 0.85]),
  march: Object.freeze([0.3, 0.6, 0.85]),
  waltz: Object.freeze([0.3, 0.6, 0.8]),
  lullaby: Object.freeze([0.3, 0.6, 0.85]),
  polka: Object.freeze([0.3, 0.6, 0.85]),
  firefly: Object.freeze([0.3, 0.6, 0.8]),
});
export const JUDGE_MS = Object.freeze({ perfect: 70, good: 140 });
export const OUTPUT_LAG_MS = 30;

export const STAGE_POS = Object.freeze({ x: -4.5, z: 17.5 });
export const SPOT_R = 2.4;
