import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PREPASS_CAPS, houseShort, prepassGrant, prepassArm } from '../js/guide/prepass-rules.js';

test('집 단계마다 다음 단계 재료 중 모자란 것만 센다', () => {
  assert.deepEqual(houseShort(0, { wood: 9 }), { slot: 'house1', stage: 1, list: [{ k: 'wood', need: 15, have: 9, more: 6 }] });
  assert.deepEqual(houseShort(1, { wood: 20, stone: 4 }).list, [{ k: 'stone', need: 10, have: 4, more: 6 }]);
  assert.equal(houseShort(2, { wood: 30, stone: 20, coins: 50 }).slot, 'house3');
  assert.equal(houseShort(0, { wood: 15 }), null);
  assert.equal(houseShort(3, {}), null);
});

test('광고 보상은 모자란 만큼, 재료마다 상한까지만 준다', () => {
  assert.deepEqual(prepassGrant([{ k: 'wood', more: 6 }]), { wood: 6 });
  assert.deepEqual(prepassGrant([{ k: 'wood', more: 30 }, { k: 'stone', more: 2 }, { k: 'coins', more: 80 }]), { wood: PREPASS_CAPS.wood, stone: 2, coins: PREPASS_CAPS.coins });
  assert.deepEqual(prepassGrant([{ k: 'gem', more: 3 }]), {});
  assert.deepEqual(prepassGrant([]), {});
});

test('배정은 기기마다 고정이고 50:50 에 가깝다', () => {
  const a = prepassArm('abc', 'android');
  assert.ok(['ad', 'control'].includes(a));
  assert.equal(prepassArm('abc', 'android'), a);
  const n = Array.from({ length: 2000 }, (_, i) => prepassArm(`d${i}`, 'android')).filter(x => x === 'ad').length;
  assert.ok(n > 900 && n < 1100, String(n));
});

test('다리 부족: 🪵10 🪨5 중 모자란 것만, 다 있으면 null', async () => {
  const { bridgeShort } = await import('../js/guide/prepass-rules.js');
  assert.deepEqual(bridgeShort({ wood: 4, stone: 5 }), { slot: 'bridge', ico: '🌉', verb: '다리 고치기', list: [{ k: 'wood', need: 10, have: 4, more: 6 }] });
  assert.equal(bridgeShort({ wood: 10, stone: 5 }), null);
});

test('밭 넓히기 부족: 다음 단계 비용 기준, 최고 단계면 null', async () => {
  const { farmStageShort } = await import('../js/guide/prepass-rules.js');
  const s = farmStageShort(1, { wood: 40, stone: 5, coins: 100 });
  assert.equal(s.slot, 'farm2');
  assert.deepEqual(s.list.map(r => [r.k, r.more]), [['stone', 15], ['coins', 50]]);
  assert.equal(farmStageShort(1, { wood: 40, stone: 20, coins: 150 }), null);
  assert.equal(farmStageShort(3, {}), null);
});

test('광고 버튼 문구 조각: 상한까지 받을 만큼만 보여 준다', async () => {
  const { shortAdParts, prepassGrant } = await import('../js/guide/prepass-rules.js');
  const give = prepassGrant([{ k: 'stone', more: 15 }, { k: 'coins', more: 50 }]);
  assert.deepEqual(give, { stone: 6, coins: 40 });
  assert.deepEqual(shortAdParts(give, 'ko'), ['광고 보고', ' ', '🪨 6', '개', ' · ', '🪙 40', '개', ' ', '받기']);
  assert.deepEqual(shortAdParts(give, 'en'), ['광고 보고', ' ', '🪨 6', ' · ', '🪙 40', ' ', '받기']);
});

test('장소 카드: 반경 안에서 부족한 곳 중 가장 가까운 한 곳', async () => {
  const { nearestShortSpot } = await import('../js/guide/prepass-rules.js');
  const sh = (slot) => () => ({ slot, list: [{ k: 'wood', more: 1 }] });
  const spots = [
    { id: 'house', at: { x: 0, z: 0 }, short: sh('house1') },
    { id: 'bridge', at: { x: 4, z: 0 }, short: sh('bridge') },
    { id: 'farm', at: { x: 1, z: 0 }, short: () => null },
  ];
  assert.equal(nearestShortSpot(spots, { x: 3, z: 0 }, 6).sh.slot, 'bridge');
  assert.equal(nearestShortSpot(spots, { x: 0.5, z: 0 }, 6).sh.slot, 'house1');
  assert.equal(nearestShortSpot(spots, { x: 30, z: 0 }, 6), null);
  assert.equal(nearestShortSpot([{ id: 'x', at: { x: 0, z: 0 }, short: sh('x'), active: () => false }], { x: 0, z: 0 }, 6), null);
});

test('카페 주문 상한: 요리 재료만, 한 번에 최대 주문 하나 분량', async () => {
  const { CAFE_CAPS, prepassGrant: grant } = await import('../js/guide/prepass-rules.js');
  assert.deepEqual(grant([{ k: 'crop', more: 5 }, { k: 'fish', more: 1 }], CAFE_CAPS), { crop: 3, fish: 1 });
  assert.deepEqual(grant([{ k: 'flour', more: 3 }, { k: 'juice', more: 1 }], CAFE_CAPS), { flour: 2, juice: 1 });
  assert.deepEqual(grant([{ k: 'gem', more: 1 }], CAFE_CAPS), {});
  assert.deepEqual(grant([{ k: 'crop', more: 2 }]), {});
});
