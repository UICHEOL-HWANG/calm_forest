import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPest, stepPest, repelPest, tacticOf, softPeriodFor, peekOn, clawUp, ringSecFor, counterFor, tapPest, baitPest, darkPest, plugPest, plugReady, catchAtBreak, moleHoles, shufflePlan, shuffleStart, swapSecFor, earPop, SHUFFLE_DELAY, EAR_SEC, LAST_SWAP_SLOW, darkSecFor, softOk, pickableBeforeBat, BAIT_EAT_SEC, RING_SEC } from '../js/delve/pests.js';
import { PEST_GRIT, STREAK_BONUS, REGROUP_SEC, TACTICS, PESTS, PEST_LINES, PEST_DARK_SEC, PEST_LURK_DIST, MOLE_HOLE_R, SOFT_PERIOD, SOFT_WINDOW } from '../js/data/delve.js';
import { heartCount } from '../js/delve/pest-rounds.js';
import { newStreak, streakStep } from '../js/delve/streak.js';

const home = { x: 6, z: 0 };
const vein = { x: 0, z: 0 };
const mk = (kind, extra = {}) => ({ ...createPest(kind, { x: 1, z: 0 }, home), ...extra });
const W = (extra = {}) => ({ chunks: [], burrowAt: home, ...extra });
const run = (p, w, sec, dt = 0.05) => {
  const seen = [];
  for (let t = 0; t < sec; t += dt) { p = stepPest(p, dt, w).pest; seen.push(p); }
  return { p, seen };
};

test('상수: 끈기 3, 보너스 3연속, 재정비 약 2.5초', () => {
  assert.equal(PEST_GRIT, 3);
  assert.equal(STREAK_BONUS, 3);
  assert.ok(REGROUP_SEC >= 2 && REGROUP_SEC <= 3);
});

test('TACTICS: 몹 8종 모두 수법 3단계', () => {
  for (const kind of Object.keys(PESTS)) assert.equal(TACTICS[kind].length, 3, kind);
  assert.deepEqual(TACTICS.axolotl, [{}, { dive: true }, { feint: true }]);
  assert.equal(TACTICS.crab[1].eatSec, 3);
  assert.equal(TACTICS.crab[2].claw, true);
  assert.deepEqual(TACTICS.mole.map(t => t.decoys), [0, 1, 2]);
  assert.equal(TACTICS.mole[2].speedMul, 1.3);
  assert.deepEqual(TACTICS.dormouse.map(t => t.period), [1.4, 0.9, 1.4]);
  assert.equal(TACTICS.dormouse[2].peek, true);
  assert.deepEqual(TACTICS.bat.map(t => t.ringSec), [3, 1.8, 1.8]);
  assert.equal(TACTICS.bat[2].bounce, 1.5);
  assert.equal(TACTICS.grub[1].twoTrails, true);
  assert.equal(TACTICS.grub[2].trailFadeSec, 4);
  assert.deepEqual(TACTICS.moth.map(t => t.darkSec), [6, 3, 6]);
  assert.equal(TACTICS.moth[2].pair, true);
  assert.deepEqual(TACTICS.roller.map(t => t.swaps), [0, 2, 3]);
  assert.ok(TACTICS.roller[2].swapSec < TACTICS.roller[1].swapSec);
});

test('createPest: 끈기 3, 라운드 0, 짝 나방은 끈기 1', () => {
  const p = createPest('crab', { x: 0, z: 0 }, home);
  assert.equal(p.grit, PEST_GRIT);
  assert.equal(p.round, 0);
  assert.equal(createPest('moth', { x: 0, z: 0 }, home, { grit: 1 }).grit, 1);
});

test('repelPest: 끈기 하나 줄고 다음 수법으로, 원래 반응은 그대로', () => {
  const p = mk('crab', { state: 'eat', t: 6 });
  const { pest, events } = repelPest(p);
  assert.equal(pest.grit, 2);
  assert.equal(pest.round, 1);
  assert.equal(pest.state, 'eat');
  assert.deepEqual(events, []);
  assert.equal(p.grit, 3);
});

