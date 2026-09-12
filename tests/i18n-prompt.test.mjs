import { test } from 'node:test';
import assert from 'node:assert/strict';

// 🌐 " · " 로 이어 붙인 조합 프롬프트가 영어에서 끝까지 번역되는지.
//   사전 맨 앞의 글루 패턴 '{0} · {1}' 이 " · " 가 든 문장을 통째로 먼저 잡아 좌·우변을 따로 번역하므로,
//   `'💬 {0} · Space 로 대화'` 처럼 전체 문장을 키로 넣어도 그 키엔 도달하지 않는다.
//   scripts/i18n_check.mjs 는 "키가 있다"만 보고 통과시켜서 실제로 반만 번역되던 걸 못 잡았다 → 여기서 잠근다.
const HAS_KO = /[가-힣]/;

// i18n.js 는 브라우저 전역을 쓴다 — import 전에 최소한만 채운다
globalThis.location = { search: '?lang=en', hostname: 'localhost', href: 'http://localhost/', reload() {} };
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
// navigator 는 Node 22 에서 getter 전용 — 정의돼 있으면 그대로 쓴다(language 가 en 이라 분기 영향 없음)
try { globalThis.navigator ??= { language: 'en-US', languages: ['en-US'] }; } catch { /* 이미 있음 */ }
globalThis.crypto ??= { randomUUID: () => 'test-uuid' };

const { t, setLang } = await import('../js/i18n.js');
setLang('en');

// 실제로 화면에 뜨는 조합 — updateNPCInteract() 가 만드는 두 가지
const PROMPTS = [
  '💬 농부 삼촌 · Space 로 대화',
  '💬 방랑 상인 · Space 로 대화',
  '🌾 농부 삼촌 · 밭일이 먼저예요 — ✋맨손(숫자 1)으로 바꾸면 대화해요',
  '🌾 방랑 상인 · 밭일이 먼저예요 — ✋맨손(숫자 1)으로 바꾸면 대화해요',
];

for (const ko of PROMPTS) {
  test(`영어 모드에서 한국어가 안 남는다: ${ko.slice(0, 24)}…`, () => {
    const en = t(ko);
    assert.ok(!HAS_KO.test(en), `번역이 덜 됐다 → "${en}"`);
  });
}

// 🛋️ 가구 옮기기 프롬프트 — 좌변이 '🛏️ 침대' 처럼 이모지+이름이라 사전에 안 잡혔다.
//   '🛏️ 침대 · Move' 처럼 반만 번역되던 회귀를 잠근다(DECOR 전 품목이 같은 꼴).
const DECOR_PROMPTS = [
  '🛏️ 침대 · 옮기기',
  '🛋️ 소파 · 옮기기',
  '🐟 어항 · 옮기기',
  '📚 책장 · 옮기기',
];
for (const ko of DECOR_PROMPTS) {
  test(`가구 프롬프트가 끝까지 번역된다: ${ko}`, () => {
    const en = t(ko);
    assert.ok(!HAS_KO.test(en), `번역이 덜 됐다 → "${en}"`);
  });
}

