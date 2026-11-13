import { test } from 'node:test';
import assert from 'node:assert/strict';
import { INSTRUMENTS, CONCERT_DECOR } from '../js/data/concert.js';
import { concertDefault } from '../js/concert/rules.js';
import { hallView, resultView, LANE_COLORS, noteY } from '../js/concert/views.js';

const DAY = '2026-11-14';
const env = (over = {}) => ({ today: DAY, isGuest: false, ownsDecor: () => false, hasArt: () => true, thumbs: {}, ...over });

test('hall shows three songs with stars from the best ratio', () => {
  const v = hallView({ ...concertDefault(), best: { morning: 0.9, march: 0.61, waltz: 0 } }, env());
  assert.deepEqual(v.songs.map(s => s.stars), [3, 2, 0]);
  assert.equal(v.songs.length, 3);
});

test('instrument status covers equipped, owned, buy, short and guest', () => {
  const s = { ...concertDefault(), notes: 30, owned: ['drum', 'maracas'], equipped: 'maracas' };
  const by = (v) => Object.fromEntries(v.instruments.map(i => [i.id, i]));
  const a = by(hallView(s, env()));
  assert.equal(a.maracas.status, 'equipped');
  assert.equal(a.drum.status, 'owned');
  assert.equal(a.bells.status, 'buy');
  assert.equal(a.guitar.status, 'short');
  assert.equal(a.guitar.lack, 10);
  assert.equal(by(hallView(s, env({ isGuest: true }))).bells.status, 'guest');
  assert.equal(a.maracas.cost, INSTRUMENTS.find(i => i.id === 'maracas').cost);
});

test('decor status covers owned, soon, buy, short and guest', () => {
  const s = { ...concertDefault(), notes: 12 };
  const v = hallView(s, env({ ownsDecor: (id) => id === 'musicstand', hasArt: (id) => id !== 'reedorgan' }));
  const by = Object.fromEntries(v.decor.map(d => [d.id, d.status]));
  assert.equal(by.musicstand, 'owned');
  assert.equal(by.reedorgan, 'soon');
  assert.equal(by.metronome, 'short');
  assert.equal(v.decor.length, CONCERT_DECOR.length);
  const rich = hallView({ ...s, notes: 99 }, env());
  assert.ok(rich.decor.every(d => d.status === 'buy'));
});

test('the subtitle tells how many paid shows are left today', () => {
  assert.match(hallView(concertDefault(), env()).sub, /3/);
  assert.equal(hallView({ ...concertDefault(), day: DAY, paid: 3 }, env()).sub.includes('3'), false);
});

test('result lines mention earned notes, or that today is paid out', () => {
  const summary = { perfect: 5, good: 2, miss: 1 };
  const paid = resultView({ stars: 2, earned: 3, bestUp: true, summary });
  assert.ok(paid.lines.some(l => l.includes('3')));
  assert.equal(paid.lines.length, 2);
  const free = resultView({ stars: 2, earned: 0, bestUp: false, summary });
  assert.equal(free.lines.length, 1);
  assert.equal(free.perfect, 5);
});

test('every instrument has two lane colours', () => {
  for (const { id } of INSTRUMENTS) assert.equal(LANE_COLORS[id].length, 2, id);
});

test('a note reaches the hit line exactly at its time', () => {
  assert.equal(noteY(5000, 5000, 1600, 300), 300);
  assert.equal(noteY(5000, 3400, 1600, 300), 0);
  assert.equal(noteY(5000, 4200, 1600, 300), 150);
});
