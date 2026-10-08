import { test } from 'node:test';
import assert from 'node:assert/strict';
const HAS_KO = /[가-힣]/;
globalThis.location = { search: '?lang=en', hostname: 'localhost', href: 'http://localhost/', reload() {} };
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
try { globalThis.navigator ??= { language: 'en-US', languages: ['en-US'] }; } catch { /* 이미 있음 */ }
globalThis.crypto ??= { randomUUID: () => 'test-uuid' };
const { t, setLang } = await import('../js/i18n.js');
setLang('en');
const RUNTIME = [
  '🪞 거울 마을행 타기', '🌙 막차가 끊겼어요 · 꿈의 숲은 침대에서', '🚏 마을로 돌아가기', '💧 연못에 비춰 보기',
  '오늘 의뢰는 끝났어요 · 🚏 정류장에서 돌아가요', '🪞 거울 마을 · 의뢰 0/3', '🪞 거울 마을 · 의뢰 3/3',
  '💬 거울 농부 삼촌에게 말 걸기', '💬 거울 낚시꾼 할아버지에게 말 걸기', '💬 거울 요리사 판다에게 말 걸기',
  '거울 농부 삼촌: "찾아 줘서 고마워요!"', '거울 낚시꾼 할아버지: "찾아 줘서 고마워요!"', '거울 요리사 판다: "찾아 줘서 고마워요!"',
  '🪞 거울 마을에 왔어요', '💬 거울 주민에게 말을 걸어 보세요', '🔍 잃어버린 물건을 찾아 돌려주면 🪞 조각을 받아요', '🚏 정류장에서 언제든 마을로 돌아가요',
  '마차 정류장', '낮엔 🪞 거울 마을에 갈 수 있어요', '거울 말', '여기 주민들은 좌우를 반대로 말해요', '거울 장식', '🛋️ 꾸미기에서 거울 조각으로 바꿔요',
  '거꾸로 화분', '물빛 거울', '거울 곰 인형', '거울 등불', '거울 조각이 부족해요 🪞', '거울 조각이 부족해요 (필요 14 🪞)',
  '🪞 거울 마을', '정류장', '거울 농부 삼촌', '거울 낚시꾼 할아버지', '거울 요리사 판다',
];
for (const ko of RUNTIME) test(`🪞 en: ${ko}`, () => { const en = t(ko); assert.ok(!HAS_KO.test(en), `"${ko}" → "${en}"`); });
test('🪞 숫자 자리', () => {
  assert.equal(t('🪞 거울 마을 · 의뢰 2/3'), '🪞 Mirror Village · Requests 2/3');
  assert.equal(t('거울 조각이 부족해요 (필요 22 🪞)'), 'Not enough mirror shards (need 22 🪞)');
});
test('🪞 이미 영어로 완성된 단서 문장은 그대로 통과한다', () => {
  const s = 'Mirror Angler: "I lost my ball of yarn under the bush to the left of the 🕰️ upside-down clock tower"';
  assert.equal(t(s), s);
});
