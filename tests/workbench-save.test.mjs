import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { restoreToolStars, restoreForge, defaultToolStars } from '../js/workbench/rules.js';

const GAME = readFileSync(new URL('../js/game.js', import.meta.url), 'utf8');
const FORGE = readFileSync(new URL('../js/workbench/forge.js', import.meta.url), 'utf8');
const INDEX = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const fnBody = (src, name) => {
  const i = src.indexOf(`function ${name}(`);
  return src.slice(i, src.indexOf('\n}\n', i));
};

test('new saves start with zero stars and an empty anvil', () => {
  assert.match(GAME, /toolStars: defaultToolStars\(\),\n\s+forge: null,/);
});

test('old saves without the keys restore to defaults', () => {
  const old = { upgrades: { rod: true } };
  const stars = restoreToolStars(old.toolStars);
  assert.deepEqual(stars, defaultToolStars());
  assert.equal(restoreForge(old.forge, stars), null);
});

test('stars and anvil are restored before the held tool and house sign refresh', () => {
  const stars = GAME.indexOf('gameState.toolStars = restoreToolStars(saved.toolStars);');
  const forge = GAME.indexOf('gameState.forge = restoreForge(saved.forge, gameState.toolStars);');
  const upgrades = GAME.indexOf('if (saved.upgrades) {');
  assert.ok(stars > 0 && forge > stars && upgrades > forge);
});

test('a star finishes after sleeping and on the first login of a new day', () => {
  assert.match(fnBody(GAME, 'wakeToMorning'), /settleForge\(true\)/);
  const craft = GAME.indexOf('  catchUpCraft();                      ');
  assert.ok(craft > 0);
  assert.match(GAME.slice(craft, craft + 200), /settleForge\(false\)/);
});

test('forge events stay small', () => {
  for (const m of FORGE.matchAll(/trackEvent\('(forge_\w+)', \{([^}]*)\}/g)) {
    const keys = m[2].split(',').map(s => s.trim().split(':')[0]).filter(Boolean);
    assert.ok(keys.length <= 5, `${m[1]}: ${keys.length}`);
  }
  assert.deepEqual([...FORGE.matchAll(/trackEvent\('(forge_\w+)'/g)].map(m => m[1]), ['forge_start', 'forge_result', 'forge_done']);
});

test('no new module script tag in index.html', () => {
  assert.equal((INDEX.match(/<script type="module"/g) || []).length, 3);
});
