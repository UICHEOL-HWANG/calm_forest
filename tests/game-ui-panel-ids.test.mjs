import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { installEach } from '../js/game-ui/install-each.js';

const dir = new URL('../js/game-ui/', import.meta.url);
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const markupIds = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
const panels = readdirSync(dir).filter((f) => f.endsWith('.js') && !['index.js', 'install-each.js'].includes(f));

test('each panel declares every static element it looks up, so a missing one blocks the whole install', () => {
  for (const f of panels) {
    const src = readFileSync(new URL(f, dir), 'utf8');
    const used = [...src.matchAll(/(?:\$|getElementById)\('([\w-]+)'\)/g)].map((m) => m[1]).filter((id) => markupIds.has(id));
    const declared = src.match(/^export const PANEL_IDS = (\[[^\]]*\]);$/m);
    assert.ok(declared, `${f} has no PANEL_IDS`);
    assert.deepEqual(JSON.parse(declared[1].replace(/'/g, '"')).sort(), [...new Set(used)].sort(), f);
  }
});

test('installGameUi passes each panel its PANEL_IDS', () => {
  const index = readFileSync(new URL('index.js', dir), 'utf8');
  const steps = [...index.matchAll(/\['\w+', [^\]]*?, (\w+)_IDS(?:, \['\w+'\])?\]/g)];
  assert.equal(steps.length, panels.length);
});

test('a panel whose elements are missing is skipped before any listener is attached', () => {
  const ran = [], reported = [];
  const got = installEach([
    ['a', () => { ran.push('a'); return {}; }, ['a-btn']],
    ['b', () => { ran.push('b'); return {}; }, ['b-btn', 'b-close']],
  ], (name, e) => reported.push([name, e.message]), (id) => id !== 'b-close');
  assert.deepEqual(ran, ['a']);
  assert.equal(got.b, null);
  assert.deepEqual(reported, [['b', 'missing #b-close']]);
});
