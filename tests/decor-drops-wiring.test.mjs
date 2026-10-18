import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

const SITES = [
  ['../js/game.js', 'cook'], ['../js/spaces/orchard-actions.js', 'orchard'], ['../js/spaces/farm-auto.js', 'crop'],
  ['../js/spaces/dream.js', 'dream'], ['../js/mountain/sled-run.js', 'sled'], ['../js/observatory/star-run.js', 'star'],
  ['../js/spaces/mine.js', 'mine'], ['../js/spaces/carving.js', 'carve'], ['../js/spaces/river.js', 'ferry'],
  ['../js/spaces/ferry-quiz-run.js', 'ferry'], ['../js/spaces/mist.js', 'mist'], ['../js/duel/index.js', 'duel'],
  ['../js/spaces/glade.js', 'firefly'],
];

test('every minigame calls onPlay with its source', () => {
  for (const [f, src] of SITES) {
    const s = read(f);
    assert.ok(s.includes(`onPlay('${src}')`), `${f} → ${src}`);
    assert.match(s, /import \{[^}]*\bonPlay\b[^}]*\} from '[./]+\/?decor-drops\/index\.js'/, `${f} import`);
  }
});

test('abandon, quit and practice do not roll', () => {
  assert.match(read('../js/game.js'), /if \(!res\.abandoned\) onPlay\('cook'\)/);
  assert.match(read('../js/spaces/carving.js'), /if \(kind !== 'abandon'\) onPlay\('carve'\)/);
  assert.match(read('../js/spaces/river.js'), /if \(result !== 'quit'\) onPlay\('ferry'\)/);
  assert.match(read('../js/spaces/ferry-quiz-run.js'), /if \(!quit\) onPlay\('ferry'\)/);
  const mist = read('../js/spaces/mist.js');
  const end = mist.slice(mist.indexOf('export function mistEnd('));
  assert.ok(end.indexOf("onPlay('mist')") > end.indexOf('endPractice('), 'mist roll after practice early-return');
  assert.match(end, /if \(result !== 'quit'\) onPlay\('mist'\)/);
});

test('no fishing or sea call', () => {
  for (const f of ['../js/spaces/fishing.js', '../js/spaces/sea.js']) assert.doesNotMatch(read(f), /onPlay\(/);
});

test('drops default and restore through normalizeDrops', () => {
  const g = read('../js/game.js');
  assert.match(g, /\bdrops: \{\},/);
  assert.match(g, /gameState\.drops = normalizeDrops\(saved\.drops\)/);
});

test('decor_drop and decor_set_complete carry at most 5 params', () => {
  const ix = read('../js/decor-drops/index.js');
  for (const ev of ['decor_drop', 'decor_set_complete']) {
    const m = ix.match(new RegExp(`trackEvent\\('${ev}', \\{([^}]*)\\}`));
    assert.ok(m, ev);
    assert.ok(m[1].split(',').filter(s => s.trim()).length <= 5, ev);
  }
});

test('grant writes stored and grantedDecor without replacing house', () => {
  const ix = read('../js/decor-drops/index.js');
  assert.doesNotMatch(ix, /gameState\.house = /);
  assert.match(ix, /gameState\.house\.stored = \{/);
  assert.match(ix, /gameState\.house\.grantedDecor = \[/);
});

test('dev force flag only in dev sessions', () => {
  assert.match(read('../js/decor-drops/index.js'), /IS_DEV_SESSION && new URLSearchParams\(location\.search\)\.get\('drop'\) === 'force'/);
});
