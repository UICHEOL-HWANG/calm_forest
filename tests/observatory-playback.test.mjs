import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import * as rhythm from '../js/observatory/rhythm.js';
import { COPY } from '../js/observatory/copy.js';

function harness() {
  const calls = [];
  const g = new Proxy({}, { get: (_, key) => (...args) => {
    calls.push([key, ...args]);
    if (key === 'createLinearGradient') return { addColorStop() {} };
  }, set: () => true });
  const source = ['render.js', 'ui.js'].map(file =>
    readFileSync(new URL(`../js/observatory/${file}`, import.meta.url), 'utf8')).join('\n')
    .replace(/^import .*;\n/gm, '').replace(/^export /gm, '');
  const context = vm.createContext({ ...rhythm, COPY, t: s => s,
    document: { createElement: () => ({ getContext: () => new Proxy({}, { get: () => () => {}, set: () => true }) }) },
    performance: { now: () => 4000 }, Input: { setAnalog() {} } });
  vm.runInContext(source, context);
  const state = { g, dpr: 1, chart: rhythm.buildChart(), judges: [], ease: 1,
    offsets: [], startAt: 0, resultShown: false };
  const L = { W: 1280, H: 800, r: 300, cx: 640, cy: 400, portrait: false };
  return { calls, state, L, context };
}

test('comet waits until 800ms and follows chart time after an early hit', () => {
  const { calls, state, L, context: c } = harness();
  const pts = rhythm.DIPPER.map((_, i) => [i * 100, i * 20]);
  c.drawComet(state, L, pts, 799);
  assert.equal(calls.length, 0);
  state.judges.push('good');
  c.drawComet(state, L, pts, state.chart[0].hitMs - 100);
  assert.equal(calls.find(x => x[0] === 'arc')[1], pts[rhythm.ORDER[1]][0]);
});

test('expired notes all settle in one frame, just beyond the good window', () => {
  const { state, context: c } = harness();
  c.missExpired(state, state.chart[0].hitMs + 180.5);
  assert.deepEqual(state.judges, ['miss']);
  c.missExpired(state, state.chart[2].hitMs + 181);
  assert.deepEqual(state.judges, ['miss', 'miss', 'miss']);
});

test('combo recovers after a miss and progress has seven notes', () => {
  const { calls, state, L, context: c } = harness();
  state.judges.push('miss', 'perfect', 'good');
  c.drawHud(state, L);
  assert.ok(calls.some(x => x[0] === 'fillText' && x[1] === '2'));
  assert.equal(calls.filter(x => x[0] === 'arc').length, 7);
});

test('judgment appears on the target star, not the previous star', () => {
  const { calls, state, L, context: c } = harness();
  state.judges.push('perfect');
  state.flash = { judge: 'perfect', until: 5000 };
  const pts = rhythm.DIPPER.map((_, i) => [i * 100, i * 20]);
  c.drawJudge(state, L, pts);
  assert.equal(calls.find(x => x[0] === 'fillText')[2], pts[rhythm.ORDER[1]][0]);
});

test('missed connections stay dashed', () => {
  const { calls, state, L, context: c } = harness();
  state.judges.push('miss');
  c.drawConstellation(state, L);
  assert.ok(calls.filter(x => x[0] === 'setLineDash' && x[1].length > 0).length >= 2);
});
