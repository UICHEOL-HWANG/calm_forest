import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  MUD_SPECIES, DIVE_SPECIES, FORAGE_KEYS, FORAGE_SELL, FORAGE_ICO, FORAGE_LABEL, FORAGE_META,
} from '../js/forage/logic.js';

const read = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const ALL = [...MUD_SPECIES, ...DIVE_SPECIES];

test('one source of truth lists all 11 sea items with icon, name and sell price', () => {
  assert.deepEqual(FORAGE_KEYS, ALL.map(s => s.key));
  assert.equal(FORAGE_KEYS.length, 11);
  for (const s of ALL) {
    assert.equal(FORAGE_SELL[s.key], s.sell);
    assert.equal(FORAGE_ICO[s.key], s.ico);
    assert.equal(FORAGE_LABEL[s.key], s.ico + s.name);
    assert.deepEqual(FORAGE_META[s.key], { ico: s.ico, name: s.name });
  }
});

test('sell price table spreads the forage prices', () => {
  const src = read('js/data/catalog.js');
  assert.match(src, /import \{[^}]*FORAGE_SELL[^}]*\} from '\.\.\/forage\/logic\.js'/);
  assert.match(src, /export const SELL_PRICE = \{[^\n]*\.\.\.FORAGE_SELL/);
});

test('sell icon table spreads the forage icons', () => {
  const src = read('js/data/places.js');
  assert.match(src, /import \{[^}]*FORAGE_ICO[^}]*\} from '\.\.\/forage\/logic\.js'/);
  assert.match(src, /export const SELL_ICO_G = \{[^\n]*\.\.\.FORAGE_ICO/);
});

test('reward labels spread the forage labels', () => {
  const src = read('js/game.js');
  assert.match(src, /FORAGE_LABEL[^\n]*from '\.\/forage\/logic\.js'/);
  assert.match(src, /const RES_LABEL = \{[^\n]*\.\.\.FORAGE_LABEL/);
});

test('bag shows a sea section and the sell list names sea items', () => {
  const src = read('index.html');
  assert.match(src, /import \{[^}]*FORAGE_META[^}]*\} from '\.\/js\/forage\/logic\.js'/);
  assert.match(src, /\.\.\.FORAGE_META,\s*\n\s*\};/);
  assert.match(src, /\{ name: '🌊 바다', keys: FORAGE_KEYS \}/);
  assert.match(src, /FORAGE_META\[k\] \? `<b>\$\{FORAGE_META\[k\]\.name\}<\/b> ` : ''/);
});

test('sea item names and labels translate to English', async () => {
  globalThis.location = { search: '?lang=en', hostname: 'localhost', href: 'http://localhost/', reload() {} };
  globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
  try { globalThis.navigator ??= { language: 'en-US', languages: ['en-US'] }; } catch { }
  const { t, setLang } = await import('../js/i18n.js');
  setLang('en');
  for (const s of ALL) {
    for (const ko of [s.name, FORAGE_LABEL[s.key]]) {
      const en = t(ko);
      assert.doesNotMatch(en, /[가-힣]/, `${ko} → ${en}`);
    }
  }
});
