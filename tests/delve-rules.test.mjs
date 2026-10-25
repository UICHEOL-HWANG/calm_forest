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

import { layoutFloor, ladderRevealed, dist } from '../js/delve/rules.js';
import { DELVE_HALF, PLAIN_ROCKS, LADDER_MIN_FRAC, BURROW_MIN_FROM_ARRIVAL, LADDER_PITY } from '../js/data/delve.js';

const SEEDS = Array.from({ length: 300 }, (_, i) => 1000 + i * 7919);
const DIAG = DELVE_HALF * 2 * Math.SQRT2;

test('도착점은 남쪽 가장자리', () => {
  for (const seed of SEEDS) assert.ok(layoutFloor({ seed, floor: 3 }).arrival.z < -DELVE_HALF + 2.5, `${seed}`);
});

test('내려가는 곳은 도착점 반대편 절반, 대각선의 60% 이상 떨어진다', () => {
  for (const seed of SEEDS) for (const floor of [1, 12]) {
    const L = layoutFloor({ seed, floor });
    assert.ok(L.ladderAt.z > 0, `${seed} z=${L.ladderAt.z}`);
    assert.ok(dist(L.arrival, L.ladderAt) >= DIAG * LADDER_MIN_FRAC - 1e-9, `${seed} d=${dist(L.arrival, L.ladderAt)}`);
  }
});

test('광맥 2개 + 빈 바위 4~6개, 사다리는 빈 바위 하나 밑', () => {
  for (const seed of SEEDS) {
    const L = layoutFloor({ seed, floor: 5 });
    const veins = L.rocks.filter(r => r.vein).length, plain = L.rocks.length - veins;
    assert.equal(veins, 2);
    assert.ok(plain >= PLAIN_ROCKS[0] && plain <= PLAIN_ROCKS[1], `${seed} plain=${plain}`);
    assert.equal(L.rocks[L.ladderRock].vein, false);
    assert.deepEqual({ x: L.rocks[L.ladderRock].x, z: L.rocks[L.ladderRock].z }, L.ladderAt);
  }
});

test('바위끼리 1.4 이상 떨어지고 방 안에 있다', () => {
  for (const seed of SEEDS) {
    const L = layoutFloor({ seed, floor: 8 });
    for (const r of L.rocks) assert.ok(Math.abs(r.x) <= DELVE_HALF - 1 && Math.abs(r.z) <= DELVE_HALF - 1);
    for (let i = 0; i < L.rocks.length; i++) for (let j = i + 1; j < L.rocks.length; j++) assert.ok(dist(L.rocks[i], L.rocks[j]) >= 1.4 - 1e-9);
  }
});

test('방해꾼 굴은 도착점 근처에 없다', () => {
  for (const seed of SEEDS) {
    const L = layoutFloor({ seed, floor: 14 });
    for (const b of L.burrows) assert.ok(dist(b, L.arrival) >= BURROW_MIN_FROM_ARRIVAL, `${seed}`);
  }
});

test('방해꾼은 그 층 테마 소속, 도롱뇽이 있으면 웅덩이가 있다, 방해꾼마다 굴', () => {
  for (const seed of SEEDS.slice(0, 50)) {
    const a = layoutFloor({ seed, floor: 4 }), b = layoutFloor({ seed, floor: 16 });
    for (const p of a.pests) assert.ok(['axolotl', 'crab'].includes(p));
    for (const p of b.pests) assert.ok(['bat', 'grub'].includes(p));
    if (a.pests.includes('axolotl')) assert.ok(a.puddles.length >= 1, `${seed}`);
    assert.equal(a.burrows.length, a.pests.length, `${seed}`);
  }
});

test('같은 시드면 같은 배치', () => {
  assert.deepEqual(layoutFloor({ seed: 99, floor: 7 }), layoutFloor({ seed: 99, floor: 7 }));
});

test('사다리: 그 바위를 깨면 바로, 아니어도 5번째에는 반드시', () => {
  assert.equal(ladderRevealed({ broken: 1, hitLadderRock: true }), true);
  assert.equal(ladderRevealed({ broken: LADDER_PITY - 1, hitLadderRock: false }), false);
  assert.equal(ladderRevealed({ broken: LADDER_PITY, hitLadderRock: false }), true);
});
