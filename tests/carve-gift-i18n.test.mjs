import { test } from 'node:test';
import assert from 'node:assert/strict';

globalThis.location = { search: '?lang=en', hostname: 'localhost', href: 'http://localhost/', reload() {} };
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
try { globalThis.navigator ??= { language: 'en-US', userAgent: 'node' }; } catch {}
const { t, setLang } = await import('../js/i18n.js');
setLang('en');
const { GIFTS } = await import('../js/data/npcs.js');
const { WRAP_PAPERS } = await import('../js/spaces/carve-gift.js');

const STRINGS = [
  '결 따라 길게 그으면 여러 칸이 한 번에 깎여요', '콤보 7', '콤보 10! 보상 ×1.2', '콤보가 끊겼어요',
  '💎 숨은 보석을 찾았어요!', '🪙 팔기', '🎁 간직하기', '선물 ❤️+2', '최고 콤보',
  '포장해서 줄까요?', '포장지 🪙15 · ❤️+1 더', '그냥 간직', '🎀 포장하기', '포장할 수 없어요',
  '🎁 목각 물고기를 선물로 간직했어요', '🎁 돌 찻잔을 선물로 간직했어요', '간직한 작품', '새 선물', '주민 선물',
  '🍯꿀이(가) 부족해요', '🌰군밤이(가) 부족해요', '✨정령빛이(가) 부족해요', '🌾밀가루이(가) 부족해요',
];

test('every carve and gift string has an English translation', () => {
  for (const s of STRINGS) assert.doesNotMatch(t(s), /[가-힣]/, s);
});

test('every gift recipe and wrapping paper name is translated', () => {
  for (const g of GIFTS) assert.doesNotMatch(t(g.name), /[가-힣]/, g.name);
  for (const p of WRAP_PAPERS) assert.doesNotMatch(t(p.name), /[가-힣]/, p.name);
});
