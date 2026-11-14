import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SONG_IDS, STAR_CUTS, JUDGE_MS } from '../js/data/concert.js';
import { CONCERT_COPY } from '../js/concert/copy.js';
import { SONGS, slotMs, chartOf, lengthMs, minGapMs, backingEvents, practiceChart, practiceEvents, PRACTICE_LENGTH_MS } from '../js/concert/songs.js';

const sorted = (list) => list.every((e, i) => i === 0 || list[i - 1].t <= e.t);

test('every song id has a song with full bars', () => {
  for (const id of SONG_IDS) {
    const s = SONGS[id];
    assert.equal(s.id, id);
    for (const bar of s.bars) {
      assert.equal(bar.length, s.slots, `${id} ${bar}`);
      assert.match(bar, /^[LRB.]+$/);
    }
  }
});

test('charts are time ordered and start after the count-in bar', () => {
  for (const id of SONG_IDS) {
    const chart = chartOf(id);
    assert.ok(sorted(chart), id);
    assert.ok(chart[0].t >= SONGS[id].slots * slotMs(SONGS[id]) - 1, id);
    assert.ok(chart.at(-1).t < lengthMs(id), id);
  }
});

test('note counts and lengths sit in the planned ranges', () => {
  const ranges = {
    morning: [60, 80], march: [100, 125], waltz: [140, 170],
    lullaby: [55, 70], polka: [110, 130], firefly: [160, 185],
  };
  for (const id of SONG_IDS) {
    const n = chartOf(id).length;
    assert.ok(n >= ranges[id][0] && n <= ranges[id][1], `${id} ${n}`);
    assert.ok(lengthMs(id) >= 55000 && lengthMs(id) <= 75000, `${id} ${lengthMs(id)}`);
  }
});

test('same-lane notes are wider apart than two good windows', () => {
  for (const id of SONG_IDS) {
    assert.ok(minGapMs(chartOf(id)) > JUDGE_MS.good * 2, `${id} ${minGapMs(chartOf(id))}`);
    assert.ok(minGapMs(chartOf(id)) >= 290, `${id} ${minGapMs(chartOf(id))}`);
  }
});

test('song ids, songs and star cuts stay in step, new songs reuse the star cuts of their level', () => {
  assert.deepEqual([...SONG_IDS], Object.keys(SONGS));
  assert.deepEqual(Object.keys(STAR_CUTS), [...SONG_IDS]);
  assert.deepEqual(SONG_IDS.slice(3), ['lullaby', 'polka', 'firefly']);
  assert.deepEqual(STAR_CUTS.lullaby, STAR_CUTS.morning);
  assert.deepEqual(STAR_CUTS.polka, STAR_CUTS.march);
  assert.deepEqual(STAR_CUTS.firefly, STAR_CUTS.waltz);
});

test('every song has its own chord progression and playable backing pitches', () => {
  const seen = new Set();
  for (const id of SONG_IDS) {
    const key = SONGS[id].chords.join(' ');
    assert.ok(!seen.has(key), `${id} repeats ${key}`);
    seen.add(key);
    for (const e of backingEvents(id)) {
      for (const m of e.midis ?? (e.midi === undefined ? [] : [e.midi])) assert.ok(Number.isFinite(m) && m >= 24 && m <= 96, `${id} ${m}`);
    }
  }
});

test('the new songs end on a clear last bar and repeat their sections', () => {
  for (const id of ['lullaby', 'polka', 'firefly']) {
    const bars = SONGS[id].bars;
    assert.ok(bars.at(-1).replace(/\./g, '').length <= 2, id);
    const counts = new Map();
    for (const b of bars) counts.set(b, (counts.get(b) || 0) + 1);
    assert.ok([...counts.values()].some(c => c >= 4), id);
  }
});

test('every easy song strictly alternates lanes and has no double notes', () => {
  const easy = SONG_IDS.filter(id => CONCERT_COPY.level[id] === '쉬움');
  assert.ok(easy.includes('morning') && easy.includes('lullaby'));
  for (const id of easy) {
    const chart = chartOf(id);
    assert.ok(SONGS[id].bars.every(b => !b.includes('B')), id);
    assert.ok(chart.every((e, i) => i === 0 || e.lane !== chart[i - 1].lane), id);
  }
});

test('double notes belong to the hard song, apart from the march closing accent', () => {
  assert.ok(SONGS.march.bars.slice(0, -1).every(b => !b.includes('B')));
  assert.ok(SONGS.waltz.bars.some(b => b.includes('B')));
  assert.ok(SONGS.firefly.bars.some(b => b.includes('B')));
  assert.ok(SONGS.lullaby.bars.every(b => !b.includes('B')));
  assert.ok(SONGS.polka.bars.slice(0, -1).every(b => !b.includes('B')));
});

test('backing events are ordered, tick through the count-in, and lead on every chart time', () => {
  for (const id of SONG_IDS) {
    const ev = backingEvents(id);
    assert.ok(sorted(ev), id);
    const bar = SONGS[id].slots * slotMs(SONGS[id]);
    assert.ok(ev.filter(e => e.t < bar - 1).every(e => e.kind === 'tick'), id);
    const leads = new Set(ev.filter(e => e.kind === 'lead').map(e => e.t));
    for (const note of chartOf(id)) assert.ok(leads.has(note.t), `${id} ${note.t}`);
  }
});

test('practice is four alternating notes with ticks only', () => {
  const chart = practiceChart();
  assert.deepEqual(chart.map(e => e.lane), [0, 1, 0, 1]);
  assert.ok(practiceEvents().every(e => e.kind === 'tick'));
  assert.ok(chart.at(-1).t < PRACTICE_LENGTH_MS);
});
