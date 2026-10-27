import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runBot } from './helpers/boat-bot.mjs';
import { liveBoatIds, BOATS, BOAT_IDS } from '../js/boat/boats.js';

const SEEDS = Array.from({ length: 50 }, (_, i) => 20261027 + i * 104729);
const stats = (id, course) => {
  const rs = SEEDS.map(s => runBot(id, s, course));
  return { clear: rs.filter(r => r.result === 'clear').length / rs.length, stars: rs.reduce((a, r) => a + r.stars, 0) / rs.length };
};

for (const course of ['calm', 'rapid']) {
  test(`공정성(${course}): 1차 배는 나룻배 대비 완주율 ±10%p, 평균 별 ±15%`, () => {
    const base = stats('ferry', course);
    assert.ok(base.clear > 0.2 && base.clear < 1, `기준 완주율 ${base.clear}`);
    for (const id of liveBoatIds().filter(i => i !== 'ferry')) {
      const s = stats(id, course);
      assert.ok(Math.abs(s.clear - base.clear) <= 0.10, `${id} 완주율 ${s.clear.toFixed(2)} vs ${base.clear.toFixed(2)}`);
      assert.ok(Math.abs(s.stars / base.stars - 1) <= 0.15, `${id} 별 ${s.stars.toFixed(1)} vs ${base.stars.toFixed(1)}`);
    }
  });
}

test('급류가 잔잔한 물길보다 어렵다', () => {
  assert.ok(stats('ferry', 'rapid').clear < stats('ferry', 'calm').clear);
});

const RATE = { star: 70, lotus: 0.92, driftwood: 0.78, shell: 0.84, moon_fish: 0.55 };
const SPEC_DAYS = { 3: [4, 11, 15, 27, 39, 53, 70, 94], 1: [11, 32, 46, 81, 117, 160, 210, 281] };
const ORDER = ['lotus', 'raft', 'koi', 'catamaran', 'paper', 'walnut', 'lotuslamp', 'gourd'];

function unlockDays(perDay) {
  let star = 0;
  const used = { lotus: 0, driftwood: 0, shell: 0, moon_fish: 0 };
  return ORDER.map(id => {
    const u = BOATS[id].unlock;
    star += u.star;
    for (const m in u.mat) used[m] += u.mat[m];
    const days = Math.max(star / (RATE.star * perDay), ...Object.keys(used).map(m => used[m] / (RATE[m] * perDay)), (u.need.clears || 0) / perDay);
    return Math.ceil(days - 1e-9);
  });
}

for (const perDay of [3, 1]) {
  test(`획득 기간(하루 ${perDay}판): 설계 표 ±10%`, () => {
    unlockDays(perDay).forEach((d, i) => {
      const want = SPEC_DAYS[perDay][i];
      assert.ok(Math.abs(d - want) <= Math.max(1, want * 0.1), `${ORDER[i]}: ${d}일 vs 표 ${want}일`);
    });
  });
}

test('해금 순서 목록은 나룻배를 뺀 8척', () => {
  assert.deepEqual(ORDER, BOAT_IDS.filter(id => id !== 'ferry'));
});
