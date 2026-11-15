import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { installEach } from '../js/game-ui/install-each.js';

test('one panel failing to install leaves the others installed and is reported', () => {
  const reported = [];
  const got = installEach([
    ['a', () => ({ open: 'a' })],
    ['b', () => { throw new Error('missing #b-btn'); }],
    ['c', (prev) => ({ open: 'c', sawA: prev.a?.open })],
  ], (name, e) => reported.push([name, e.message]));
  assert.deepEqual(got.a, { open: 'a' });
  assert.equal(got.b, null);
  assert.deepEqual(got.c, { open: 'c', sawA: 'a' });
  assert.deepEqual(reported, [['b', 'missing #b-btn']]);
});

test('a panel whose dependency failed is skipped before it can run', () => {
  const reported = [];
  let ran = false;
  const got = installEach([
    ['cook', () => { throw new Error('boom'); }],
    ['kitchen', () => { ran = true; return {}; }, [], ['cook']],
  ], (name, e) => reported.push([name, e.message]), () => true);
  assert.equal(ran, false);
  assert.equal(got.kitchen, null);
  assert.deepEqual(reported, [['cook', 'boom'], ['kitchen', 'needs cook']]);
});

test('workbench needs carving and kitchen needs the cooking course', () => {
  const src = readFileSync(new URL('../js/game-ui/index.js', import.meta.url), 'utf8');
  assert.match(src, /\['bench', [^\n]*BENCH_IDS, \['carve'\]\]/);
  assert.match(src, /\['kitchen', [^\n]*KITCHEN_IDS, \['cook'\]\]/);
});

test('installGameUi isolates every panel and reports failures through console.error', () => {
  const src = readFileSync(new URL('../js/game-ui/index.js', import.meta.url), 'utf8');
  assert.match(src, /installEach\(\[/);
  assert.match(src, /console\.error\(`\[game-ui\] \$\{name\} install failed`, e\)/);
});

test('delegates called from shared paths tolerate a panel that failed to install', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  for (const [name, panel] of [['renderShop', 'shop'], ['renderBench', 'bench'], ['renderKitchen', 'kitchen'], ['renderBag', 'bag'], ['nudgeGuideOnce', 'guide']]) {
    assert.match(html, new RegExp(`const ${name} = \\([^)]*\\) => gameUi\\?\\.${panel}\\?\\.`), name);
  }
});

test('no game panel delegate dereferences a panel without optional chaining', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const delegates = html.match(/^ *const \w+ = \([^)]*\) => gameUi[^\n]*$/gm) || [];
  assert.ok(delegates.length >= 20, `found ${delegates.length} delegates`);
  for (const d of delegates) assert.match(d, /gameUi\?\.\w+\?\./, d.trim());
});
