import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nearestOutdoorAt, takeStored } from '../js/outdoor-move.js';

const ITEMS = [{ x: 0, z: 0 }, { x: 3, z: 0 }, { x: 0, z: 5 }];

test('nearestOutdoorAt: reach 안에 아무것도 없으면 null', () => {
  assert.equal(nearestOutdoorAt(ITEMS, 10, 10, 1.0), null);
  assert.equal(nearestOutdoorAt([], 0, 0, 1.0), null);
});

test('nearestOutdoorAt: 가장 가까운 것의 index·거리', () => {
  const r = nearestOutdoorAt(ITEMS, 2.4, 0, 1.0);
  assert.equal(r.index, 1);
  assert.ok(Math.abs(r.d - 0.6) < 1e-9);
});

test('nearestOutdoorAt: 여럿이 reach 안이면 더 가까운 쪽', () => {
  const r = nearestOutdoorAt(ITEMS, 1.0, 0, 5.0);
  assert.equal(r.index, 0);
});

test('nearestOutdoorAt: reach 경계는 미포함(< reach)', () => {
  assert.equal(nearestOutdoorAt(ITEMS, 1.0, 0, 1.0), null);
});

test('takeStored: 없으면 null, 원본은 건드리지 않음', () => {
  const s = { fence: 1 };
  assert.equal(takeStored(s, 'scarecrow'), null);
  assert.equal(takeStored({}, 'fence'), null);
  assert.equal(takeStored(undefined, 'fence'), null);
  assert.deepEqual(s, { fence: 1 });
});

test('takeStored: 하나 꺼내면 개수 -1, 0이면 키 삭제', () => {
  const s = { fence: 2, path: 1 };
  assert.deepEqual(takeStored(s, 'fence'), { fence: 1, path: 1 });
  assert.deepEqual(takeStored(s, 'path'), { fence: 2 });
  assert.deepEqual(s, { fence: 2, path: 1 });   // 불변
});

// ── 🌾 밭일 우선(허수아비가 파종을 가로채던 문제) ───────────────
import { canPromptOutdoorMove, outdoorDistance, OUTDOOR_MOVE_REACH, OUTDOOR_TAP_REACH } from '../js/outdoor-move.js';

const OK = { hasPrompt: false, placing: false, nearNPC: false, outdoorZone: true, farmFirst: false };

test('canPromptOutdoorMove: 아무것도 안 걸리면 옮기기 프롬프트', () => {
  assert.equal(canPromptOutdoorMove(OK), true);
});

test('canPromptOutdoorMove: 밭일이 우선이면 안 띄운다 — 액션은 밭일로 간다', () => {
  assert.equal(canPromptOutdoorMove({ ...OK, farmFirst: true }), false);
});

test('canPromptOutdoorMove: 문·시설·주민·배치 중·실내는 기존대로 막는다', () => {
  assert.equal(canPromptOutdoorMove({ ...OK, hasPrompt: true }), false);
  assert.equal(canPromptOutdoorMove({ ...OK, placing: true }), false);
  assert.equal(canPromptOutdoorMove({ ...OK, nearNPC: true }), false);
  assert.equal(canPromptOutdoorMove({ ...OK, outdoorZone: false }), false);
});

test('outdoorDistance: 발자국 없는 장식은 중심 거리', () => {
  assert.ok(Math.abs(outdoorDistance(3, 0, 0, 0) - 3) < 1e-9);
});

test('outdoorDistance: 발자국이 있으면 가장자리 거리 — 2×2 안에 서면 0', () => {
  assert.equal(outdoorDistance(0.5, 0.5, 0, 0, 1, 1), 0);
  assert.ok(Math.abs(outdoorDistance(3, 0, 0, 0, 1, 1) - 2) < 1e-9);
});

test('탭 집기 사거리가 근접 프롬프트보다 넓다 — 밭일에 가려져도 탭으로 옮길 수 있게', () => {
  assert.ok(OUTDOOR_TAP_REACH > OUTDOOR_MOVE_REACH);
});

test('canPromptOutdoorMove: 🧺창고·📋게시판은 밭일에 양보하지 않는다 — 꺼내기·고용이 막히면 안 된다', () => {
  assert.equal(canPromptOutdoorMove({ ...OK, farmFirst: true, isFacility: true }), true);
  assert.equal(canPromptOutdoorMove({ ...OK, hasPrompt: true, isFacility: true }), false);   // 문·시설 프롬프트는 여전히 먼저
});
