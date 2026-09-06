import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BETA, BETA_COPY, kstDate, betaDay, mapOpenDay, isMapLocked, lockLine, openLine, isFinalDay } from '../js/tuning.js';

const T = (iso) => Date.parse(iso);

test('kstDate: UTC 자정 직전은 KST 로 다음 날', () => {
  assert.equal(kstDate(T('2026-09-08T15:30:00Z')), '2026-09-09');   // KST 00:30
  assert.equal(kstDate(T('2026-09-08T14:30:00Z')), '2026-09-08');   // KST 23:30
});

test('betaDay: 시작일 이후 가입은 가입일이 D1', () => {
  assert.equal(betaDay('2026-09-10T01:00:00Z', T('2026-09-10T02:00:00Z')), 1);
  assert.equal(betaDay('2026-09-10T01:00:00Z', T('2026-09-12T02:00:00Z')), 3);
});

test('betaDay: 시작일 전에 미리 가입해도 D1 은 시작일', () => {
  assert.equal(betaDay('2026-09-07T01:00:00Z', T('2026-09-09T02:00:00Z')), 1);
  assert.equal(betaDay('2026-09-07T01:00:00Z', T('2026-09-08T02:00:00Z')), 0);   // 시작 전날 = 0
});

test('betaDay: created_at 없으면 1', () => {
  assert.equal(betaDay(null, T('2026-09-20T00:00:00Z')), 1);
});

test('mapOpenDay: 순서별 여는 날', () => {
  assert.equal(mapOpenDay('sea_first', 'sea'), 3);
  assert.equal(mapOpenDay('sea_first', 'mist'), 5);
  assert.equal(mapOpenDay('mist_first', 'sea'), 5);
  assert.equal(mapOpenDay('mist_first', 'mist'), 3);
  assert.equal(mapOpenDay(null, 'sea'), null);
});

test('isMapLocked: 베타 테스터는 여는 날 전까지 잠김', () => {
  const s = { variant: 'beta_A', mapOrder: 'sea_first', createdAtIso: '2026-09-09T01:00:00Z' };
  assert.equal(isMapLocked({ ...s, nowMs: T('2026-09-10T02:00:00Z') }, 'sea'), true);    // D2
  assert.equal(isMapLocked({ ...s, nowMs: T('2026-09-11T02:00:00Z') }, 'sea'), false);   // D3
  assert.equal(isMapLocked({ ...s, nowMs: T('2026-09-11T02:00:00Z') }, 'mist'), true);   // D3, 안개숲은 D5
  assert.equal(isMapLocked({ ...s, nowMs: T('2026-09-13T02:00:00Z') }, 'mist'), false);  // D5
});

test('isMapLocked: 일반 유저·게스트·배정 없음은 절대 안 잠김', () => {
  const now = T('2026-09-09T02:00:00Z');
  assert.equal(isMapLocked({ variant: 'control', mapOrder: 'sea_first', createdAtIso: '2026-09-09T01:00:00Z', nowMs: now }, 'sea'), false);
  assert.equal(isMapLocked({ variant: 'beta_B', mapOrder: null, createdAtIso: '2026-09-09T01:00:00Z', nowMs: now }, 'sea'), false);
  assert.equal(isMapLocked({ variant: 'beta_B', mapOrder: 'mist_first', createdAtIso: null, nowMs: now }, 'sea'), true); // created_at 없으면 D1 취급 → 잠김
});

test('isFinalDay: 7일차거나 종료일이면 true', () => {
  assert.equal(isFinalDay('2026-09-09T01:00:00Z', T('2026-09-15T02:00:00Z')), true);   // 7일차
  assert.equal(isFinalDay('2026-09-10T01:00:00Z', T('2026-09-14T02:00:00Z')), false);  // 5일차, 종료일 전
  assert.equal(isFinalDay('2026-09-10T01:00:00Z', T('2026-09-15T02:00:00Z')), true);   // 종료일 도달
  assert.equal(isFinalDay('2026-09-09T01:00:00Z', T('2026-09-13T02:00:00Z')), false);
});

test('문구: N 이 채워지고 열림 문구는 맵별', () => {
  assert.equal(lockLine('sea', 3), '🌊 바다터는 3일차에 열려요');
  assert.equal(lockLine('mist', 5), '🌫️ 안개 낀 숲은 5일차에 열려요');
  assert.match(openLine('sea'), /바다터가 열렸어요/);
  assert.match(openLine('mist'), /안개 낀 숲이 열렸어요/);
  assert.equal(BETA_COPY.diaryBtn, '📝 오늘 일지');
  assert.equal(BETA.startDate, '2026-09-09');
});
