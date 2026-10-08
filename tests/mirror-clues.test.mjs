import { test } from 'node:test';
import assert from 'node:assert/strict';
import { flipSide, npcName, clueText, hintText, clueShort } from '../js/mirror/clues.js';
import { pickQuests } from '../js/mirror/quests.js';

const HAS_KO = /[가-힣]/;
const Q1 = { n: 1, npc: 'farmer', item: 'ring', spot: 'well-l', flipped: false };
const Q2 = { n: 2, npc: 'angler', item: 'yarn', spot: 'clock-r', flipped: true };
const QB = { n: 1, npc: 'chef', item: 'yarn', spot: 'clock-b', flipped: false };

test('flipSide — 왼↔오만, 앞·뒤는 그대로', () => {
  assert.equal(flipSide('left'), 'right'); assert.equal(flipSide('right'), 'left');
  assert.equal(flipSide('front'), 'front'); assert.equal(flipSide('back'), 'back');
});

test('그대로 단서는 실제 방향, 반전 단서는 반대 방향을 말한다', () => {
  assert.equal(clueText(Q1, 'ko'), '거울 농부 삼촌: "🪣 우물 왼쪽 덤불 밑에서 금반지를 잃어버렸어요"');
  assert.equal(clueText(Q2, 'ko'), '거울 낚시꾼 할아버지: "🕰️ 거꾸로 시계탑 왼쪽 덤불 밑에서 털실 뭉치를 잃어버렸어요"');
  assert.equal(clueText(Q2, 'en'), 'Mirror Angler: "I lost my ball of yarn under the bush to the left of the 🕰️ upside-down clock tower"');
  assert.equal(clueText(QB, 'ko'), '거울 요리사 판다: "🕰️ 거꾸로 시계탑 뒤 나무 밑에서 털실 뭉치를 잃어버렸어요"');
});

test('힌트 — 반전이면 "거울 말로는 X → 진짜는 Y", 그대로면 다시 살펴보기(조사 맞춤)', () => {
  assert.equal(hintText(Q2, 'ko'), '🪞 거울 말로는 왼쪽 → 진짜는 오른쪽이에요');
  assert.equal(hintText(Q1, 'ko'), '💧 🪣 우물 왼쪽을 다시 살펴봐요');
  assert.equal(hintText(QB, 'ko'), '💧 🕰️ 거꾸로 시계탑 뒤를 다시 살펴봐요');
  assert.equal(hintText(Q2, 'en'), '🪞 In mirror-speak "left" → it really means right');
});

test('프롬프트 줄 요약', () => {
  assert.equal(clueShort(Q1, 'ko'), '🔍 🪣 우물 왼쪽 덤불 밑 · 💍 금반지');
  assert.equal(clueShort(Q2, 'ko'), '🔍 🕰️ 거꾸로 시계탑 왼쪽 덤불 밑 · 🧶 털실 뭉치', '요약도 주민이 말한(반전) 방향');
});

test('영어 문장엔 한국어가 없다 — 28일치 실제 배정 전부', () => {
  for (let i = 1; i <= 28; i++) for (const q of pickQuests(`2026-10-${String(i).padStart(2, '0')}`)) {
    for (const s of [clueText(q, 'en'), hintText(q, 'en'), clueShort(q, 'en'), npcName(q.npc, 'en')]) assert.ok(!HAS_KO.test(s), s);
  }
});
