// Behaviour tests for the lens-view overlay (js/observatory/ui.js + render.js) on a fake DOM.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import * as rhythm from '../js/observatory/rhythm.js';
import { COPY, STAR_COPY, starCopy, fill } from '../js/observatory/copy.js';
import * as constellations from '../js/observatory/constellations.js';
import { fakeDom } from './helpers/fake-dom.mjs';

function overlay() {
  const dom = fakeDom();
  const tracked = [];
  const source = ['render.js', 'ui.js'].map(file =>
    readFileSync(new URL(`../js/observatory/${file}`, import.meta.url), 'utf8')).join('\n')
    .replace(/^import [\s\S]*?;\n/gm, '').replace(/^export /gm, '');
  const context = vm.createContext({
    ...rhythm, ...constellations, COPY, STAR_COPY, starCopy, fill, t: s => s, AbortController,
    document: dom.document, window: dom.window, performance: dom.performance,
    requestAnimationFrame: dom.requestAnimationFrame, cancelAnimationFrame: dom.cancelAnimationFrame,
    Input: { setAnalog() {} },
    trackDiffAbandon: (...a) => tracked.push(a),
  });
  vm.runInContext(source, context);
  const layer = () => dom.document.body.querySelector('.observatory-layer');
  const canvas = () => layer()?.querySelector('canvas');
  const card = () => layer()?.querySelector('.observatory-card');
  const chart = rhythm.buildChart(1);
  /** tap exactly on each note's hit time (offset ms per note) */
  const play = (offsets) => {
    offsets.forEach((off, i) => {
      if (off === null) return;
      dom.setNow(chart[i].hitMs + off);
      canvas().dispatch('pointerdown');
    });
  };
  return { dom, context, tracked, layer, canvas, card, chart, play };
}

test('failed run (all misses) shows the fail title and no reward', async () => {
  const o = overlay();
  await o.context.openStarView({});
  o.dom.tick(o.chart.at(-1).hitMs + 400);
  o.dom.tick(16);
  const card = o.card();
  assert.ok(card, 'result card must appear after the last note expires');
  assert.equal(card.querySelector('h2').textContent, COPY.fail);
  assert.ok(!card.querySelector('p').textContent.includes(COPY.reward), 'no reward line on failure');
});

test('successful run shows the complete title; reward only when one was actually paid', async () => {
  const o = overlay();
  await o.context.openStarView({});
  o.play([0, 0, 0, 0, 0, 0, 0]);
  assert.equal(o.card().querySelector('h2').textContent, COPY.complete);
  assert.ok(!o.card().querySelector('p').textContent.includes(COPY.reward), 'nothing paid → no reward line');

  const paid = overlay();
  const seen = [];
  await paid.context.openStarView({ onResult: (summary) => { seen.push(summary); return { coins: 24 }; } });
  paid.play([0, 0, 0, 0, 0, 0, 0]);
  assert.equal(seen.length, 1);
  assert.equal(seen[0].perfect, 7);
  assert.match(paid.card().querySelector('p').textContent, new RegExp(`${COPY.reward} \\+24`));
});

test('same-day success: no reward line, says today\'s reward was already collected', async () => {
  const o = overlay();
  await o.context.openStarView({ onResult: () => ({ coins: 0, alreadyToday: true }) });
  o.play([0, 0, 0, 0, 0, 0, 0]);
  const p = o.card().querySelector('p').textContent;
  assert.ok(!p.includes(`${COPY.reward} +`), 'nothing paid → no reward line');
  assert.ok(p.includes(COPY.rewardDone), 'explains why there is no reward');

  const first = overlay();   // first success of the day → reward line, no notice
  await first.context.openStarView({ onResult: () => ({ coins: 24, alreadyToday: false }) });
  first.play([0, 0, 0, 0, 0, 0, 0]);
  assert.ok(!first.card().querySelector('p').textContent.includes(COPY.rewardDone));

  const failed = overlay();  // a failed run never uses up the day → no notice
  await failed.context.openStarView({ onResult: () => ({ coins: 0, alreadyToday: true }) });
  failed.dom.tick(failed.chart.at(-1).hitMs + 400);
  failed.dom.tick(16);
  assert.ok(!failed.card().querySelector('p').textContent.includes(COPY.rewardDone));
});

