import { test } from 'node:test';
import assert from 'node:assert/strict';
import { josa, chipText, stageUpToast, giftCapToast, retroToast, letterTitle, letterRowText, nextRewardText } from '../js/affinity/copy.js';

test('조사는 받침을 본다', () => {
  assert.equal(josa('농부 삼촌', '과', '와'), '과');
  assert.equal(josa('목수 아저씨', '과', '와'), '와');
  assert.equal(josa('이웃', '이', '가'), '이');
  assert.equal(josa('친구', '이', '가'), '가');
});

test('대화창 칩: 진행 중 · 0 · 가족', () => {
  assert.equal(chipText(7), '🤝 친구 ❤️7/10');
  assert.equal(chipText(0), '❤️0 · 선물로 시작');
  assert.equal(chipText(18), '🌳 가족 ❤️18');
  assert.equal(chipText(7, 'en'), '🤝 Friend ❤️7/10');
  assert.equal(chipText(0, 'en'), '❤️0 · Start with a gift');
});

test('단계 오름 토스트는 확정 문구 모양을 따른다', () => {
  assert.equal(stageUpToast({ name: '목수 아저씨', idx: 2, letter: true }), '🤝 목수 아저씨와 친구가 됐어요! · ✉️ 소식함에 편지가 왔어요');
  assert.equal(stageUpToast({ name: '농부 삼촌', idx: 1, letter: true }), '🏡 농부 삼촌과 이웃이 됐어요! · ✉️ 소식함에 편지가 왔어요');
  assert.equal(stageUpToast({ name: '농부 삼촌', idx: 0, letter: false }), '👋 농부 삼촌과 아는 사이가 됐어요!');
  assert.equal(stageUpToast({ name: '목수 아저씨', nameEn: 'Carpenter', idx: 2, letter: true, lang: 'en' }), '🤝 You and Carpenter are now Friends! · ✉️ A letter is in your Inbox');
});

test('선물 상한·소급 토스트', () => {
  assert.equal(giftCapToast({ name: '목수 아저씨' }), '🎁 전했어요! 오늘 목수 아저씨 하트는 다 찼어요');
  assert.equal(giftCapToast({ nameEn: 'Carpenter', lang: 'en' }), '🎁 Given! Hearts with Carpenter are full for today');
  assert.equal(retroToast(4), '✉️ 주민들에게서 편지 4통이 와 있어요');
  assert.equal(retroToast(4, 'en'), '✉️ 4 letters from villagers are waiting');
  assert.equal(retroToast(1, 'en'), '✉️ 1 letter from a villager is waiting');
});

test('편지 머리·목록 줄', () => {
  assert.equal(letterTitle({ name: '목수 아저씨' }), '✉️ 목수 아저씨의 편지');
  assert.equal(letterTitle({ nameEn: 'Carpenter', lang: 'en' }), '✉️ A letter from Carpenter');
  assert.equal(letterRowText({ name: '목수 아저씨', idx: 2 }), '목수 아저씨 · 🤝 친구');
  assert.equal(letterRowText({ nameEn: 'Carpenter', idx: 2, lang: 'en' }), 'Carpenter · 🤝 Friend');
});

test('수첩 카드 다음 보상 줄', () => {
  assert.equal(nextRewardText(7, '🪑'), '다음 ❤️10 🪑');
  assert.equal(nextRewardText(0), '선물 하나면 시작');
  assert.equal(nextRewardText(18), '');
  assert.equal(nextRewardText(7, '🪑', 'en'), 'Next ❤️10 🪑');
  assert.equal(nextRewardText(0, '', 'en'), 'One gift to start');
});

test('새 문구에 엠대시·놀다 없음', () => {
  const all = [chipText(0), stageUpToast({ name: '가', idx: 1, letter: true }), giftCapToast({ name: '가' }), retroToast(2), nextRewardText(0)];
  for (const s of all) { assert.ok(!s.includes('—')); assert.ok(!/놀[아았이자다]/.test(s)); }
});
