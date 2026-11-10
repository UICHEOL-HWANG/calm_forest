import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  HAMMER, beatTimes, judgeOffset, newRun, tapRun, expireRun, runDone, struckAny, canCancel, runScore, runCounts,
  refundRate, refundOf, refundBand,
} from '../js/workbench/hammer.js';

test('five strikes 0.8 s apart', () => {
  assert.equal(HAMMER.strikes, 5);
  assert.equal(HAMMER.beatMs, 800);
  const b = beatTimes();
  assert.equal(b.length, 5);
  for (let i = 1; i < 5; i++) assert.equal(b[i] - b[i - 1], 800);
  assert.ok(b[0] >= HAMMER.beatMs);
});

test('judge windows', () => {
  assert.equal(judgeOffset(0), 2);
  assert.equal(judgeOffset(70), 2);
  assert.equal(judgeOffset(-70), 2);
  assert.equal(judgeOffset(71), 1);
  assert.equal(judgeOffset(-150), 1);
  assert.equal(judgeOffset(151), 0);
});

test('a perfect run scores 10', () => {
  let run = newRun();
  for (const t of beatTimes()) ({ run } = tapRun(run, t + 10));
  assert.equal(runDone(run), true);
  assert.equal(runScore(run), 10);
  assert.deepEqual(runCounts(run), { perfect: 5, good: 0, miss: 0 });
});

test('three perfect and two good score 8', () => {
  const b = beatTimes();
  let run = newRun();
  ({ run } = tapRun(run, b[0]));
  ({ run } = tapRun(run, b[1] + 120));
  ({ run } = tapRun(run, b[2] - 30));
  ({ run } = tapRun(run, b[3] + 50));
  ({ run } = tapRun(run, b[4] - 100));
  assert.equal(runScore(run), 8);
  assert.deepEqual(runCounts(run), { perfect: 3, good: 2, miss: 0 });
});

test('taps far from any beat are ignored', () => {
  const run = newRun();
  const r = tapRun(run, 0);
  assert.equal(r.hit, null);
  assert.equal(struckAny(r.run), false);
});

test('a sloppy tap inside the catch window uses up that strike', () => {
  const b = beatTimes();
  const r = tapRun(newRun(), b[0] - 300);
  assert.deepEqual(r.hit, { i: 0, pts: 0 });
  assert.equal(tapRun(r.run, b[0]).hit?.i, undefined);
});

test('untouched beats expire as misses', () => {
  const b = beatTimes();
  let run = newRun();
  const e = expireRun(run, b[1] + HAMMER.goodMs + 1);
  assert.deepEqual(e.missed, [0, 1]);
  run = e.run;
  assert.equal(runScore(run), 0);
  assert.equal(struckAny(run), true);
  const all = expireRun(newRun(), b[4] + 1000);
  assert.equal(runDone(all.run), true);
  assert.equal(runScore(all.run), 0);
});

test('expire never touches a beat still in its window', () => {
  const b = beatTimes();
  const e = expireRun(newRun(), b[0] + HAMMER.goodMs);
  assert.deepEqual(e.missed, []);
});

test('cancel only before the first strike resolves', () => {
  const b = beatTimes();
  assert.equal(canCancel(newRun()), true);
  assert.equal(canCancel(tapRun(newRun(), b[0]).run), false);
  assert.equal(canCancel(expireRun(newRun(), b[0] + 500).run), false);
});

test('refund bands', () => {
  assert.equal(refundRate(10), 0.3);
  assert.equal(refundRate(9), 0.2);
  assert.equal(refundRate(8), 0.2);
  assert.equal(refundRate(7), 0.1);
  assert.equal(refundRate(5), 0.1);
  assert.equal(refundRate(4), 0);
  assert.equal(refundRate(0), 0);
  assert.equal(refundOf(240, 8), 48);
  assert.equal(refundOf(400, 10), 120);
  assert.equal(refundOf(120, 6), 12);
  assert.equal(refundOf(120, 2), 0);
  assert.deepEqual([0, 4, 5, 7, 8, 9, 10].map(refundBand), [0, 0, 1, 1, 2, 2, 3]);
});

test('runs are immutable', () => {
  const run = newRun();
  tapRun(run, beatTimes()[0]);
  expireRun(run, 99999);
  assert.deepEqual(run.marks, [null, null, null, null, null]);
});
