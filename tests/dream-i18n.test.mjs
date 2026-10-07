import { test } from 'node:test';
import assert from 'node:assert/strict';

// 🌙 꿈의 숲 문구가 영어 모드에서 끝까지 번역되는지 — **실제 런타임 값 꼴**로 넣어 본다(커버리지 숫자는 회귀 증거가 아니다).
//   " · " 가 든 조합 문장은 글루 패턴에 쪼개질 수 있어 EXACT 키로 넣었다 — 여기서 잠근다.
const HAS_KO = /[가-힣]/;
globalThis.location = { search: '?lang=en', hostname: 'localhost', href: 'http://localhost/', reload() {} };
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
try { globalThis.navigator ??= { language: 'en-US', languages: ['en-US'] }; } catch { /* 이미 있음 */ }
globalThis.crypto ??= { randomUUID: () => 'test-uuid' };
const { t, setLang } = await import('../js/i18n.js');
setLang('en');

const RUNTIME = [
  // 선택 창·도착 카드(index.html)
  '🛏️ 잘 시간이에요', '오늘 밤은 어떻게 할까요?', '푹 자기', '바로 아침이 돼요', '꿈꾸기',
  '꿈의 숲에서 꿈 조각을 모아요', '깨어나면 아침이에요', '✨ 오늘 남은 조각 5개', '✨ 오늘 남은 조각 7개',
  '🌙 꿈의 숲에 왔어요', '✨ 반짝이는 꿈 조각을 모아요', '🪨 떠 있는 돌을 밟고 다른 섬으로 건너가요',
  '🛏️ 구름 침대에 누우면 아침에 깨어나요', '알겠어요', '스르르… 꿈속으로',
  // 프롬프트·상태(js/spaces/dream.js · doors.js)
  '🛏️ 구름 침대 · 깨어나기', '✨ 반짝이는 조각을 찾아보세요 · 6개 남음', '✨ 반짝이는 조각을 찾아보세요 · 1개 남음',
  '🛏️ 구름 침대에서 깨어나요', '🌙 꿈의 숲 · ✨ 0/7', '🌙 꿈의 숲 · ✨ 7/7',
  '☁️ 구름 침대 · 자기', '☁️ 구름 침대 · 옮기기',   // ☁️ 꿈 장식 침대 — doors.js 가 `${ico} ${name} · 자기/옮기기` 로 조합
  // 토스트·배너
  '오늘 꿈 조각은 다 모았어요 · 내일 또 와요', '☀️ 잘 잤어요 · 꿈 조각 ✨3개', '☀️ 잘 잤어요 · 꿈 조각 ✨7개',
  '꿈 조각이 부족해요 ✨', '꿈 조각이 부족해요 (필요 12 ✨)', '꿈 조각이 부족해요 (필요 20 ✨)',
  '밤엔 침대에서 꿈의 숲에 갈 수 있어요', '꿈 조각', '구름 침대에 누우면 아침에 깨어나요', '꿈 장식', '🛋️ 꾸미기에서 꿈 조각으로 바꿔요',
  // 꾸미기 메뉴 가구 이름
  '달 램프', '수정 화분', '별 모빌', '구름 침대',
];

for (const ko of RUNTIME) {
  test(`🌙 en: ${ko}`, () => {
    const en = t(ko);
    assert.ok(!HAS_KO.test(en), `한국어가 남았다: "${ko}" → "${en}"`);
  });
}

test('🌙 숫자 자리는 값을 그대로 옮긴다', () => {
  assert.equal(t('✨ 오늘 남은 조각 5개'), '✨ 5 shards left today');
  assert.equal(t('🌙 꿈의 숲 · ✨ 3/7'), '🌙 Dream Forest · ✨ 3/7');
  assert.equal(t('꿈 조각이 부족해요 (필요 12 ✨)'), 'Not enough dream shards (need 12 ✨)');
});
