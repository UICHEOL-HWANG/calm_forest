// Behaviour tests for the lens-view overlay (js/observatory/ui.js + render.js) on a fake DOM.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import * as rhythm from '../js/observatory/rhythm.js';
import { COPY } from '../js/observatory/copy.js';
import { fakeDom } from './helpers/fake-dom.mjs';

function overlay() {
  const dom = fakeDom();
  const tracked = [];
  const source = ['render.js', 'ui.js'].map(file =>
    readFileSync(new URL(`../js/observatory/${file}`, import.meta.url), 'utf8')).join('\n')
    .replace(/^import [\s\S]*?;\n/gm, '').replace(/^export /gm, '');
  const context = vm.createContext({
    ...rhythm, COPY, t: s => s, AbortController,
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
  await r.context.openStarView({ diff, ease: diff.ease });
  r.dom.window.dispatch('keydown', { key: 'Escape' });
  assert.equal(r.tracked.length, 1);
  assert.deepEqual(r.tracked[0].slice(0, 3), ['star', diff, 'esc']);
  assert.equal(r.tracked[0][3].constellation, 'big_dipper');
});

test('first star lights up only when the run starts (800ms), not at open', async () => {
  const o = overlay();
  await o.context.openStarView({});
  const sparkles = () => o.canvas().getContext().calls.filter(c => c[0] === 'closePath').length;   // sparkle() = lit star
  o.dom.tick(400);
  const before = sparkles();
  o.canvas().getContext().calls.length = 0;
  o.dom.setNow(o.chart[0].startMs + 20); o.dom.tick(0);
  assert.equal(before, 0, 'no lit star before 800ms');
  assert.equal(sparkles(), 1, 'start star lit once the comet leaves');
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
