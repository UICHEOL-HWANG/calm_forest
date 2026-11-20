import { test } from 'node:test';
import assert from 'node:assert/strict';

globalThis.location = { search: '?lang=en', hostname: 'localhost', href: 'http://localhost/', reload() {} };
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
try { globalThis.navigator ??= { language: 'en-US', userAgent: 'node' }; } catch {}
const { t, setLang } = await import('../js/i18n.js');
setLang('en');

const KO = [
  '이웃들이 오간 길마다 뿌리가 이어졌어요', '세계수가 다시 숨을 쉬어요', '칭호 「세계수지기」를 받았어요',
  '빛나는 뿌리 길이 이웃 마을까지 이어져요', '세계수지기', '모든 이야기를 마쳤어요', '🎬 엔딩 다시 보기',
  '모든 이야기를 마치면 세계수에 꽃이 피어요', '🌸 세계수지기',
];

test('엔딩 문구는 모두 영어로 바뀐다', () => {
  for (const s of KO) assert.doesNotMatch(t(s), /[가-힣]/, s);
});

test('문구에 엠대시가 없다', () => {
  for (const s of KO) { assert.doesNotMatch(s, /—/); assert.doesNotMatch(t(s), /—/); }
});
