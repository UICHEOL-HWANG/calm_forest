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

test('every onboarding string has an English translation', async () => {
  const { ONBOARD_COPY, INTRO_CARDS, bannerLine } = await import('../js/auction/onboard.js');
  const all = [ONBOARD_COPY.title, ONBOARD_COPY.follow, ...Object.values(ONBOARD_COPY.line), ...INTRO_CARDS.flatMap(c => [c.title, c.sub, c.btn])];
  for (const s of all) assert.doesNotMatch(t(s), /[가-힣]/, s);
  for (const name of ['달빛 그네', '등불 아치', '별 풍향계']) assert.doesNotMatch(bannerLine(name, t), /[가-힣]/, name);
  assert.equal(bannerLine('별 풍향계', t), 'Bid for the Star Vane at the stage by the ferry');
  assert.equal(t('다음'), 'Next');
  assert.equal(t('알겠어요'), 'Got it');
});

test('countdown keeps its numerals', () => {
  for (const s of ['3…', '2…', '1…']) assert.equal(t(s), s);
});
