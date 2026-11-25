import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createPest, stepPest, repelPest, floorTally, NOTICE_R } from '../js/delve/pests.js';
import { REGROUP_SEC } from '../js/data/delve.js';
import { heartsCenterY, HEARTS_SIZE } from '../js/delve/badge-math.js';

const home = { x: 6, z: 0 };
const W = (extra = {}) => ({ chunks: [], burrowAt: home, ...extra });
const run = (p, w, sec, dt = 0.05) => {
  for (let t = 0; t < sec; t += dt) p = stepPest(p, dt, w).pest;
  return p;
};

test('도둑쥐: 살살 깨기에 성공해 잠들어도 끈기가 남으면 다음 광맥으로 다시 온다', () => {
  const dozing = { ...createPest('dormouse', { x: 1, z: 0 }, home), state: 'doze', spot: { x: 1, z: 0, ax: 0, az: 0 } };
  const { pest } = repelPest(dozing);
  const slept = stepPest(pest, 0.05, W()).pest;
  assert.equal(slept.state, 'sleep');
  const back = run(slept, W({ lurkAt: { x: -2, z: 0 } }), 1);
  assert.ok(['lurk', 'doze'].includes(back.state), back.state);
  assert.equal(back.round, 1);
});

test('도둑쥐: 한 번도 안 밀려난 잠든 몹과 쉬는 층의 잠은 그대로', () => {
  const asleep = createPest('dormouse', { x: 1, z: 0 }, home, { asleep: true });
  assert.equal(run(asleep, W({ lurkAt: { x: 0, z: 0 } }), 1).state, 'sleep');
  const repelled = { ...asleep, round: 1, grit: 2 };
  assert.equal(run(repelled, W({ lurkAt: { x: 0, z: 0 }, rest: true }), 1).state, 'sleep');
  const spent = { ...asleep, round: 3, grit: 0 };
  assert.equal(run(spent, W({ lurkAt: { x: 0, z: 0 } }), 1).state, 'sleep');
});

test('굼벵이: 숨긴 조각을 되찾으면 굴에서 재정비 뒤 다시 나온다', () => {
  const gone = { ...createPest('grub', { x: 1, z: 0 }, home), state: 'gone', x: 5.9, z: 0.1, carryId: null };
  const { pest, events } = repelPest(gone);
  assert.deepEqual(events, []);
  assert.equal(pest.grit, 2);
  assert.equal(pest.state, 'idle');
  assert.equal(pest.t, REGROUP_SEC);
  assert.deepEqual([pest.x, pest.z], [home.x, home.z]);
  const chunk = { id: 'c1', x: 3, z: 0, age: 9 };
  const waiting = run(pest, W({ chunks: [chunk] }), REGROUP_SEC - 0.3);
  assert.equal(waiting.state, 'idle');
  const r = stepPest(run(waiting, W({ chunks: [chunk] }), 0.5), 0.05, W({ chunks: [chunk] })).pest;
  assert.equal(r.state, 'approach');
  assert.equal(r.targetId, 'c1');
});

test('굼벵이: 마지막 하트에서 되찾으면 선물 하나, 다시 오지 않는다', () => {
  const gone = { ...createPest('grub', { x: 1, z: 0 }, home), state: 'gone', grit: 1, round: 2, x: 6, z: 0 };
  const { pest, events } = repelPest(gone);
  assert.deepEqual(events.map(e => e.type), ['gift']);
  assert.equal(run(pest, W({ chunks: [{ id: 'c', x: 3, z: 0, age: 9 }] }), 3).state, 'gone');
});

test('한 번 밀려난 몹은 굴이 멀어도(NOTICE_R 밖) 캐는 광맥을 기억하고 온다', () => {
  const far = { x: home.x - NOTICE_R - 6, z: 0 };
  const fresh = createPest('axolotl', home, home);
  assert.equal(run(fresh, W({ lurkAt: far }), 1).state, 'hide');
  const back = { ...fresh, round: 1, grit: 2 };
  const r = run(back, W({ lurkAt: far }), 1);
  assert.equal(r.state, 'lurk');
  assert.ok(r.x < home.x);
});

test('기억은 광맥 대기에만, 조각 노리기는 여전히 NOTICE_R 안', () => {
  const back = { ...createPest('crab', home, home), round: 1, grit: 2 };
  const far = { id: 'f', x: home.x - NOTICE_R - 3, z: 0, age: 9 };
  const r = stepPest(back, 0.05, W({ chunks: [far] })).pest;
  assert.notEqual(r.state, 'approach');
});

test('floorTally: 조각이 없어도 최고 연속 2 이상이면 결과를 보여 준다', () => {
  assert.equal(floorTally({ kept: 0, lost: 0, pending: 0, best: 2 }).any, true);
  assert.equal(floorTally({ kept: 0, lost: 0, pending: 0, best: 1 }).any, false);
});

test('하트 줄: 배지가 있으면 화면 기준으로 배지 위에 띄우고, 없으면 가운데 기준', () => {
  assert.equal(heartsCenterY(0), 0.5);
  for (const s of [0.6, 1, 1.15]) {
    const bottom = -heartsCenterY(s) * HEARTS_SIZE[1];
    assert.ok(bottom > s / 2, `scale ${s}`);
  }
});

test('하트는 배지보다 나중에 그려지고 크기는 HEARTS_SIZE 하나로', () => {
  const src = readFileSync(new URL('../js/delve/state-badge.js', import.meta.url), 'utf8');
  const badge = Number(src.match(/makeStateBadge[\s\S]*?renderOrder = (\d+)/)[1]);
  const hearts = Number(src.match(/makeHearts[\s\S]*?renderOrder = (\d+)/)[1]);
  assert.ok(hearts > badge);
  assert.match(src, /HEARTS_SIZE/);
});
