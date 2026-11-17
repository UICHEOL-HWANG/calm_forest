import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  POND_STAGES, MAX_POND_STAGE, pondStageOf, pondRadius, pondSpotFor, pondStageInfo,
  pondDecorInWay, pondPlotsInWay, pondFishLimits, pondActR, pondViewR, pondBigSpotBlocks, applyExpand,
} from '../js/pond/stage.js';
import { POND_R, POND_STAGE_R, POND_BIG_SPOT, POND_SPOTS } from '../js/data/pond.js';
import { pondView } from '../js/pond/rules.js';
import { pondStageShort } from '../js/guide/prepass-rules.js';

test('단계 표 — 3단계, 1단계는 지금 연못 그대로', () => {
  assert.equal(POND_STAGES.length, 3);
  assert.equal(MAX_POND_STAGE, 3);
  assert.deepEqual([...POND_STAGE_R], [2.0, 2.9, 3.9]);
  assert.equal(pondRadius(1), POND_R);
  assert.equal(pondRadius(2), 2.9);
  assert.equal(pondRadius(3), 3.9);
  assert.equal(POND_STAGES[0].cost, null);
  assert.deepEqual(POND_STAGES[1].cost, { stone: 20, wood: 20, coins: 200 });
  assert.deepEqual(POND_STAGES[2].cost, { stone: 60, wood: 40, coins: 500 });
  assert.deepEqual(POND_STAGES.map(s => s.book), [0, 4, 8]);
});

test('pondStageOf — 없거나 이상한 값은 1단계, 범위를 넘으면 잘라 낸다', () => {
  assert.equal(pondStageOf(undefined), 1);
  assert.equal(pondStageOf({}), 1);
  assert.equal(pondStageOf({ pondStage: 2 }), 2);
  assert.equal(pondStageOf({ pondStage: 9 }), 3);
  assert.equal(pondStageOf({ pondStage: 0 }), 1);
  assert.equal(pondStageOf({ pondStage: 'x' }), 1);
  assert.equal(pondStageOf({ pondStage: 2.7 }), 2);
});

test('pondSpotFor — 1단계는 고른 작은 자리, 2단계부터는 넓은 자리 하나', () => {
  assert.equal(pondSpotFor(1, POND_SPOTS[1]), POND_SPOTS[1]);
  assert.equal(pondSpotFor(2, POND_SPOTS[1]), POND_BIG_SPOT);
  assert.equal(pondSpotFor(3, null), POND_BIG_SPOT);
});

test('pondStageInfo — 수첩 종 수와 재료가 모두 차야 넓힐 수 있다', () => {
  const rich = { stone: 26, wood: 20, coins: 310 };
  const ok = pondStageInfo(1, rich, 5);
  assert.equal(ok.maxed, false);
  assert.equal(ok.next.stage, 2);
  assert.deepEqual(ok.book, { need: 4, have: 5, ok: true });
  assert.deepEqual(ok.items, [{ k: 'stone', need: 20, have: 26 }, { k: 'wood', need: 20, have: 20 }, { k: 'coins', need: 200, have: 310 }]);
  assert.equal(ok.affordable, true);

  assert.equal(pondStageInfo(1, rich, 3).affordable, false);
  assert.equal(pondStageInfo(1, rich, 3).book.ok, false);
  assert.equal(pondStageInfo(1, { ...rich, wood: 12 }, 5).affordable, false);
  assert.equal(pondStageInfo(1, undefined, 5).items[0].have, 0);

  const top = pondStageInfo(3, rich, 11);
  assert.equal(top.maxed, true);
  assert.equal(top.next, null);
  assert.equal(top.affordable, false);
});

test('pondStageShort — 광고 자리는 모자란 돌·목재만, 코인은 넣지 않는다', () => {
  const s = pondStageShort(1, { stone: 26, wood: 12, coins: 100 });
  assert.equal(s.slot, 'pond2');
  assert.deepEqual(s.list, [{ k: 'wood', need: 20, have: 12, more: 8 }]);
  assert.equal(pondStageShort(1, { stone: 20, wood: 20, coins: 0 }), null);
  assert.equal(pondStageShort(2, { stone: 0, wood: 0 }).slot, 'pond3');
  assert.equal(pondStageShort(3, {}), null);
});

test('pondDecorInWay — 넓은 자리에 놓인 꾸미기 수, 1단계에는 없다', () => {
  const at = (dx, dz) => ({ dx: POND_BIG_SPOT.dx + dx, dz: POND_BIG_SPOT.dz + dz });
  assert.equal(pondDecorInWay([at(0, 0)], 1), 0);
  assert.equal(pondDecorInWay([at(0, 0), at(20, 0)], 2), 1);
  assert.equal(pondDecorInWay([at(3.6, 0)], 2), 0);
  assert.equal(pondDecorInWay([at(3.6, 0)], 3), 1);
  assert.equal(pondDecorInWay(undefined, 3), 0);
});

