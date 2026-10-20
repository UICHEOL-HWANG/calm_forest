import { test } from 'node:test';
import assert from 'node:assert/strict';

const HAS_KO = /[가-힣]/;
globalThis.location = { search: '?lang=en', hostname: 'localhost', href: 'http://localhost/', reload() {} };
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
try { globalThis.navigator ??= { language: 'en-US', languages: ['en-US'] }; } catch { }
globalThis.crypto ??= { randomUUID: () => 'test-uuid' };
const { t, setLang } = await import('../js/i18n.js');
setLang('en');

const RUNTIME = [
  '달빛 유령 정원', '🎃 11/2까지', '🎃 달빛 유령 정원', '🎃 달빛 유령 정원으로 가기', '🚪 마을로 돌아가기',
  '👻 유령 찾기', '🍬 사탕 좌판 보기', '찾았다! 🍬 +2', '3일 연속! 🍬 +5',
  '오늘 유령을 다 찾았어요. 내일 다른 곳에 또 숨어요', '사탕이 3개 더 필요해요', '오늘은 2번까지 바꿀 수 있어요',
  '꼬마 유령 인형을 받았어요! 집 꾸미기에서 놓아 보세요', '남은 사탕 7개를 🪙 28로 바꿨어요',
  '할로윈 한정', '마을에 유령 정원이 열렸어요', '🎃 달빛 유령 정원 · 👻 1/3 · 🍬 6',
  '👻 꼬마 유령 숨바꼭질', '정원 곳곳에 꼬마 유령 3마리가 숨었어요. 찾으면 🍬 사탕을 줘요. 숨는 자리는 매일 바뀌어요.',
  '🪦 묘비 뒤, 울타리 옆, 나무 밑을 살펴봐요', '🍬 가운데 좌판에서 사탕을 장식으로 바꿔요', '🎃 11/2까지 열려요',
  '🎁 첫 방문 선물 · 🍬 4', '알겠어요', '🍬 사탕 좌판', '모은 사탕을 할로윈 장식으로 바꿔 가요. 11/2까지 열려요.',
  '내 사탕 🍬 10', '🎃 한정 장식', '🧺 생활 꾸러미', '1개 있음', '오늘 0/2', '꼬마 유령 인형', '사탕 바구니', '웃는 호박 등',
  '코인 15', '비료 2개', '미끼 5회분', '장식을 골라 주세요', '👻 꼬마 유령 인형 · 🍬 8개로 바꾸기', '닫기', '사탕', '🎃 할로윈',
];

for (const ko of RUNTIME) {
  test(`🎃 en: ${ko}`, () => {
    const en = t(ko);
    assert.ok(!HAS_KO.test(en), `한국어가 남았다: "${ko}" → "${en}"`);
  });
}