test('repelPest: 끈기가 0 이 되면 선물을 떨구고 굴로 떠난다', () => {
  const p = mk('bat', { grit: 1, round: 2, state: 'lurk', x: 2, z: 3 });
  const { pest, events } = repelPest(p);
  assert.equal(pest.grit, 0);
  assert.equal(pest.state, 'flee');
  assert.deepEqual(events, [{ type: 'gift', x: 2, z: 3, kind: 'bat' }]);
  const { p: after } = run(pest, W(), 8);
  assert.equal(after.state, 'gone');
});

test('repelPest: 이미 포기한 몹은 다시 밀어내도 선물이 한 번뿐', () => {
  let p = mk('bat', { grit: 1, state: 'lurk' });
  const gifts = [];
  for (let i = 0; i < 4; i++) { const r = repelPest(p); p = r.pest; gifts.push(...r.events.filter(e => e.type === 'gift')); }
  assert.equal(gifts.length, 1);
  assert.equal(p.grit, 0);
  const same = mk('crab', { grit: 0, state: 'flee' });
  assert.deepEqual(repelPest(same), { pest: same, events: [] });
});

test('repelPest: 들고 가던 덩이는 포기하면 그 자리에 뱉는다', () => {
  const p = mk('bat', { grit: 1, state: 'carry', carryId: 'c4', x: 2, z: -1 });
  const { pest, events } = repelPest(p);
  assert.equal(pest.carryId, null);
  assert.deepEqual(events, [{ type: 'spit', chunkId: 'c4', x: 2, z: -1 }, { type: 'gift', x: 2, z: -1, kind: 'bat' }]);
});

test('마지막 하트: 먹기·길 잃기·불 끄기 시간은 그대로 두고, 끝나면 굴로 떠난다', () => {
  const cases = [
    ['crab', baitPest(mk('crab', { grit: 1, round: 1, state: 'lurk' }), { x: 1, z: 0 }), 'eat'],
    ['mole', plugPest(mk('mole', { grit: 1, round: 2, state: 'lurk' }), { x: 1, z: 0 }, home), 'lost'],
    ['moth', darkPest(mk('moth', { grit: 1, round: 2, state: 'lurk' }), { x: 1, z: 0 }), 'away'],
  ];
  for (const [kind, counted, state] of cases) {
    assert.ok(counted, kind);
    const { pest, events } = repelPest(counted);
    assert.equal(pest.state, state, kind);
    assert.equal(pest.gaveUp, true, kind);
    assert.equal(pest.t, counted.t, kind);
    assert.equal(heartCount(pest), 0, kind);
    assert.deepEqual(events.map(e => e.type), ['gift'], kind);
    assert.equal(repelPest(pest).events.length, 0, kind);
    const ended = run(pest, W({ lureAt: { x: -5, z: 5 } }), pest.t + 0.2).p;
    assert.equal(ended.state === 'flee' || ended.state === 'gone', true, kind);
    assert.equal(run(ended, W(), 12).p.state, 'gone', kind);
  }
});

test('포기 안 한 몹은 시간이 끝나면 그대로 쉰다', () => {
  const p = mk('mole', { grit: 2, state: 'lost', t: 0.1 });
  assert.equal(run(p, W(), 0.3).p.state, 'idle');
});

test('도망친 몹은 끈기가 남으면 굴에서 잠깐 쉬었다 다시 온다', () => {
  const fled = { ...mk('axolotl'), state: 'flee', grit: 2, round: 1 };
  const { p: back } = run(fled, W(), 6);
  assert.equal(back.state, 'hide');
  const rested = { ...fled, x: home.x, z: home.z };
  const r1 = stepPest(rested, 0.05, W({ lurkAt: { x: 3, z: 0 } })).pest;
  assert.equal(r1.state, 'hide');
  assert.equal(r1.t, REGROUP_SEC);
  const waiting = run(r1, W({ lurkAt: { x: 3, z: 0 } }), REGROUP_SEC - 0.3).p;
  assert.equal(waiting.state, 'hide');
  assert.deepEqual([waiting.x, waiting.z], [home.x, home.z]);
  const moving = run(waiting, W({ lurkAt: { x: 3, z: 0 } }), 1).p;
  assert.equal(moving.state, 'lurk');
});

test('끈기 정보가 없는 옛 몹은 도망치면 그대로 사라진다', () => {
  const { grit, ...old } = { ...mk('axolotl'), state: 'flee' };
  assert.equal(run(old, W(), 8).p.state, 'gone');
});

