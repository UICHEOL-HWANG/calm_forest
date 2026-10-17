import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const src = f => readFileSync(new URL(`../js/${f}`, import.meta.url), 'utf8');
const between = (s, a, len) => s.slice(s.indexOf(a), s.indexOf(a) + len);

test('sound.js has the quiet snowfield theme for climbing and for the sled run', () => {
  const s = src('sound.js');
  assert.match(s, /bgmTheme === 'snow' \? playSnowBar/);
  assert.match(s, /bgmTheme === 'snowsled' \? playSnowSledBar/);
  assert.match(s, /bgmTheme === 'snow' \? SNOW_BAR/);
  assert.match(s, /bgmTheme === 'snowsled' \? SNOW_SLED_BAR/);
  assert.match(s, /const SNOW_BAR = 4800;/);
  assert.match(s, /const SNOW_SLED_BAR = 2400;/);
});

test('both snow bars use the same chord loop and instruments', () => {
  const s = src('sound.js');
  const climb = between(s, 'function playSnowBar', 900);
  const sled = between(s, 'function playSnowSledBar', 900);
  assert.match(climb, /SNOW_CHORDS\[/);
  assert.match(sled, /SNOW_CHORDS\[/);
  assert.match(climb, /snowWind\(/);
  assert.match(sled, /kick\(/);
});

test('the mountain plays snow outside, the sled theme during a run, and main back in the village', () => {
  const s = src('spaces/mountain.js');
  assert.match(between(s, 'export function enterMountain', 1200), /setBGMTheme\('snow'\)/);
  assert.match(between(s, 'export function exitMountain', 900), /setBGMTheme\('main'\)/);
  assert.match(between(s, 'function startSled', 1400), /setBGMTheme\('snowsled'\)/);
  assert.doesNotMatch(between(s, 'function closeRun', 600), /setBGMTheme/);
  assert.match(s, /showResult\([^\n]*\(\) => \{ showSled\(false\); closeRun\(\); setBGMTheme\('snow'\); \}\);/);
  const exit = between(s, 'export function exitMountain', 900);
  assert.ok(exit.indexOf('abandonRun()') < exit.indexOf("setBGMTheme('main')"));
  assert.doesNotMatch(between(s, 'export function enterMountain', 1200), /setBGMTheme\('main'\)/);
});
