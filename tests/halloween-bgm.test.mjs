import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const src = f => readFileSync(new URL(`../js/${f}`, import.meta.url), 'utf8');
const between = (s, a, len) => s.slice(s.indexOf(a), s.indexOf(a) + len);

test('sound.js has the misty theremin theme for the ghost garden', () => {
  const s = src('sound.js');
  assert.match(s, /bgmTheme === 'halloween' \? playHalloweenBar/);
  assert.match(s, /bgmTheme === 'halloween' \? HW_BAR/);
  assert.match(s, /const HW_BAR = 4800;/);
  const bar = between(s, 'function playHalloweenBar', 900);
  assert.match(bar, /HW_CHORDS\[/);
  assert.match(bar, /theremin\(/);
  assert.match(bar, /snowWind\(/);
  assert.match(bar, /out: musicGain/);
});

test('the theremin plays on the music bus with vibrato', () => {
  const t = between(src('sound.js'), 'function theremin', 900);
  assert.match(t, /connect\(musicGain\)/);
  assert.match(t, /lfo\.connect\(depth\)\.connect\(osc\.frequency\)/);
  assert.match(t, /lfo\.stop\(/);
});

test('the garden switches to the halloween theme on entry and back to main on exit', () => {
  const s = src('spaces/halloween.js');
  assert.match(between(s, 'export function enterHalloween', 1200), /setBGMTheme\('halloween'\)/);
  assert.match(between(s, 'export function exitHalloween', 900), /setBGMTheme\('main'\)/);
  assert.doesNotMatch(between(s, 'export function enterHalloween', 1200), /setBGMTheme\('main'\)/);
});
