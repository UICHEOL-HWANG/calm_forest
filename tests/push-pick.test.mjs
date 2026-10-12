// 🔔 푸시 — 오늘 누구에게 무엇을 보낼지(순수). 하루 1통·우선순위 🦝 > 🔥🫙 > 🌱
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { kstDates, nightInput, pickPush, messageFor } from '../functions/push/pick-kind.js';

// 2026-10-13 20:00 KST = 11:00 UTC
const NOW = Date.parse('2026-10-13T11:00:00Z');
const D = kstDates(NOW);
const growing = [{ x: 0, z: 0, state: 'growing', crop: 'carrot' }];
const row = (o = {}) => ({
  updated_at: '2026-10-13T01:00:00Z',     // 오늘 10시 KST 에 접속
  plots: growing, outdoor: [], truce: null,
  night_last: '2026-10-13', craft: { slots: [] }, returns_7d: 0, ...o,
});

test('kstDates — UTC 11:00 은 KST 같은 날 20:00', () => {
  assert.deepEqual(D, { today: '2026-10-13', yesterday: '2026-10-12', tomorrow: '2026-10-14', todayStartMs: Date.parse('2026-10-12T15:00:00Z') });
  assert.equal(kstDates(Date.parse('2026-10-13T16:00:00Z')).today, '2026-10-14', 'UTC 16시 = KST 다음날 01시');
});

test('nightInput — 자라는 밭·감시 시작(night_last)이 있어야 판정 대상', () => {
  assert.equal(nightInput(row({ plots: [] }), '2026-10-14', D), null);
  assert.equal(nightInput(row({ plots: [{ x: 0, z: 0, state: 'empty' }] }), '2026-10-14', D), null);
  assert.equal(nightInput(row({ night_last: null }), '2026-10-14', D), null, '감시 시작 전엔 첫 접속이 lastDate 만 찍는다');
  const n = nightInput(row({ outdoor: [{ id: 'scarecrow', x: 1, z: 1 }], truce: { boar: '2026-10-15' } }), '2026-10-14', D);
  assert.equal(n.plotCount, 1);
  assert.equal(n.scarecrow, true);
  assert.equal(n.fence, false);
  assert.deepEqual(n.blocked, ['boar']);
});

test('nightInput — 오늘 접속(night_last=오늘)한 사람만. 아니면 다음 접속일 판정이라 예고가 어긋난다', () => {
  assert.ok(nightInput(row(), '2026-10-14', D));
  assert.equal(nightInput(row({ night_last: '2026-10-12' }), '2026-10-14', D), null);
});

test('computeNightDefense — 세이브의 null 항목에 죽지 않는다', () => {
  assert.ok(nightInput(row({ outdoor: [null, { id: 'scarecrow', x: 1, z: 1 }] }), '2026-10-14', D).scarecrow);
});

test('우선순위 — 밤손님이 오면 가공 완료보다 먼저', () => {
  const r = row({ updated_at: '2026-10-12T10:00:00Z', craft: { slots: [{ item: 'charcoal', day: '2026-10-12' }] } });
  assert.equal(pickPush(r, D, { visited: true }).kind, 'night');
  assert.equal(pickPush(r, D, { visited: false }).kind, 'craft');
});

test('🔥 가공 완료 — 어젯밤 넣은 것 & 오늘 아직 안 들어온 사람만', () => {
  const slots = [{ item: 'charcoal', day: '2026-10-12' }];
  assert.equal(pickPush(row({ updated_at: '2026-10-12T10:00:00Z', craft: { slots } }), D, null).kind, 'craft');
  assert.equal(pickPush(row({ craft: { slots } }), D, null), null, '오늘 이미 접속했으면 게임 안에서 봤다');
  assert.equal(pickPush(row({ updated_at: '2026-10-12T10:00:00Z', craft: { slots: [{ item: 'charcoal', day: '2026-10-10' }] } }), D, null), null,
    '며칠 묵은 완성품으로 매일 울리지 않는다');
  assert.equal(pickPush(row({ updated_at: '2026-10-12T10:00:00Z', craft: { slots: [{ item: 'charcoal', day: '2026-10-13' }] } }), D, null), null, '오늘 넣은 건 아직');
});

test('🌱 복귀 — 3일 이상 & 작물 있음 & 7일 2회 & 30일 넘으면 그만', () => {
  const away = d => new Date(NOW - d * 86400000).toISOString();
  assert.equal(pickPush(row({ updated_at: away(2) }), D, null), null);
  assert.equal(pickPush(row({ updated_at: away(3) }), D, null).kind, 'return');
  assert.equal(pickPush(row({ updated_at: away(3), plots: [] }), D, null), null, '밭이 비면 돌아올 이유가 없다');
  assert.equal(pickPush(row({ updated_at: away(4), returns_7d: 2 }), D, null), null);
  assert.equal(pickPush(row({ updated_at: away(31) }), D, null), null);
});

test('messageFor — 확정 문구·장치 이름·영어', () => {
  assert.deepEqual(messageFor({ kind: 'night' }, 'ko'), { title: '🌙 밭이 조금 수상해요', body: '오늘 밤 누군가 찾아올지도 몰라요.' });
  assert.deepEqual(messageFor({ kind: 'craft', stations: ['kiln'] }, 'ko'), { title: '🔥 화덕에 넣어 둔 게 다 됐어요', body: '꺼내러 와 주세요 🌿' });
  assert.equal(messageFor({ kind: 'craft', stations: ['vat'] }, 'ko').title, '🫙 발효통에 넣어 둔 게 다 됐어요');
  assert.equal(messageFor({ kind: 'craft', stations: ['kiln', 'vat'] }, 'ko').title, '🔥🫙 화덕·발효통에 넣어 둔 게 다 됐어요');
  assert.deepEqual(messageFor({ kind: 'return' }, 'ko'), { title: '🍓 수확할 게 생겼을지도 몰라요', body: '숲이 조용히 기다리고 있어요.' });
  for (const k of [{ kind: 'night' }, { kind: 'craft', stations: ['vat'] }, { kind: 'return' }]) {
    const m = messageFor(k, 'en');
    assert.ok(m.title && m.body && !/[가-힣]/.test(m.title + m.body), `영어판에 한국어 혼입: ${k.kind}`);
  }
});
