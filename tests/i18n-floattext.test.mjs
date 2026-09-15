import { test } from 'node:test';
import assert from 'node:assert/strict';

// 🎈 spawnFloatText 이 띄우는 조합 문자열이 영어 모드에서 끝까지 번역되는지.
//   game.js 는 `def.ico + ' 설치!'` 처럼 이모지·이름·숫자를 런타임에 이어 붙여 넘기는데,
//   사전은 "한국어 원문이 곧 키" 구조라 조합 문자열은 패턴 키('{0} 설치!')로만 잡힌다.
//   그런데 사전 앞쪽 글루 패턴('{0} {1}!')이 그런 문장을 통째로 먼저 삼키고
//   쪼갠 조각('설치')이 사전에 없어 한국어가 그대로 남았다 → 뒤의 구체적인 키에 도달 못 함.
//   i18n.js 가 "한국어가 안 남는 매칭"을 고르도록 고쳤고, 그 회귀를 여기서 잠근다.
//   ※ 값은 game.js 의 데이터 테이블(OUTDOOR·SEA_SPECIES·RECIPES…)에서 실제로 쓰이는 것들이다.
const HAS_KO = /[가-힣]/;

// i18n.js 는 브라우저 전역을 쓴다 — import 전에 최소한만 채운다(i18n-prompt.test.mjs 와 동일)
globalThis.location = { search: '?lang=en', hostname: 'localhost', href: 'http://localhost/', reload() {} };
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
try { globalThis.navigator ??= { language: 'en-US', languages: ['en-US'] }; } catch { /* 이미 있음 */ }
globalThis.crypto ??= { randomUUID: () => 'test-uuid' };

const { t } = await import('../js/i18n.js');

// ── 🪵 야외 장식 · 밭 시설 설치(placeOutdoor) — 이번 리포트의 원래 증상 ──
//   OUTDOOR 15종의 ico 가 전부 같은 꼴로 들어간다.
const OUTDOOR_ICOS = ['🪵', '🎃', '🪨', '🌷', '🏮', '🧱', '🔥', '✨', '📋', '🧺', '🍇', '💧', '🌱', '🏚️', '🐝'];
for (const ico of OUTDOOR_ICOS) {
  test(`야외 설치 플로트가 끝까지 번역된다: ${ico} 설치!`, () => {
    const en = t(`${ico} 설치!`);
    assert.ok(!HAS_KO.test(en), `번역이 덜 됐다 → "${en}"`);
  });
}

// 🛋️ 실내 가구 배치 — 같은 자리에 뜨는 짝. 표기도 같아야 한다.
test('실내 배치와 야외 설치가 같은 영어 표기를 쓴다', () => {
  assert.equal(t('🎃 설치!'), '🎃 Placed!');
  assert.equal(t('🪑 배치!'), '🪑 Placed!');
});

// ── 🌊 바다 낚시 — 어종 + 무게, 입질·놓침 ──────────────────────────
const SEA = [['🐟', '전갱이'], ['🐠', '방어'], ['🐡', '개복치'], ['⚔️', '참치']];
for (const [ico, name] of SEA) {
  test(`바다 캐치 플로트가 끝까지 번역된다: ${ico} ${name}`, () => {
    const en = t(`${ico} ${name} 12kg!`);
    assert.ok(!HAS_KO.test(en), `번역이 덜 됐다 → "${en}"`);
  });
}

// ── 🍱 찬장에서 꺼내 먹기 · ☕ 카페 손님 감사 인사 · 🍳 요리 등급 ──
const RECIPE_ICOS = ['🥘', '🍄', '🍙', '🍠', '🥗', '🐟', '🍳', '🍱', '🍲'];
const CAFE_THANKS = ['잘 먹을게요, 고마워요 ☕', '역시 이 맛이야! 또 올게요', '오늘 하루가 좋아졌어요 😊', '마을 최고의 카페예요!'];
const COOK_TIERS = [['💫', '최고의 맛'], ['😋', '훌륭한 맛'], ['🙂', '무난한 맛'], ['😅', '아쉬운 맛']];

const COMPOSED = [
  ...RECIPE_ICOS.map(i => `${i} 잘 먹었습니다!`),
  ...RECIPE_ICOS.flatMap(i => CAFE_THANKS.map(th => `${i} ${th}`)),
  ...RECIPE_ICOS.flatMap(i => COOK_TIERS.map(([ti, tn]) => `${i} ${ti} ${tn}!`)),
  '입질!! 🐟',
  '놓쳤다…!',
];
for (const ko of COMPOSED) {
  test(`플로트가 끝까지 번역된다: ${ko}`, () => {
    const en = t(ko);
    assert.ok(!HAS_KO.test(en), `번역이 덜 됐다 → "${en}"`);
  });
}

// ── 글루 패턴이 여전히 제 일을 하는지(폴백 보존) ────────────────────
//   구체적인 키가 없는 조합은 예전처럼 글루가 좌·우변을 재귀 번역해 최선을 다해야 한다.
test('구체적인 키가 없으면 글루 패턴이 그대로 동작한다', () => {
  assert.equal(t('🪓 강철 도끼!'), '🪓 Steel Axe!');
});
