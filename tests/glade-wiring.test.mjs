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
