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
// 🛏️ 자기 — 밤에만 뜨는 프롬프트도 같은 조합 규칙을 탄다
test('🛏️ 자기 프롬프트가 끝까지 번역된다', () => {
  const en = t('🛏️ 침대 · 자기');
  assert.ok(!HAS_KO.test(en), `번역이 덜 됐다 → "${en}"`);
});

// ── 숫자 자리 {0#} — 소수·천단위·꼬리 낱말 ─────────────────────────
//   {0#} 은 '{0}장'(챕터)이 '책장' 같은 낱말을 먹던 걸 막으려고 도입했는데,
//   (\d+) 로만 두면 '42.3초'(나룻배 기록) 같은 소수를 거부해 반대 방향으로 깨진다.
const NUMERIC = [
  ['42.3초', '42.3s'],      // 🛶 나룻배 결과 — Math.round(ms/100)/10 이라 소수 한 자리
  ['60초', '60s'],
  ['0.5초', '0.5s'],
  ['1,200점', '1,200 pts'],
  ['3회', '3x'],
  ['12건', '12 done'],
  ['5위', '#5'],
  ['3구간', 'Leg 3'],
  ['3장', 'Ch. 3'],
];
for (const [ko, en] of NUMERIC) {
  test(`숫자 자리가 번역된다: ${ko}`, () => assert.equal(t(ko), en));
}

// 반대로 숫자가 아닌 평범한 낱말은 절대 먹히면 안 된다(예전엔 '기회'→'기x' 가 됐다)
for (const word of ['기회', '조건', '상위', '정점', '최초', '사회', '기회가 왔어요']) {
  test(`평범한 낱말을 숫자 패턴이 먹지 않는다: ${word}`, () => assert.equal(t(word), word));
}

// ── 이모지 접두사 폴백 ────────────────────────────────────────────
//   두 가지 모양을 모두 살려야 한다:
//   ① '🎨 ✅ 완료!' — 두 번째 아이콘부터가 통째로 사전 키(공백까지 떼야 도달)
//   ② '🥇 ⚡60초'  — 아이콘과 값이 공백 없이 붙음(글자·숫자 직전까지 떼야 도달)
test('이모지가 둘이어도 뒤쪽 키에 도달한다', () => {
  assert.equal(t('🎨 ✅ 완료! 주민에게 가세요'), '🎨 ✅ Done! Return to the villager');
});
test('아이콘과 숫자가 붙어 있어도 번역된다', () => {
  assert.equal(t('🥇 ⚡60초'), '🥇 ⚡60s');
  assert.equal(t('🥇 ⚡0.5초'), '🥇 ⚡0.5s');
});

// '자기' 는 흔한 낱말(자기 자신·자기장) — 단독 키로 두면 옵저버가 오역한다
test("'자기' 단독은 번역하지 않는다", () => assert.equal(t('자기'), '자기'));
