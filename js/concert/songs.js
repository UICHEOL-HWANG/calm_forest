const CHORDS = Object.freeze({
  C: [48, 52, 55], G: [43, 47, 50], Am: [45, 48, 52], F: [41, 45, 48], D: [50, 54, 57], Em: [40, 43, 47],
});

const join = (...parts) => Object.freeze(parts.flat());

const MORNING_A = ['L...R...', 'L...R...', 'L.R.L.R.', 'L...R...'];
const MORNING_B = ['L.R.L.R.', 'L...R...', 'L.R.L.R.', 'L.R.L.R.'];
const MARCH_P = ['L.R.L.R.', 'L.L.R.R.', 'L.R.L.R.', 'LRL.R.R.'];
const MARCH_Q = ['L.LRL.R.', 'R.RLR.L.', 'L.R.LRL.', 'R.L.R.L.'];
const WALTZ_S = ['L.R.R.', 'R.L.L.', 'L.R...', 'B.L.R.'];
const WALTZ_U = ['L.RLR.', 'R.L.L.', 'B.R.L.', 'L.RLR.'];

export const SONGS = Object.freeze({
  morning: Object.freeze({
    id: 'morning', bpm: 92, slots: 8, chords: ['C', 'G', 'Am', 'F'],
    bars: join(MORNING_A, MORNING_A, MORNING_B, MORNING_A, MORNING_B, ['L.R.L.R.', 'L...R...', 'L.......']),
  }),
  march: Object.freeze({
    id: 'march', bpm: 112, slots: 8, chords: ['G', 'D', 'Em', 'C'],
    bars: join(MARCH_P, MARCH_Q, MARCH_P, MARCH_Q, MARCH_P, MARCH_Q, ['L.R.L.R.', 'B.......']),
  }),
  waltz: Object.freeze({
    id: 'waltz', bpm: 132, slots: 6, chords: ['Am', 'F', 'C', 'G'],
    bars: join(WALTZ_S, WALTZ_S, WALTZ_U, WALTZ_S, WALTZ_U, WALTZ_S, WALTZ_U, WALTZ_S, WALTZ_U, WALTZ_S, WALTZ_U, WALTZ_U, ['B.....']),
  }),
});

const COUNT_IN = 1;
const TAIL = 1;

export const slotMs = (song) => 30000 / song.bpm;
const at = (song, bar, slot) => Math.round((bar * song.slots + slot) * slotMs(song));

export function chartOf(id) {
  const song = SONGS[id];
  const out = [];
  song.bars.forEach((bar, bi) => [...bar].forEach((ch, si) => {
    const t = at(song, bi + COUNT_IN, si);
    if (ch === 'L' || ch === 'B') out.push({ t, lane: 0 });
    if (ch === 'R' || ch === 'B') out.push({ t, lane: 1 });
  }));
  return out;
}

export const lengthMs = (id) => at(SONGS[id], SONGS[id].bars.length + COUNT_IN + TAIL, 0);

export function minGapMs(chart) {
  const last = [-Infinity, -Infinity];
  let gap = Infinity;
  for (const note of chart) {
    gap = Math.min(gap, note.t - last[note.lane]);
    last[note.lane] = note.t;
  }
  return gap;
}

const beatSlots = (song) => Array.from({ length: song.slots / 2 }, (_, i) => i * 2);

export function backingEvents(id) {
  const song = SONGS[id];
  const out = beatSlots(song).map(slot => ({ t: at(song, 0, slot), kind: 'tick' }));
  song.bars.forEach((bar, bi) => {
    const tones = CHORDS[song.chords[bi % song.chords.length]];
    const b = bi + COUNT_IN;
    out.push({ t: at(song, b, 0), kind: 'bass', midi: tones[0] - 12 });
    if (song.slots === 8) out.push({ t: at(song, b, 4), kind: 'bass', midi: tones[2] - 12 });
    for (const slot of beatSlots(song).slice(1)) {
      if (song.slots === 8 && slot === 4) continue;
      out.push({ t: at(song, b, slot), kind: 'chord', midis: tones });
    }
    [...bar].forEach((ch, si) => {
      if (ch !== '.') out.push({ t: at(song, b, si), kind: 'lead', midi: tones[(bi + si) % 3] + 24 });
    });
  });
  return out.sort((a, b) => a.t - b.t);
}

const PRACTICE_BEAT = 650;
export const PRACTICE_LENGTH_MS = PRACTICE_BEAT * 10;
export const practiceChart = () => [0, 1, 0, 1].map((lane, i) => ({ t: PRACTICE_BEAT * (4 + i), lane }));
export const practiceEvents = () => Array.from({ length: 8 }, (_, i) => ({ t: PRACTICE_BEAT * i, kind: 'tick' }));