test('progress dots paint missed notes differently from hit notes', async () => {
  const o = overlay();
  await o.context.openStarView({});
  const state = { g: o.dom.document.createElement('canvas').getContext('2d'), chart: o.chart, judges: ['miss', 'perfect'] };
  o.context.drawHud(state, { W: 1280, H: 800, portrait: false, r: 300, cx: 640, cy: 400 });
  const fills = [];
  let style = null;
  for (const [k, v] of state.g.calls) {
    if (k === '=fillStyle') style = v;
    if (k === 'fill') fills.push(style);
  }
  assert.equal(fills.length, 7);
  assert.notEqual(fills[0], fills[1], 'missed dot must not look like a hit');
  assert.notEqual(fills[0], fills[3], 'missed dot must not look like an upcoming note');
});

test('abandon is tracked only with a real rolled difficulty, never a placeholder', async () => {
  const o = overlay();
  await o.context.openStarView({});
  o.dom.window.dispatch('keydown', { key: 'Escape' });
  assert.equal(o.layer(), null, 'ESC closes the view');
  assert.deepEqual(o.tracked, [], 'no difficulty → no abandon event');

  const r = overlay();
  const diff = { arm: 1, ease: 1.4, dda: 1 };
  const got = [];
  await r.context.openStarView({ diff, ease: diff.ease, onAbandon: (reason, run) => got.push([reason, run]) });
  r.dom.setNow(rhythm.buildChart(1.4)[0].hitMs); r.canvas().dispatch('pointerdown');   // one on-time tap (ease 1.4 chart)
  r.dom.window.dispatch('keydown', { key: 'Escape' });
  assert.equal(got.length, 1);
  assert.equal(got[0][0], 'esc');
  assert.deepEqual([...got[0][1].judges], ['perfect']);
  assert.deepEqual([...got[0][1].noteOffsets], [0], 'per-note offsets ride along for star_runs');
});

test('first star lights up only when the run starts (800ms), not at open', async () => {
  const o = overlay();
  await o.context.openStarView({});
  // stars are drawn as small cached sprites — lit and dim are two different images
  const starImages = () => new Set(o.canvas().getContext().calls
    .filter(c => c[0] === 'drawImage' && c[4] < 200).map(c => c[1]));   // 화면 크기 캐시(배경·테두리)는 빼고
  o.dom.tick(400);
  const before = starImages();
  o.canvas().getContext().calls.length = 0;
  o.dom.setNow(o.chart[0].startMs + 20); o.dom.tick(0);
  assert.equal(before.size, 1, 'only dim stars before 800ms');
  assert.equal(starImages().size, 2, 'start star lit once the comet leaves');
});

test('frame loop stops once the result card is up, and close cleans everything', async () => {
  const o = overlay();
  await o.context.openStarView({});
  o.play([0, 0, 0, 0, 0, 0, 0]);
  o.dom.tick(16); o.dom.tick(16);
  assert.equal(o.dom.pendingFrames(), 0, 'no more frames after the result');
  o.card().querySelector('button').click();
  assert.equal(o.layer(), null);
  assert.equal(o.dom.document.body.classList.contains('mg-open'), false);
  assert.deepEqual(o.tracked, [], 'closing a finished run is not an abandon');
});

test('taps before the comet leaves are ignored; on-time taps judge each note', async () => {
  const o = overlay();
  await o.context.openStarView({});
  o.dom.setNow(o.chart[0].startMs - 400);   // intro — the comet has not left yet
  o.canvas().dispatch('pointerdown');
  o.dom.window.dispatch('keydown', { key: ' ' });
  assert.equal(o.card(), null);
  o.play([0, 120, -150, 0, 0, 0, 0]);   // perfect, good, good, perfect…
  const p = o.card().querySelector('p').textContent;
  assert.match(p, new RegExp(`${COPY.perfect} 5`));
  assert.match(p, new RegExp(`${COPY.good} 2`));
  assert.match(p, new RegExp(`${COPY.miss} 0`));
});

