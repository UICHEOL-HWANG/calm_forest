import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LEGACY_FIRST_DAY, resolveFirstDay, ensureFirstDay, isMountainOpen } from '../js/mountain/unlock.js';
import { gameSource } from './helpers/game-source.mjs';

test('existing save without firstDay is treated as legacy and opens immediately', () => {
  assert.equal(resolveFirstDay(undefined), LEGACY_FIRST_DAY);
  assert.equal(isMountainOpen(LEGACY_FIRST_DAY, '2026-10-20'), true);
});

test('valid saved firstDay is kept, garbage becomes legacy', () => {
  assert.equal(resolveFirstDay('2026-10-19'), '2026-10-19');
  assert.equal(resolveFirstDay('2026-1-9'), LEGACY_FIRST_DAY);
  assert.equal(resolveFirstDay(20261019), LEGACY_FIRST_DAY);
});

test('new player gets today and the mountain opens the next day', () => {
  const first = ensureFirstDay(null, '2026-10-20');
  assert.equal(first, '2026-10-20');
  assert.equal(isMountainOpen(first, '2026-10-20'), false);
  assert.equal(isMountainOpen(first, '2026-10-21'), true);
});

test('ensureFirstDay never overwrites an existing value', () => {
  assert.equal(ensureFirstDay('2026-10-01', '2026-10-20'), '2026-10-01');
});

test('null firstDay is closed', () => {
  assert.equal(isMountainOpen(null, '2026-10-20'), false);
});

test('game.js saves and restores firstDay through resolveFirstDay', () => {
  const src = gameSource();
  assert.match(src, /firstDay:\s*null/);
  assert.match(src, /gameState\.firstDay\s*=\s*resolveFirstDay\(saved\.firstDay\)/);
  assert.match(src, /gameState\.firstDay\s*=\s*ensureFirstDay\(gameState\.firstDay,\s*todayStr\(\)\)/);
});
