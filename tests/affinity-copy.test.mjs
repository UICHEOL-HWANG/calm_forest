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

test('보여 주기 문구: 소개 카드·길 안내·상시 줄', async () => {
  const C = await import('../js/affinity/copy.js');
  assert.equal(C.introTitle({ name: '목수 아저씨' }), '목수 아저씨와 친해져 보세요');
  assert.equal(C.introTitle({ name: '농부 삼촌' }), '농부 삼촌과 친해져 보세요');
  assert.equal(C.introTitle({ nameEn: 'Carpenter', lang: 'en' }), 'Get to know Carpenter');
  assert.equal(C.introBody({ item: '🪑 목수의 흔들의자' }), '친해질수록 편지가 오고, 💛 단짝이 되면 🪑 목수의 흔들의자를 보내 줘요.');
  assert.equal(C.introBody({ item: '🥕 채소 수레' }), '친해질수록 편지가 오고, 💛 단짝이 되면 🥕 채소 수레를 보내 줘요.');
  assert.equal(C.introBody({ item: '🏺 유리 진열장' }), '친해질수록 편지가 오고, 💛 단짝이 되면 🏺 유리 진열장을 보내 줘요.');
  assert.equal(C.guideGiveText({ name: '목수 아저씨' }), '목수 아저씨에게 꽃다발 건네기');
  assert.equal(C.guideGiveText({ nameEn: 'Carpenter', lang: 'en' }), 'Give the bouquet to Carpenter');
  assert.deepEqual(C.trackerLines({ name: '목수 아저씨', value: 7, next: 10, nextIdx: 3, reward: '🪑 목수의 흔들의자', giftLeft: 2 }),
    { head: '💛 목수 아저씨 ❤️7/10', reward: '🪑 목수의 흔들의자까지 ❤️3', gift: '오늘 선물 🎁 2번 더' });
  assert.deepEqual(C.trackerLines({ name: '낚시꾼 할아버지', value: 4, next: 6, nextIdx: 2, reward: '📜 도면', giftLeft: 0, compact: true }),
    { head: '🤝 낚시꾼 할아버지', reward: '📜 도면까지 ❤️2', gift: '선물은 내일 다시' });
  assert.deepEqual(C.trackerLines({ nameEn: 'Carpenter', value: 7, next: 10, nextIdx: 3, reward: '🪑 Rocking Chair', giftLeft: 2, lang: 'en' }),
    { head: '💛 Carpenter ❤️7/10', reward: '🪑 Rocking Chair in ❤️3', gift: 'Gifts today: 🎁 2 more' });
  assert.equal(C.trackerStart(), '🎁 주민과 친해지면 선물이 와요');
  assert.equal(C.trackerStart('en'), '🎁 Befriend villagers for gifts');
});
