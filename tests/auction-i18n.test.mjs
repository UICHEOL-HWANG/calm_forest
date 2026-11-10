import { test } from 'node:test';
import assert from 'node:assert/strict';

globalThis.location = { search: '?lang=en', hostname: 'localhost', href: 'http://localhost/', reload() {} };
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
try { globalThis.navigator ??= { language: 'en-US', userAgent: 'node' }; } catch {}
const { t, setLang } = await import('../js/i18n.js');
setLang('en');

const STRINGS = [
  '🔨 경매 참가', '🔨 경매는 저녁에 열려요', '🔨 오늘 경매 끝', '🔨 오늘의 경매',
  '오늘의 경매품이 나왔어요', '🔔 경매 참가하기', '👀 구경만 하기', '시작가 🪙{0}', '시작가예요',
  '🙋 지금 1등', '{0} 1등', '⏱️ 연장!', '{0} 낙찰!', '🧺 보관함에 넣었어요', '{0}에게 낙찰',
  '유찰됐어요', '닫기', '🙋 내 입찰', '달빛 그네', '등불 아치', '별 풍향계',
  '경매에서 산 달빛 그네', '경매에서 산 등불 아치', '경매에서 산 별 풍향계',
  '목수 아저씨', '큐레이터 할아버지', '별 보는 아이',
];

test('every auction string has an English translation', () => {
  for (const s of STRINGS) assert.doesNotMatch(t(s), /[가-힣]/, s);
});

test('countdown keeps its numerals', () => {
  for (const s of ['3…', '2…', '1…']) assert.equal(t(s), s);
});
