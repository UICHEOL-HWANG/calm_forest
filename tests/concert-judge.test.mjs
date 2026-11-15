import { test } from 'node:test';
import assert from 'node:assert/strict';
import { windowsFor, makeJudge } from '../js/concert/judge.js';

const chart = [{ t: 1000, lane: 0 }, { t: 1500, lane: 1 }, { t: 2000, lane: 0 }, { t: 2000, lane: 1 }];
const win = windowsFor(1, 1000);
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} vs ${b}`);

test('base windows are 70 and 140 ms', () => {
  assert.deepEqual(windowsFor(), { perfect: 70, good: 140 });
});

test('ease scales both windows', () => {
  const easy = windowsFor(1.2, 10000), hard = windowsFor(0.85, 10000);
  close(easy.perfect, 84);
  close(easy.good, 168);
  close(hard.perfect, 59.5);
  close(hard.good, 119);
});

test('good window never exceeds 45% of the smallest same-lane gap', () => {
  const w = windowsFor(1.8, 455);
  close(w.good, 455 * 0.45);
  assert.ok(w.perfect <= w.good / 2);
});

test('window edges: 70 is perfect, 71 is good, 140 is good, 141 is ignored', () => {
  const at = (off) => makeJudge(chart, win).tap(0, 1000 + off);
  assert.equal(at(70).kind, 'perfect');
  assert.equal(at(-70).kind, 'perfect');
  assert.equal(at(71).kind, 'good');
  assert.equal(at(140).kind, 'good');
  assert.equal(at(141), null);
  assert.equal(at(-141), null);
});

test('a tap in the wrong lane is ignored and costs nothing', () => {
  const j = makeJudge(chart, win);
  assert.equal(j.tap(1, 1000), null);
  assert.equal(j.tap(0, 1000).kind, 'perfect');
});

test('one tap judges one note, a second tap on the same note is ignored', () => {
  const j = makeJudge(chart, win);
  assert.equal(j.tap(0, 1010).index, 0);
  assert.equal(j.tap(0, 1020), null);
});

test('simultaneous notes need one tap per lane', () => {
  const j = makeJudge(chart, win);
  assert.equal(j.tap(0, 2000).index, 2);
  assert.equal(j.tap(1, 2000).index, 3);
});

test('sweep marks late notes as missed, once', () => {
  const j = makeJudge(chart, win);
  assert.deepEqual(j.sweep(1140), []);
  assert.deepEqual(j.sweep(1141), [0]);
  assert.deepEqual(j.sweep(1700), [1]);
  assert.deepEqual(j.sweep(1700), []);
  assert.equal(j.done(), false);
  assert.deepEqual(j.sweep(9999), [2, 3]);
  assert.equal(j.done(), true);
});

test('summary counts score, ratio and the longest combo', () => {
  const j = makeJudge(chart, win);
  j.tap(0, 1000);
  j.tap(1, 1600);
  j.sweep(9999);
  const s = j.summary();
  assert.deepEqual({ perfect: s.perfect, good: s.good, miss: s.miss }, { perfect: 1, good: 1, miss: 2 });
  assert.equal(s.score, 3);
  assert.equal(s.max, 8);
  assert.equal(s.ratio, 3 / 8);
  assert.equal(s.maxCombo, 2);
});

test('an empty chart is done and has ratio 0', () => {
  const j = makeJudge([], win);
  assert.equal(j.done(), true);
  assert.equal(j.summary().ratio, 0);
});
