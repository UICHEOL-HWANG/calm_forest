import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DIPPER, ORDER, buildChart, judgeTap, rewardFor, summarize } from '../js/observatory/rhythm.js';

test('북두칠성 차트는 시작 별 하나와 7개 노트로 구성된다', () => {
  assert.equal(DIPPER.length, 7);
  assert.equal(ORDER.length, 8);
  const chart = buildChart();
  assert.equal(chart.length, 7);
  assert.equal(chart[0].startMs, 800);
});

test('차트의 판정 시각은 단조 증가하고 비행 시간은 허용 범위 안에 있다', () => {
  const chart = buildChart();
  for (let i = 0; i < chart.length; i++) {
    const travel = chart[i].hitMs - chart[i].startMs;
    assert.ok(travel >= 700 && travel <= 1300, `travel ${i} = ${travel}`);
    if (i > 0) assert.ok(chart[i].hitMs > chart[i - 1].hitMs, `hitMs ${i} should increase`);
  }
});

test('ease 는 비행 시간을 배수로 늘린다', () => {
  const base = buildChart(1);
  const easy = buildChart(1.4);
  for (let i = 0; i < base.length; i++) {
    const baseTravel = base[i].hitMs - base[i].startMs;
    const easyTravel = easy[i].hitMs - easy[i].startMs;
    assert.ok(Math.abs(easyTravel - baseTravel * 1.4) < 1e-9, `note ${i}`);
  }
});

test('judgeTap 은 기준 시각 대비 오프셋을 4단계로 판정한다', () => {
  assert.equal(judgeTap(0), 'perfect');
  assert.equal(judgeTap(90), 'perfect');
  assert.equal(judgeTap(91), 'good');
  assert.equal(judgeTap(-180), 'good');
  assert.equal(judgeTap(181), 'miss');
  assert.equal(judgeTap(-181), 'early');
});

test('judgeTap 은 ease 만큼 판정 창이 넓어진다', () => {
  assert.equal(judgeTap(126, 1.4), 'perfect');
  assert.equal(judgeTap(127, 1.4), 'good');
  assert.equal(judgeTap(-252, 1.4), 'good');
  assert.equal(judgeTap(-253, 1.4), 'early');
});

test('summarize 는 점수와 miss 로 끊기는 최대 콤보를 계산한다', () => {
  assert.deepEqual(
    summarize(['perfect', 'good', 'miss', 'perfect', 'perfect', 'good', 'miss']),
    { perfect: 3, good: 2, miss: 2, maxCombo: 3, score: 8, success: true },
  );
});

test('summarize 는 miss 가 4개 이상이면 실패로 본다', () => {
  assert.equal(summarize(['miss', 'miss', 'miss']).success, true);
  assert.equal(summarize(['miss', 'miss', 'miss', 'miss']).success, false);
});

test('rewardFor 는 성공한 첫 완성에만 코인을 준다', () => {
  const success = summarize(['perfect', 'perfect', 'good', 'good', 'good', 'good', 'miss']);
  const fail = summarize(['perfect', 'miss', 'miss', 'miss', 'miss', 'good', 'good']);
  assert.deepEqual(rewardFor(success, false), { coins: 14 });
  assert.deepEqual(rewardFor(success, true), { coins: 0 });
  assert.deepEqual(rewardFor(fail, false), { coins: 0 });
});