test('pondPlotsInWay — 넓은 자리에 갈아 둔 밭 수, 꾸미기와 같은 거리', () => {
  const house = { x: -8, z: -8 };
  const at = (dx, dz) => ({ x: house.x + POND_BIG_SPOT.dx + dx, z: house.z + POND_BIG_SPOT.dz + dz, state: 'growing' });
  assert.equal(pondPlotsInWay([at(0, 0)], house, 1), 0);
  assert.equal(pondPlotsInWay([at(0, 0), at(2, 0), at(20, 0)], house, 2), 2);
  assert.equal(pondPlotsInWay([at(3.4, 0)], house, 2), 1);
  assert.equal(pondPlotsInWay([at(3.6, 0)], house, 2), 0);
  assert.equal(pondPlotsInWay([at(3.6, 0)], house, 3), 1);
  assert.equal(pondPlotsInWay([at(4.5, 0)], house, 3), 0);
  assert.equal(pondPlotsInWay([{ x: 0, z: 84 }, { x: NaN, z: 0 }, null], house, 3), 0);
  assert.equal(pondPlotsInWay(undefined, house, 3), 0);
});

test('pondFishLimits — 2단계부터 바다 대어 4마리, 3단계는 강 물고기 종당 2마리', () => {
  assert.deepEqual(pondFishLimits(1), { seaMax: 1, riverDup: 1 });
  assert.deepEqual(pondFishLimits(2), { seaMax: 4, riverDup: 1 });
  assert.deepEqual(pondFishLimits(3), { seaMax: 4, riverDup: 2 });
});

test('버튼·구경 거리는 반지름을 따라 커지고 1단계는 예전 값과 같다', () => {
  assert.ok(Math.abs(pondActR(1) - 3.4) < 1e-9);
  assert.ok(Math.abs(pondViewR(1) - 5) < 1e-9);
  assert.ok(Math.abs(pondActR(3) - 5.3) < 1e-9);
  assert.ok(Math.abs(pondViewR(3) - 6.9) < 1e-9);
});

test('pondView — 바다 대어를 무거운 순으로 seaMax 마리까지, 기본은 1마리', () => {
  const state = { dexFish: { common: 1 }, seaBest: { tuna: 30, mackerel: 4, squid: 9, flounder: 0 } };
  const ids = { riverIds: ['common'], seaIds: ['mackerel', 'squid', 'tuna', 'flounder'] };
  const one = pondView(state, ids);
  assert.deepEqual(one.sea, { sp: 'tuna', w: 30 });
  assert.deepEqual(one.seas, [{ sp: 'tuna', w: 30 }]);
  const four = pondView(state, ids, { seaMax: 4 });
  assert.deepEqual(four.sea, { sp: 'tuna', w: 30 });
  assert.deepEqual(four.seas, [{ sp: 'tuna', w: 30 }, { sp: 'squid', w: 9 }, { sp: 'mackerel', w: 4 }]);
  assert.deepEqual(pondView({ dexFish: { common: 1 } }, ids, { seaMax: 4 }).seas, []);
});

test('pondBigSpotBlocks — 넓은 자리의 3단계 반지름과 여유 안쪽만 막는다', () => {
  const house = { x: -8, z: -8 };
  const c = { x: house.x + POND_BIG_SPOT.dx, z: house.z + POND_BIG_SPOT.dz };
  assert.equal(pondBigSpotBlocks(house, c.x, c.z), true);
  assert.equal(pondBigSpotBlocks(house, c.x + 3.8, c.z), true);
  assert.equal(pondBigSpotBlocks(house, c.x + 4.0, c.z), false);
  assert.equal(pondBigSpotBlocks(house, c.x + 4.0, c.z, 2), true);
  assert.equal(pondBigSpotBlocks(house, c.x, c.z + 6, 2), false);
});

test('applyExpand — 딱 맞는 재료로 사면 0이 되고 음수가 되지 않으며 원본은 그대로다', () => {
  const inv = { stone: 20, wood: 20, coins: 200, fish: 3 };
  const hints = { pond: true, pondStage: 1 };
  const out = applyExpand(inv, hints, pondStageInfo(1, inv, 4), true);
  assert.deepEqual(out.inventory, { stone: 0, wood: 0, coins: 0, fish: 3 });
  assert.deepEqual(out.hintsSeen, { pond: true, pondStage: 2 });
  assert.equal(out.stage, 2);
  assert.deepEqual(out.cost, { stone: 20, wood: 20, coins: 200 });
  assert.deepEqual(inv, { stone: 20, wood: 20, coins: 200, fish: 3 });
  assert.deepEqual(hints, { pond: true, pondStage: 1 });
});

test('applyExpand — 살 수 없으면 아무것도 바꾸지 않는다', () => {
  const inv = { stone: 26, wood: 12, coins: 310 };
  assert.equal(applyExpand(inv, {}, pondStageInfo(1, inv, 5), false), null);
  assert.equal(applyExpand(inv, {}, pondStageInfo(1, inv, 5), true), null);
  assert.equal(applyExpand({ stone: 99, wood: 99, coins: 999 }, { pondStage: 3 }, pondStageInfo(3, {}, 11), true), null);
  assert.equal(applyExpand(undefined, undefined, pondStageInfo(1, undefined, 5), true), null);
  assert.deepEqual(inv, { stone: 26, wood: 12, coins: 310 });
});

test('applyExpand — 연달아 두 번 사면 두 번째는 3단계 값으로 따로 판정된다', () => {
  const first = applyExpand({ stone: 30, wood: 30, coins: 300 }, {}, pondStageInfo(1, { stone: 30, wood: 30, coins: 300 }, 8), true);
  assert.equal(first.stage, 2);
  const again = applyExpand(first.inventory, first.hintsSeen, pondStageInfo(first.stage, first.inventory, 8), true);
  assert.equal(again, null);
  assert.deepEqual(first.inventory, { stone: 10, wood: 10, coins: 100 });
});