test('tacticOf: 라운드 2 이상은 마지막 수법', () => {
  assert.deepEqual(tacticOf(mk('axolotl', { round: 1 })), { dive: true });
  assert.deepEqual(tacticOf(mk('axolotl', { round: 5 })), { feint: true });
  assert.deepEqual(tacticOf(mk('axolotl')), {});
});

test('도둑쥐: 라운드마다 살살 고리 주기, 라운드 2 는 실눈', () => {
  assert.equal(softPeriodFor(mk('dormouse')), SOFT_PERIOD);
  assert.equal(softPeriodFor(mk('dormouse', { round: 1 })), 0.9);
  const mid = (SOFT_WINDOW[0] + SOFT_WINDOW[1]) / 2;
  assert.equal(softOk(mid * 0.9, 0.9), true);
  assert.equal(softOk(0.01, 0.9), false);
  assert.equal(softOk(mid * SOFT_PERIOD), true);
  assert.equal(peekOn(2.0, mk('dormouse', { round: 1 })), false);
  const r2 = mk('dormouse', { round: 2 });
  const open = Array.from({ length: 240 }, (_, i) => peekOn(i * 0.01, r2)).filter(Boolean).length;
  assert.ok(open >= 78 && open <= 82, `open ${open}`);
  assert.equal(peekOn(0.1, r2), false);
  assert.equal(peekOn(2.3, r2), true);
  assert.equal(peekOn(2.4 + 0.1, r2), false);
});

test('수정집게: 라운드 1 은 미끼를 절반만 먹는다', () => {
  const p = baitPest(mk('crab', { state: 'lurk', round: 1 }), { x: 1, z: 0 });
  assert.equal(p.t, 3);
  assert.equal(baitPest(mk('crab', { state: 'lurk' }), { x: 1, z: 0 }).t, BAIT_EAT_SEC);
});

test('수정집게 라운드 2: 대기 중 집게를 들면(1.2초마다) 미끼 대신 톡', () => {
  const c2 = mk('crab', { round: 2 });
  assert.equal(clawUp(0.5, c2), true);
  assert.equal(clawUp(1.5, c2), false);
  assert.equal(clawUp(2.6, c2), true);
  assert.equal(clawUp(0.5, mk('crab', { round: 1 })), false);
  const up = { ...c2, state: 'lurk', lt: 0.5 };
  const down = { ...c2, state: 'lurk', lt: 1.5 };
  assert.equal(counterFor(up), 'tap');
  assert.equal(counterFor(down), 'bait');
  assert.equal(baitPest(up, { x: 1, z: 0 }), null);
  const hit = tapPest(up, { x: 1.5, z: 0 });
  assert.equal(hit.pest.state, 'flee');
  assert.equal(tapPest(down, { x: 1.5, z: 0 }), null);
});

test('대기 시간(lt)은 같은 광맥 옆에서 기다리는 동안 쌓이고, 옮기면 0', () => {
  const { p } = run(mk('crab', { x: 3, z: 0 }), W({ lurkAt: vein }), 6);
  assert.equal(p.state, 'lurk');
  assert.ok(p.lt > 2);
  const moved = stepPest(p, 0.05, W({ lurkAt: { x: 0, z: 4 } })).pest;
  assert.equal(moved.lt, 0);
});

test('도롱뇽 라운드 2: 대기 1.2초 뒤 한 번 물러났다(톡 안 됨) 다시 와서 기다린다', () => {
  const { seen, p } = run(mk('axolotl', { x: 2, z: 0, round: 2 }), W({ lurkAt: vein }), 8);
  const idx = seen.map((s, i) => (s.state === 'feint' ? i : -1)).filter(i => i >= 0);
  assert.ok(idx.length > 0);
  for (const i of idx) assert.equal(counterFor(seen[i]), null);
  assert.equal(idx[idx.length - 1] - idx[0] + 1, idx.length, 'only one feint');
  assert.ok(idx.length * 0.05 <= 1.2);
  const far = Math.max(...idx.map(i => Math.hypot(seen[i].x - vein.x, seen[i].z - vein.z)));
  assert.ok(far >= PEST_LURK_DIST + 1.5, `far ${far}`);
  assert.equal(p.state, 'lurk');
  assert.ok(Math.abs(Math.hypot(p.x - vein.x, p.z - vein.z) - PEST_LURK_DIST) < 0.05);
});

