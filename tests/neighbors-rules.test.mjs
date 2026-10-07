import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  REWARD_CAP, REWARD_COINS, EMOJI, EMOJI_IDS, FAIL_TOAST, houseLabel, pickerMeta, rewardLine, pickerRows, hostSpot,
  houseSolidR, reactOutcome, visitorsSince, noticeView, neighborsDefault, restoreNeighbors, recordVisit, markSeen,
} from '../js/neighbors/rules.js';
import { stage7ExitPoint } from '../js/house-stage7.js';

const face = (id) => ({ rabbit: '🐰', bear: '🐻' }[id] || '🦊');

test('상수', () => {
  assert.equal(REWARD_CAP, 3); assert.equal(REWARD_COINS, 5);
  assert.deepEqual(EMOJI_IDS, ['wave', 'heart', 'flower', 'star']);
  assert.deepEqual(Object.values(EMOJI), ['👋', '❤️', '🌸', '⭐']);
  assert.equal(FAIL_TOAST, '연결이 불안정해요. 잠시 후 다시 시도해 주세요.');
});

test('집 단계 이름 · 카드 메타 · 보상 줄', () => {
  assert.equal(houseLabel(1), '🪵 나무 바닥(데크)');
  assert.equal(houseLabel(2), '🪵 통나무 벽');
  assert.equal(houseLabel(3), '🏠 코티지');
  assert.equal(houseLabel(6), '🏝️ 루프탑 빌라');
  assert.equal(houseLabel(7), '🏡 정원 저택');
  assert.equal(pickerMeta({ house_stage: 6, decor_n: 23 }), '🏝️ 루프탑 빌라 · 🪴 장식 23');
  assert.equal(rewardLine(1), '🪙 오늘 받은 방문 보상 1/3');
  assert.equal(rewardLine(9), '🪙 오늘 받은 방문 보상 3/3');
});

test('pickerRows: 3명까지 · 다녀온 이웃은 또 보기', () => {
  const rows = pickerRows([
    { public_id: 'p1', nick: '반짝이는 곰 #4821', character: 'bear', house_stage: 6, decor_n: 23, visited_today: false },
    { public_id: 'p2', nick: '별 헤는 판다 #7302', character: 'panda', house_stage: 7, decor_n: 17, visited_today: true, reacted_emoji: 'heart' },
    { public_id: 'p3', nick: 'c', character: 'rabbit', house_stage: 3, decor_n: 0, visited_today: false },
    { public_id: 'p4', nick: 'd', character: 'rabbit', house_stage: 3, decor_n: 0, visited_today: false },
  ], face);
  assert.equal(rows.length, 3);
  assert.deepEqual(rows[0], { publicId: 'p1', slot: 0, face: '🐻', nick: '반짝이는 곰 #4821', meta: '🏝️ 루프탑 빌라 · 🪴 장식 23', done: false, go: '놀러 가기' });
  assert.equal(rows[1].done, true); assert.equal(rows[1].go, '또 보기'); assert.equal(rows[1].face, '🦊');
  assert.deepEqual(pickerRows(null, face), []);
});

test('집주인 자리 · 집 충돌 반경(js/spaces/house.js 와 같은 표)', () => {
  const o = { x: 0, z: 700 };
  assert.deepEqual(hostSpot(6, null, o), { x: 0, z: 703 });
  assert.deepEqual(hostSpot(1, null, o), { x: 0, z: 703 });
  assert.deepEqual(hostSpot(7, 'hanok', o), stage7ExitPoint('hanok', o));
  assert.deepEqual([3, 4, 5, 6, 7].map(houseSolidR), [2.2, 2.4, 2.55, 2.7, 3.9]);
});

test('반응 결과 해석', () => {
  assert.deepEqual(reactOutcome({ ok: true, reason: 'ok', rewarded: true, rewarded_today: 1 }),
    { reason: 'ok', reward: true, toast: '❤️ 마음을 남겼어요 · 🪙+5', bubble: 'thanks', rewardedToday: 1 });
  assert.deepEqual(reactOutcome({ ok: true, reason: 'ok', rewarded: false, rewarded_today: 3 }),
    { reason: 'ok', reward: false, toast: '❤️ 마음을 남겼어요', bubble: 'thanks', rewardedToday: 3 });
  assert.deepEqual(reactOutcome({ ok: false, reason: 'dup', rewarded_today: 2 }),
    { reason: 'dup', reward: false, toast: null, bubble: 'thanks', rewardedToday: 2 });
  assert.deepEqual(reactOutcome({ ok: false, reason: 'login' }),
    { reason: 'login', reward: false, toast: '🔐 로그인하면 마음을 남길 수 있어요', bubble: null, rewardedToday: 0 });
  for (const reason of ['private', 'self', 'not_found', 'emoji', 'offline', 'upstream', 'auth']) {
    assert.deepEqual(reactOutcome({ ok: false, reason }), { reason, reward: false, toast: FAIL_TOAST, bubble: null, rewardedToday: 0 });
  }
  assert.equal(reactOutcome(null).reason, 'offline');
});

test('알림 시작 시각 = max(seenAt, KST 어제 00:00)', () => {
  const now = Date.parse('2026-10-07T12:00:00+09:00');
  const yday = Date.parse('2026-10-06T00:00:00+09:00');
  assert.equal(visitorsSince(0, now), yday);
  assert.equal(visitorsSince(yday + 5, now), yday + 5);
  assert.equal(visitorsSince(0, Date.parse('2026-10-07T00:30:00+09:00')), yday);   // KST 자정 직후(UTC 로는 전날)
});

test('알림 뷰: 최대 10줄 + 외 N명', () => {
  const list = Array.from({ length: 10 }, (_, i) => ({ nick: `n${i}`, character: 'rabbit', emoji: 'heart' }));
  const v = noticeView({ total: 12, list }, face);
  assert.equal(v.title, '이웃 12명이 다녀갔어요');
  assert.equal(v.rows.length, 10); assert.equal(v.more, 2); assert.equal(v.total, 12);
  assert.deepEqual(v.rows[0], { face: '🐰', nick: 'n0', emoji: '❤️' });
  const one = noticeView({ total: 1, list: [{ nick: 'a', character: 'bear', emoji: 'star' }] }, face);
  assert.equal(one.title, '이웃 1명이 다녀갔어요'); assert.equal(one.more, 0);
});

test('세이브 필드 — 기본값·복원·기록은 새 객체', () => {
  assert.deepEqual(neighborsDefault(), { visited: 0, seenAt: 0 });
  assert.deepEqual(restoreNeighbors(undefined), { visited: 0, seenAt: 0 });
  assert.deepEqual(restoreNeighbors({ visited: 2.7, seenAt: -5, extra: 1 }), { visited: 2, seenAt: 0 });
  const nb = { visited: 1, seenAt: 100 };
  const v2 = recordVisit(nb);
  assert.deepEqual(v2, { visited: 2, seenAt: 100 }); assert.deepEqual(nb, { visited: 1, seenAt: 100 });
  assert.deepEqual(markSeen(nb, 50), { visited: 1, seenAt: 100 });   // 뒤로 가지 않는다
  assert.deepEqual(markSeen(nb, 200), { visited: 1, seenAt: 200 });
});
