import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

test('game.js only wires the concert module', () => {
  const game = read('js/game.js');
  const lines = game.split('\n').filter(l => /concert/i.test(l));
  assert.ok(lines.length <= 16, `${lines.length} concert lines:\n${lines.join('\n')}`);
  assert.ok(!/function\s+\w*concert/i.test(game));
  for (const k of ["from './concert/index.js'", "from './concert/bridge.js'", 'initConcert(', 'updateConcert(', 'concertSpotNow()', 'openConcert()', 'concert: concertDefault()', 'restoreConcert(saved.concert)', "rollDifficulty('concert')", "settleDifficulty('concert'", "trackDiffAbandon('concert'"]) {
    assert.ok(game.includes(k), k);
  }
});

test('the concert dev hook sits once, right after the weekly hook', () => {
  const game = read('js/game.js');
  const hook = 'window.__concert = concertDev();';
  assert.equal(game.split(hook).length - 1, 1);
  const gap = game.indexOf(hook) - game.indexOf('window.__weekly = weeklyDev();');
  assert.ok(gap > 0 && gap < 200, String(gap));
});

test('doors shows the concert prompt', () => {
  const doors = read('js/spaces/doors.js');
  assert.match(doors, /concertSpotNow\(\)/);
  assert.match(doors, /concertPrompt\(\)/);
});

test('concert modules stay out of game.js internals', () => {
  for (const f of ['index', 'rules', 'judge', 'songs', 'audio', 'track', 'bridge', 'views']) {
    assert.doesNotMatch(read(`js/concert/${f}.js`), /from '\.\.\/game\.js'/, f);
  }
});

test('the weekly wiring assertions still hold', () => {
  assert.ok(read('js/game.js').includes('const m = weeklyDecorMesh(THREE, id); if (m)'));
});
