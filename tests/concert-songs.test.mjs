import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SONG_IDS, JUDGE_MS } from '../js/data/concert.js';
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
  const n = (id) => chartOf(id).length;
  assert.ok(n('morning') >= 60 && n('morning') <= 80, `morning ${n('morning')}`);
  assert.ok(n('march') >= 100 && n('march') <= 125, `march ${n('march')}`);
  assert.ok(n('waltz') >= 140 && n('waltz') <= 170, `waltz ${n('waltz')}`);
  for (const id of SONG_IDS) assert.ok(lengthMs(id) >= 55000 && lengthMs(id) <= 75000, `${id} ${lengthMs(id)}`);
});

test('same-lane notes are wider apart than two good windows', () => {
  for (const id of SONG_IDS) assert.ok(minGapMs(chartOf(id)) > JUDGE_MS.good * 2, `${id} ${minGapMs(chartOf(id))}`);
});

test('the easy song strictly alternates lanes and has no double notes', () => {
  const chart = chartOf('morning');
  assert.ok(SONGS.morning.bars.every(b => !b.includes('B')));
  assert.ok(chart.every((e, i) => i === 0 || e.lane !== chart[i - 1].lane));
});

test('double notes belong to the hard song, apart from the march closing accent', () => {
  assert.ok(SONGS.march.bars.slice(0, -1).every(b => !b.includes('B')));
  assert.ok(SONGS.waltz.bars.some(b => b.includes('B')));
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