test('도롱뇽 라운드 0·1 은 물러나지 않는다', () => {
  for (const round of [0, 1]) {
    const { seen } = run(mk('axolotl', { x: 2, z: 0, round }), W({ lurkAt: vein }), 6);
    assert.equal(seen.some(s => s.state === 'feint'), false, `round ${round}`);
  }
});

test('박쥐: 라운드별 노란 고리 시간', () => {
  assert.equal(ringSecFor(mk('bat')), RING_SEC);
  assert.equal(ringSecFor(mk('bat', { round: 1 })), 1.8);
  assert.equal(ringSecFor(mk('bat', { round: 2 })), 1.8);
  const chunk = { id: 'a', x: 1, z: 0, age: 2 };
  const fast = run(mk('bat', { round: 1, x: 0, z: 0 }), W({ chunks: [chunk] }), 0.1);
  assert.equal(fast.p.state, 'approach');
  const slow = run(mk('bat', { x: 0, z: 0 }), W({ chunks: [chunk] }), 0.1);
  assert.equal(slow.p.state, 'idle');
  assert.equal(pickableBeforeBat({ age: 2 }, 1.8), false);
  assert.equal(pickableBeforeBat({ age: 2 }), true);
});

test('별코두더지: 진짜 구멍 + 라운드만큼 가짜 구멍, 라운드 2 는 더 빠르다', () => {
  const m0 = mk('mole', { x: -2, z: 0 });
  const h0 = moleHoles(vein, m0);
  assert.equal(h0.length, 1);
  assert.equal(h0[0].real, true);
  const m2 = mk('mole', { x: -2, z: 0, round: 2 });
  const h2 = moleHoles(vein, m2);
  assert.equal(h2.length, 3);
  assert.equal(h2.filter(h => h.real).length, 1);
  assert.deepEqual(moleHoles(vein, m2), h2);
  for (const h of h2) assert.ok(Math.abs(Math.hypot(h.x, h.z) - MOLE_HOLE_R) < 1e-9);
  assert.ok(Math.abs(Math.hypot(h0[0].x, h0[0].z) - PEST_LURK_DIST) < 1e-9);
  for (let i = 0; i < h2.length; i++) for (let j = i + 1; j < h2.length; j++) assert.ok(Math.abs(Math.hypot(h2[i].x - h2[j].x, h2[i].z - h2[j].z) - MOLE_HOLE_R * Math.sqrt(3)) < 1e-9);
  for (let i = 0; i < h2.length; i++) for (let j = i + 1; j < h2.length; j++) assert.ok(Math.hypot(h2[i].x - h2[j].x, h2[i].z - h2[j].z) > 0.5);
  assert.equal(moleHoles(vein, mk('mole', { x: -2, z: 0, round: 1 })).length, 2);
  const fast = stepPest(m2, 0.1, W({ lurkAt: { x: 2, z: 0 } })).pest;
  const slow = stepPest(m0, 0.1, W({ lurkAt: { x: 2, z: 0 } })).pest;
  assert.ok(fast.x - m2.x > (slow.x - m0.x) * 1.25);
});

test('수정공굴리: 라운드별 섞기 횟수와 속도', () => {
  assert.deepEqual(shufflePlan(mk('roller')), { swaps: 0, swapSec: 0 });
  const r1 = shufflePlan(mk('roller', { round: 1 })), r2 = shufflePlan(mk('roller', { round: 2 }));
  assert.equal(r1.swaps, 2);
  assert.equal(r2.swaps, 3);
  assert.ok(r2.swapSec < r1.swapSec);
});

test('수정공굴리: 깨짐 먼지가 걷힌 뒤 섞고, 마지막 섞기는 느리게', () => {
  assert.ok(SHUFFLE_DELAY >= 0.9);
  const r0 = shuffleStart(mk('roller')), r1 = shuffleStart(mk('roller', { round: 1 }));
  assert.deepEqual(r0, { left: 0, sec: 0, t: -SHUFFLE_DELAY });
  assert.equal(r1.left, 2);
  assert.equal(r1.t, -SHUFFLE_DELAY);
  assert.equal(swapSecFor(r1), r1.sec);
  assert.equal(swapSecFor({ ...r1, left: 1 }), r1.sec * LAST_SWAP_SLOW);
});

