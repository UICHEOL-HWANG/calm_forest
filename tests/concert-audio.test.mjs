import { test } from 'node:test';
import assert from 'node:assert/strict';
import { OUTPUT_LAG_MS } from '../js/data/concert.js';
import { createConcertAudio, HITS } from '../js/concert/audio.js';

const fake = () => {
  const played = [];
  const ctx = { currentTime: 10 };
  const voices = { tick: (c, o, e) => played.push(['tick', e.at]), bass: (c, o, e) => played.push(['bass', e.at]) };
  return { ctx, played, voices };
};

test('nowMs counts from the lead-in and subtracts the output lag', () => {
  const { ctx, voices } = fake();
  const audio = createConcertAudio({ ctx, out: {}, voices });
  audio.start([], 0.3);
  assert.ok(Math.abs(audio.nowMs() - (-300 - OUTPUT_LAG_MS)) < 1e-6);
  ctx.currentTime = 11.3;
  assert.ok(Math.abs(audio.nowMs() - (1000 - OUTPUT_LAG_MS)) < 1e-6);
  audio.stop();
});

test('only events inside the look-ahead are scheduled, each once', () => {
  const { ctx, played, voices } = fake();
  const audio = createConcertAudio({ ctx, out: {}, voices });
  audio.start([{ t: 0, kind: 'tick' }, { t: 100, kind: 'bass' }, { t: 5000, kind: 'tick' }], 0);
  assert.deepEqual(played.map(p => p[0]), ['tick', 'bass']);
  assert.ok(Math.abs(played[1][1] - 10.1) < 1e-9);
  audio.pump();
  assert.equal(played.length, 2);
  ctx.currentTime = 14.9;
  audio.pump();
  assert.equal(played.length, 3);
  assert.ok(Math.abs(played[2][1] - 15) < 1e-9);
  audio.stop();
});

test('sound off schedules nothing but the clock still runs', () => {
  const { ctx, played, voices } = fake();
  const audio = createConcertAudio({ ctx, out: {}, on: false, voices });
  audio.start([{ t: 0, kind: 'tick' }], 0);
  ctx.currentTime = 10.5;
  assert.equal(played.length, 0);
  assert.ok(audio.nowMs() > 400);
  audio.stop();
});

test('every instrument has a left and a right hit sound', () => {
  for (const id of ['drum', 'maracas', 'bells', 'bass', 'guitar']) {
    assert.equal(HITS[id].length, 2, id);
    assert.equal(typeof HITS[id][0], 'function');
    assert.equal(typeof HITS[id][1], 'function');
  }
});
