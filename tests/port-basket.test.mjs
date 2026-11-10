import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { basketKey } from '../js/port/basket.js';
import { PANTRY_KEYS } from '../js/port/data.js';

test('basketKey lists every pantry slot in order and clamps bad values to zero', () => {
  assert.equal(basketKey({ fish: 5, shrimp: 2, squid: -3, clam: 'x' }).split(',').length, PANTRY_KEYS.length);
  assert.equal(basketKey({}), PANTRY_KEYS.map(() => 0).join(','));
  const k = basketKey({ fish: 5, shrimp: 2, squid: -3 }).split(',').map(Number);
  assert.equal(k[PANTRY_KEYS.indexOf('fish')], 5);
  assert.equal(k[PANTRY_KEYS.indexOf('squid')], 0);
});

test('island HUD turns on when landing and off when boarding or leaving the port', () => {
  const src = readFileSync(new URL('../js/port/index.js', import.meta.url), 'utf8');
  const fn = name => src.slice(src.indexOf(`function ${name}(`), src.indexOf('\n}\n', src.indexOf(`function ${name}(`)));
  assert.match(fn('arriveIsland'), /setIslandHud\(env\.hudRoot, true\)/);
  assert.match(fn('leaveIsland'), /setIslandHud\(env\.hudRoot, false\)/);
  assert.match(fn('leavePort'), /setIslandHud\(env\.hudRoot, false\)/);
});

test('basket is styled as the wooden crate and only shows on the island', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /#port-basket \{ display: none;/);
  assert.match(html, /body\.port-island #port-basket \{ display: flex; \}/);
  assert.match(html, /body\.port-island #sea-btn \{[^}]*background: var\(--mint\)/);
});