test('an early tap while the comet is in flight is a miss for that note (mashing fails)', async () => {
  const o = overlay();
  let run = null;
  await o.context.openStarView({ onResult: (s, r) => { run = r; return {}; } });
  o.dom.setNow(o.chart[0].hitMs - 400);   // comet flying, way before the window
  o.canvas().dispatch('pointerdown');
  o.play([null, 0, 0, 0, 0, 0, 0]);
  const p = o.card().querySelector('p').textContent;
  assert.match(p, new RegExp(`${COPY.miss} 1`));
  assert.equal(run.judges[0], 'miss');
  assert.equal(run.noteOffsets[0], -400, 'the early offset is kept for training data');
  assert.equal(run.earlyTaps, 1);

  const m = overlay();
  await m.context.openStarView({});
  for (let t = m.chart[0].startMs; t < m.chart.at(-1).hitMs + 300; t += 30) { m.dom.setNow(t); m.canvas().dispatch('pointerdown'); }
  assert.equal(m.card().querySelector('h2').textContent, COPY.fail, 'mashing through the run fails');
});

test('closing mid-run tears everything down and calls onClose once', async () => {
  const o = overlay();
  let closed = 0;
  await o.context.openStarView({ onClose: () => closed++ });
  assert.ok(o.dom.document.body.classList.contains('mg-open'));
  const canvas = o.canvas();
  o.dom.tick(16);
  o.layer().querySelector('.observatory-close').click();
  assert.equal(closed, 1);
  assert.equal(o.layer(), null);
  assert.equal(o.dom.document.body.classList.contains('menu-open'), false);
  assert.equal(o.dom.pendingFrames(), 0, 'rAF cancelled');
  assert.equal(o.dom.window.listeners.length + o.dom.document.listeners.length + canvas.listeners.length, 0, 'listeners aborted');
  o.dom.document.hidden = true; o.dom.document.dispatch('visibilitychange');
  assert.equal(closed, 1, 'no second close');
});

test('onResult gets the run: judges, integer offsets of tapped notes, duration', async () => {
  const o = overlay();
  const runs = [];
  await o.context.openStarView({ onResult: (summary, run) => { runs.push(run); return { coins: 0 }; } });
  o.play([12.4, -60, null, 0, 150, 0, -3]);   // third note left to expire
  assert.equal(runs.length, 1);
  const run = runs[0];
  assert.deepEqual([...run.judges], ['perfect', 'perfect', 'miss', 'perfect', 'good', 'perfect', 'perfect']);
  assert.deepEqual([...run.offsets], [12, -60, 0, 150, 0, -3]);
  assert.ok(Math.abs(run.durationMs - (o.chart.at(-1).hitMs - 3)) < 1);
});

test('a lens frame uses only a handful of shadowBlur draws (stars come from cached sprites)', async () => {
  const o = overlay();
  await o.context.openStarView({});
  o.play([0, 0, 0]);
  for (const at of [o.chart[3].startMs + 300, o.chart[4].startMs + 200]) {
    o.dom.setNow(at);
    const g = o.canvas().getContext(); g.calls.length = 0;
    o.dom.tick(0);
    const blurs = g.calls.filter(x => x[0] === '=shadowBlur' && x[1] > 0).length;
    assert.ok(blurs <= 8, `${blurs} blurred draws in one frame`);
    assert.ok(g.calls.filter(x => x[0] === 'drawImage').length >= 2 + 7, 'lens cache + 7 star sprites');
  }
});

test('result card shows the first-clear bonus and the newly opened constellation (toasts hide under the overlay)', async () => {
  const o = overlay();
  await o.context.openStarView({ onResult: () => ({ coins: 10, bonus: 30, unlockedNext: 'cassiopeia' }) });
  o.play([0, 0, 0, 0, 0, 0, 0]);
  const text = o.card().querySelector('p').textContent;
  assert.ok(text.includes('처음 그렸어요 +30🪙'), text);
  assert.ok(text.includes('✨ 새 별자리가 보여요 · 카시오페이아'), text);
});

test('a replaced lens does not call the old onClose (would reopen the notebook over the new lens)', async () => {
  const o = overlay();
  let closes = 0;
  await o.context.openStarView({ onClose: () => { closes += 1; } });
  await o.context.openStarView({});
  assert.equal(closes, 0);
  assert.equal(o.dom.document.body.querySelectorAll('.observatory-layer').length, 1);
});
