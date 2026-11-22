import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../js/spaces/glade.js', import.meta.url), 'utf8');

test('glade reads the night rules and reports the night kind on catches', () => {
  assert.match(src, /from '\.\.\/glade\/night\.js'/);
  assert.match(src, /nightNow\(\)\.tune\.dimChance/);
  assert.match(src, /mode: nightNow\(\)\.kind/);
  assert.match(src, /gladeNightSeen/);
});

test('dev overrides only work on a local host', () => {
  assert.match(src, /localhost\|127\\\.0\\\.0\\\.1/);
});

test('glade builds the string lights and counts every catch into them', () => {
  assert.match(src, /from '\.\.\/glade\/string-art\.js'/);
  assert.match(src, /layoutAnchors\(/);
  assert.match(src, /function noteCatch\(/);
  assert.match(src, /awardBadge\('glade_ring'\)/);
  assert.match(src, /trackEvent\('glade_string', \{ step: /);
});

test('string progress is saved only inside hintsSeen', () => {
  assert.match(src, /gladeCaught: r\.caught, gladeSeg: r\.seg, gladeString: r\.string/);
  assert.doesNotMatch(src, /gameState\.glade/);
});
