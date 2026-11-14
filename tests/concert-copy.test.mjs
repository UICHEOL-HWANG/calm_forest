import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SONG_IDS, INSTRUMENTS } from '../js/data/concert.js';
import { CONCERT_COPY } from '../js/concert/copy.js';
import { SONGS } from '../js/concert/songs.js';

const flat = (o) => Object.values(o).flatMap(v => (typeof v === 'string' ? [v] : flat(v)));

test('every song and instrument has a name', () => {
  for (const id of [...SONG_IDS, ...Object.keys(SONGS)]) { assert.ok(CONCERT_COPY.song[id], id); assert.ok(CONCERT_COPY.level[id], id); }
  for (const { id } of INSTRUMENTS) assert.ok(CONCERT_COPY.inst[id]);
});

test('copy avoids the em dash and the banned verb', () => {
  for (const line of flat(CONCERT_COPY)) {
    assert.ok(!line.includes('—'), line);
    assert.ok(!/놀[아았이며고]/.test(line), line);
  }
});

test('every Korean line has an English value', () => {
  const en = readFileSync(new URL('../js/i18n-en.js', import.meta.url), 'utf8');
  for (const line of flat(CONCERT_COPY)) assert.ok(en.includes(line), line);
});
