import { test } from 'node:test';
import assert from 'node:assert/strict';
import { interpretDonate } from '../js/plaza/donate.js';

test('성공: 받은 만큼만 차감하고 🍂 도 받은 만큼, 상한 컷은 reason cap', () => {
  const r = interpretDonate(10, { ok: true, accepted: 4, today_left: 0, my_total: 34, tier: 'bronze', stage: 1, item_have: 120, item_need: 200 });
  assert.equal(r.event, 'plaza_donate'); assert.equal(r.spend, 4); assert.equal(r.leaf, 4);
  assert.equal(r.params.requested, 10); assert.equal(r.params.accepted, 4); assert.equal(r.params.reason, 'cap');
});

test('필요량 컷은 reason need', () => {
  const r = interpretDonate(10, { ok: true, accepted: 3, today_left: 20, my_total: 3, tier: null, stage: 2, item_have: 400, item_need: 400 });
  assert.equal(r.params.reason, 'need'); assert.equal(r.spend, 3);
});

test('전량 수락은 ok', () => {
  assert.equal(interpretDonate(5, { ok: true, accepted: 5, today_left: 25, my_total: 5, stage: 1, item_have: 5, item_need: 300 }).params.reason, 'ok');
});

test('규칙 거절(cap·need·full)은 plaza_donate 로, 차감 0', () => {
  for (const reason of ['cap', 'need', 'full']) {
    const r = interpretDonate(5, { ok: false, reason });
    assert.equal(r.event, 'plaza_donate'); assert.equal(r.spend, 0); assert.equal(r.leaf, 0);
    assert.equal(r.params.accepted, 0); assert.equal(r.params.reason, reason);
  }
});

test('통신·권한·기간 실패는 plaza_donate_fail, 차감 0', () => {
  for (const reason of ['offline', 'upstream', 'auth', 'season', 'qty']) {
    const r = interpretDonate(5, { ok: false, reason });
    assert.equal(r.event, 'plaza_donate_fail'); assert.equal(r.spend, 0); assert.equal(r.params.reason, reason);
  }
  assert.equal(interpretDonate(5, null).params.reason, 'offline');
});

test('버튼: +5 · N개 보태기(N = 지금 낼 수 있는 수), 0 이면 보태기 꺼짐', async () => {
  const { donateButtons } = await import('../js/plaza/donate.js');
  const mine = { today_left: 18 };
  const stone = { item: 'stone', have: 180, need: 400 };
  assert.deepEqual(donateButtons({ stone: 50 }, mine, stone).map(b => [b.label, b.qty, b.on]), [['+5', 5, true], ['18개 보태기', 18, true]]);
  assert.deepEqual(donateButtons({ wood: 3 }, mine, { item: 'wood', have: 60, need: 200 }).map(b => [b.label, b.qty, b.on]), [['+5', 5, false], ['3개 보태기', 3, true]]);
  assert.deepEqual(donateButtons({ coal: 0 }, mine, { item: 'coal', have: 10, need: 100 }).map(b => [b.label, b.on]), [['+5', false], ['보태기', false]]);
  assert.equal(donateButtons({ stone: 50 }, mine, { item: 'stone', have: 398, need: 400 })[1].qty, 2);   // 품목 남은 수로 잘림
  assert.equal(donateButtons({ stone: 50 }, null, stone).every(b => !b.on), true);                    // 내 기록 없음(비로그인·오프라인)
});
