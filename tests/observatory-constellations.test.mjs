// 🌌 별자리 목록·해금·차트 일반화 (js/observatory/constellations.js · rhythm.js · difficulty.js)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BY_ID, CONSTELLATIONS, fitter, maxScore, noteCount, unlockedIds } from '../js/observatory/constellations.js';
import { buildChart, summarize } from '../js/observatory/rhythm.js';
import { ddaOutcome } from '../js/difficulty.js';

test('6 constellations in the approved unlock order with the approved note counts', () => {
  assert.deepEqual(CONSTELLATIONS.map(c => [c.id, noteCount(c)]), [
    ['big_dipper', 7], ['cassiopeia', 4], ['pegasus', 6], ['leo', 9], ['orion', 9], ['scorpius', 11],
  ]);
  for (const c of CONSTELLATIONS) assert.equal(maxScore(c), noteCount(c) * 2);
});

test('every path uses real stars and never draws the same line twice', () => {
  for (const c of CONSTELLATIONS) {
    const seen = new Set();
    for (let i = 0; i < c.order.length; i++) {
      assert.ok(c.order[i] >= 0 && c.order[i] < c.stars.length, `${c.id} order[${i}]`);
      if (!i) continue;
      const [a, b] = [c.order[i - 1], c.order[i]].sort((x, y) => x - y);
      assert.notEqual(a, b, `${c.id} zero-length note ${i}`);
      assert.ok(!seen.has(`${a}-${b}`), `${c.id} repeats edge ${a}-${b}`);
      seen.add(`${a}-${b}`);
    }
    // every star is on the path (no stray dot that never lights)
    assert.equal(new Set(c.order).size, c.stars.length, `${c.id} has an unvisited star`);
  }
});

test('unlocks run in order: the first is always open, each clear opens the next', () => {
  assert.deepEqual(unlockedIds({}), ['big_dipper']);
  assert.deepEqual(unlockedIds({ big_dipper: '2026-10-05' }), ['big_dipper', 'cassiopeia']);
  // a gap (cleared a later one somehow) does not skip ahead
  assert.deepEqual(unlockedIds({ cassiopeia: 'x' }), ['big_dipper']);
  const all = Object.fromEntries(CONSTELLATIONS.map(c => [c.id, 'x']));
  assert.equal(unlockedIds(all).length, CONSTELLATIONS.length);
});

test('fitter keeps every star inside the lens and the Big Dipper exactly where it used to be', () => {
  for (const c of CONSTELLATIONS) {
    const f = fitter(c, 300);
    c.stars.forEach((_, i) => {
      const [x, y] = f(i);
      assert.ok(Math.hypot(x, y) < 300 * 0.95, `${c.id} star ${i} at ${Math.hypot(x, y).toFixed(0)}`);
    });
  }
  // old render.js: cx + (x + 0.6) * 0.43r, cy - (y + 0.25) * 0.43r
  const f = fitter(BY_ID.big_dipper, 300);
  BY_ID.big_dipper.stars.forEach(([x, y], i) => {
    const [fx, fy] = f(i);
    assert.ok(Math.abs(fx - (x + 0.6) * 129) < 1e-6 && Math.abs(fy + (y + 0.25) * 129) < 1e-6, `star ${i}`);
  });
});

test('buildChart: one note per path segment, tempo scales travel, Big Dipper unchanged by default', () => {
  for (const c of CONSTELLATIONS) assert.equal(buildChart(1, c).length, noteCount(c));
  assert.deepEqual(buildChart(1.4), buildChart(1.4, BY_ID.big_dipper));
  const cas = buildChart(1, BY_ID.cassiopeia), slow = buildChart(1, { ...BY_ID.cassiopeia, tempo: 1 });
  for (let i = 0; i < cas.length; i++) {
    const a = cas[i].hitMs - cas[i].startMs, b = slow[i].hitMs - slow[i].startMs;
    assert.ok(Math.abs(a - b * 0.8) < 1e-9, `note ${i}`);
  }
});

test('summarize scales the miss allowance and max score with the note count', () => {
  const r7 = summarize(['miss', 'miss', 'miss', 'perfect', 'perfect', 'perfect', 'perfect']);
  assert.equal(r7.success, true);   // 7 notes → 3 misses allowed, same as before
  assert.equal(r7.maxScore, 14);
  assert.equal(summarize(['miss', 'miss', 'perfect', 'perfect']).success, true);   // 4 notes → ceil(1.6) = 2
  assert.equal(summarize(['miss', 'miss', 'miss', 'perfect']).success, false);
  assert.equal(summarize(Array(11).fill('good'), 11).maxScore, 22);
  const misses = n => [...Array(n).fill('miss'), ...Array(11 - n).fill('perfect')];
  assert.equal(summarize(misses(5), 11).success, true);    // ceil(4.4) = 5
  assert.equal(summarize(misses(6), 11).success, false);
  // a partial (abandoned) run is judged against the full note count, not the notes played
  assert.equal(summarize(['perfect', 'perfect'], 9).maxScore, 18);
});

test('DDA reads score against this run\'s max score, not a fixed 14', () => {
  assert.equal(ddaOutcome('star', { score: 11, maxScore: 22 }), 0.5);
  assert.equal(ddaOutcome('star', { score: 8, maxScore: 8 }), 1);
  assert.equal(ddaOutcome('star', { score: 14 }), 1);   // old summaries without maxScore still read as /14
});
