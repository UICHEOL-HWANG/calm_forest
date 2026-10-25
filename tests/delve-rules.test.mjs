import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DELVE_FLOORS, DELVE_STOPS, DELVE_CHEST_FLOORS, THEMES, PESTS, MINER_STEPS, PEST_COPY, VEINS_PER_FLOOR } from '../js/data/delve.js';

test('층은 20층, 정류장은 5·10·15·20, 상자는 10·20', () => {
  assert.equal(DELVE_FLOORS, 20);
  assert.deepEqual(DELVE_STOPS, [5, 10, 15, 20]);
  assert.deepEqual(DELVE_CHEST_FLOORS, [10, 20]);
});

test('테마 두 개가 1~20층을 빈틈없이 덮는다', () => {
  const covered = [];
  for (const th of THEMES) for (let f = th.from; f <= th.to; f++) covered.push(f);
  assert.deepEqual(covered, Array.from({ length: 20 }, (_, i) => i + 1));
});

test('방해꾼 4종은 각자 대응이 하나씩이고 테마에 소속된다', () => {
  assert.deepEqual(Object.keys(PESTS).sort(), ['axolotl', 'bat', 'crab', 'grub']);
  assert.deepEqual(Object.values(PESTS).map(p => p.counter).sort(), ['bait', 'grab', 'reclaim', 'tap']);
  for (const th of THEMES) for (const id of th.pests) assert.ok(PESTS[id], id);
});

test('첫 만남 배너 한 줄은 18자 이내, 프롬프트 8자 이내, 엠대시 없음', () => {
  for (const [id, c] of Object.entries(PEST_COPY)) {
    assert.ok([...c.line].length <= 18, `${id}: ${c.line}`);
    assert.ok(!c.line.includes('—') && !c.title.includes('—'), id);
    if (c.prompt) assert.ok([...c.prompt].length <= 8, `${id} prompt`);
  }
});

test('광부 8단계, 판정 종류는 상태형만', () => {
  assert.equal(MINER_STEPS.length, 8);
  for (const s of MINER_STEPS) assert.ok(['inv', 'count', 'floor', 'chest'].includes(s.check.kind), s.id);
});

test('광맥은 층당 2개', () => {
  assert.equal(VEINS_PER_FLOOR, 2);
});

import { hashSeed, makeRng, floorSeed, themeOf, oreOdds, rollOre } from '../js/delve/rules.js';

test('같은 날짜·층·입장 횟수면 같은 시드, 하나라도 다르면 다른 시드', () => {
  assert.equal(floorSeed('2026-10-25', 3, 0), floorSeed('2026-10-25', 3, 0));
  assert.notEqual(floorSeed('2026-10-25', 3, 0), floorSeed('2026-10-25', 4, 0));
  assert.notEqual(floorSeed('2026-10-25', 3, 0), floorSeed('2026-10-25', 3, 1));
  assert.notEqual(floorSeed('2026-10-25', 3, 0), floorSeed('2026-10-26', 3, 0));
});

test('RNG 는 0 이상 1 미만, 같은 시드면 같은 수열', () => {
  const a = makeRng(42), b = makeRng(42);
  for (let i = 0; i < 100; i++) { const x = a(); assert.ok(x >= 0 && x < 1); assert.equal(x, b()); }
});

test('테마: 1·10층은 흙, 11·20층은 수정', () => {
  assert.equal(themeOf(1).id, 'earth');
  assert.equal(themeOf(10).id, 'earth');
  assert.equal(themeOf(11).id, 'crystal');
  assert.equal(themeOf(20).id, 'crystal');
});

const pOf = (odds, id) => odds.find(([k]) => k === id)[1];

test('광석 확률 합은 1', () => {
  for (const f of [1, 5, 10, 11, 15, 20]) for (const w of ['clear', 'fog', 'rain']) {
    const sum = oreOdds(f, w).reduce((s, [, p]) => s + p, 0);
    assert.ok(Math.abs(sum - 1) < 1e-9, `${f} ${w} ${sum}`);
  }
});

test('1~10층 보석은 안개 날에만, 4%→8%, 수정 없음', () => {
  assert.equal(pOf(oreOdds(1, 'clear'), 'gem'), 0);
  assert.ok(Math.abs(pOf(oreOdds(1, 'fog'), 'gem') - 0.04) < 1e-9);
  assert.ok(Math.abs(pOf(oreOdds(10, 'fog'), 'gem') - 0.08) < 1e-9);
  assert.equal(pOf(oreOdds(5, 'fog'), 'crystal'), 0);
});

test('11~20층 보석은 날씨 무관 10%→18%, 수정 10%', () => {
  assert.ok(Math.abs(pOf(oreOdds(11, 'clear'), 'gem') - 0.10) < 1e-9);
  assert.ok(Math.abs(pOf(oreOdds(20, 'rain'), 'gem') - 0.18) < 1e-9);
  assert.ok(Math.abs(pOf(oreOdds(15, 'clear'), 'crystal') - 0.10) < 1e-9);
});

test('rollOre 는 확률표의 키만 돌려준다', () => {
  const rng = makeRng(7), odds = oreOdds(15, 'clear'), seen = new Set();
  for (let i = 0; i < 2000; i++) seen.add(rollOre(rng, odds));
  assert.deepEqual([...seen].sort(), ['coal', 'crystal', 'gem', 'stone']);
});