test('수정공굴리 귀 신호: 0.3초만 보이고 씰룩인다', () => {
  assert.equal(EAR_SEC, 0.3);
  assert.equal(earPop(-0.01), 0);
  assert.equal(earPop(EAR_SEC), 0);
  assert.equal(earPop(0), 1);
  assert.ok(earPop(EAR_SEC / 4) > 1.25);
  for (let t = 0; t < EAR_SEC; t += 0.01) assert.ok(earPop(t) >= 1 && earPop(t) <= 1.3 + 1e-9);
});

test('달빛나방: 라운드 1 은 불 끄기 효과가 3초', () => {
  assert.equal(darkSecFor(mk('moth')), PEST_DARK_SEC);
  assert.equal(darkSecFor(mk('moth', { round: 1 })), 3);
  assert.equal(darkPest(mk('moth', { state: 'lurk', round: 1 }), { x: 1, z: 0 }).t, 3);
  assert.equal(darkPest(mk('moth', { state: 'lurk' }), { x: 1, z: 0 }).t, PEST_DARK_SEC);
});

test('연속: 성공마다 +1, 3의 배수면 보너스, 실패는 0 으로(최고는 유지)', () => {
  let s = newStreak();
  assert.deepEqual(s, { cur: 0, best: 0 });
  const bonus = [];
  for (const ok of [true, true, true, false, true, true, true, true, true, true]) { s = streakStep(s, ok); bonus.push(s.bonus); }
  assert.deepEqual(bonus, [false, false, true, false, false, false, true, false, false, true]);
  assert.deepEqual({ cur: s.cur, best: s.best }, { cur: 6, best: 6 });
  assert.deepEqual(streakStep(s, false), { cur: 0, best: 6, bonus: false });
  assert.equal(s.cur, 6);
});

test('문구: 포기 선물·보너스·빈 굴·실눈, 결과에 최고 연속(2 이상만)', () => {
  assert.equal(PEST_LINES.giveup('도둑쥐'), '🎁 도둑쥐가 포기하고 선물을 두고 갔어요');
  assert.equal(PEST_LINES.giveup('동굴 도롱뇽'), '🎁 동굴 도롱뇽이 포기하고 선물을 두고 갔어요');
  assert.equal(PEST_LINES.bonus(3), '✨ 3연속! 광석 +1');
  assert.equal(PEST_LINES.empty, '빈 굴이에요');
  assert.equal(typeof PEST_LINES.peek, 'string');
  assert.equal(PEST_LINES.result(3, 2, 1), '⛏️ 지하 3층 · 지킨 조각 2 · 뺏긴 조각 1');
  assert.equal(PEST_LINES.result(3, 2, 1, 1), '⛏️ 지하 3층 · 지킨 조각 2 · 뺏긴 조각 1');
  assert.equal(PEST_LINES.result(3, 2, 1, 4), '⛏️ 지하 3층 · 지킨 조각 2 · 뺏긴 조각 1 · 최고 연속 4');
  const all = [PEST_LINES.giveup('도둑쥐'), PEST_LINES.bonus(3), PEST_LINES.empty, PEST_LINES.peek, PEST_LINES.result(1, 1, 1, 3)];
  for (const s of all) { assert.doesNotMatch(s, /—/); assert.doesNotMatch(s, /놀/); }
});

test('별코두더지 구멍: 수법이 있으면 진짜 구멍도 같은 거리에서 기다리고, 그 구멍에서만 막는다', () => {
  const lurkAt = { x: 0, z: 0 };
  const m = run(mk('mole', { x: -3, z: 0, round: 1 }), W({ lurkAt }), 4).p;
  assert.equal(m.state, 'lurk');
  assert.ok(Math.abs(Math.hypot(m.x, m.z) - MOLE_HOLE_R) < 0.05);
  const holes = moleHoles(lurkAt, m);
  const real = holes.find(h => h.real), fake = holes.find(h => !h.real);
  assert.equal(plugReady(m, real), true);
  assert.equal(plugReady(m, fake), false);
  assert.equal(catchAtBreak([m], lurkAt), 0);
  const m0 = run(mk('mole', { x: -3, z: 0 }), W({ lurkAt }), 4).p;
  assert.ok(Math.abs(Math.hypot(m0.x, m0.z) - PEST_LURK_DIST) < 0.05);
});
