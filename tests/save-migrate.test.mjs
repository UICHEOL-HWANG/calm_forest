import { test } from 'node:test';
import assert from 'node:assert/strict';
import { progressScore, pickSave } from '../js/save-migrate.js';

// 🔵 토스 식별키 연결이 안 돼 게스트로 플레이한 진행도를, 연결이 살아난 뒤 정식 계정으로 옮긴다.
//   (2026-09-05~13 인증서 삭제 사고: 신규 토스 기기 전원이 8일간 게스트로 빠짐)
//   규칙: 정식 계정에 저장이 없으면 게스트 저장을 옮긴다. 둘 다 있으면 더 많이 진행한 쪽을 남긴다(동점이면 정식 계정).

const fresh = { inventory: { coins: 20, wood: 0 }, houseStage: 0, npcs: {}, dex: {}, badges: [] };
const played = { inventory: { coins: 340, wood: 25, fish: 4 }, houseStage: 2, npcs: { farmer: { idx: 3 }, courier: { idx: 2 } }, dex: { fish_carp: 1, wood: 1 }, badges: ['first_chop'] };

test('progressScore — 진행이 많을수록 크고, 비어 있으면 0', () => {
  assert.equal(progressScore(null), 0);
  assert.equal(progressScore({}), 0);
  assert.ok(progressScore(played) > progressScore(fresh));
});

test('pickSave — 정식 저장이 없으면 게스트 저장을 옮긴다', () => {
  assert.deepEqual(pickSave(null, played), { keep: 'guest', migrate: true });
});

test('pickSave — 게스트 저장이 없으면 그대로', () => {
  assert.deepEqual(pickSave(played, null), { keep: 'toss', migrate: false });
  assert.deepEqual(pickSave(null, null), { keep: 'toss', migrate: false });
});

test('pickSave — 둘 다 있으면 더 진행한 쪽, 동점이면 정식 계정', () => {
  assert.deepEqual(pickSave(fresh, played), { keep: 'guest', migrate: true });
  assert.deepEqual(pickSave(played, fresh), { keep: 'toss', migrate: false });
  assert.deepEqual(pickSave(played, played), { keep: 'toss', migrate: false });
});
