import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gameSource } from './helpers/game-source.mjs';
import { EN } from '../js/i18n-en.js';

const SRC = gameSource();
const STOW_M = '🎒 도구를 등에 멨어요. 여기선 맨손으로 해요. 나가면 다시 꺼내 들어요';
const BARE_M = '✋ 맨손이에요. 오른쪽 아래 도구 버튼을 탭해서 꺼내세요';

test('모바일 안내엔 숫자키·하단 왼쪽 버튼 이야기가 없다', () => {
  for (const s of [STOW_M, BARE_M]) assert.doesNotMatch(s, /숫자|하단 왼쪽|1번/);
});

test('맨손 구역·맨손 행동 안내는 모바일과 PC 문구를 나눠 쓴다', () => {
  assert.ok(SRC.includes(`touchHud() ? '${STOW_M}' : '🎒 도구를 등에 멨어요. 하단 왼쪽 버튼(숫자 1)으로 다시 꺼낼 수 있어요'`));
  assert.ok(SRC.includes(`touchHud() ? '${BARE_M}' : '✋ 맨손이에요 — 하단 왼쪽 버튼(숫자 1)으로 도구를 꺼내세요'`));
});

test('모바일 문구도 영어 사전에 있다', () => {
  assert.ok(EN[STOW_M]);
  assert.ok(EN[BARE_M]);
});
