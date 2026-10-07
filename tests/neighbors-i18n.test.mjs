import { test } from 'node:test';
import assert from 'node:assert/strict';
globalThis.location = { search: '?lang=en', hostname: 'localhost', href: 'http://localhost/', reload() {} };
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
try { globalThis.navigator ??= { language: 'en-US', languages: ['en-US'] }; } catch { /* 이미 있음 */ }
globalThis.crypto ??= { randomUUID: () => 'test-uuid' };
const { t, setLang } = await import('../js/i18n.js');
const { houseLabel, pickerMeta, rewardLine, noticeView, reactOutcome, FAIL_TOAST } = await import('../js/neighbors/rules.js');
setLang('en');
const HAS_KO = /[가-힣]/;
const en = (s) => { const out = t(s); assert.ok(!HAS_KO.test(out), `번역 없음: ${JSON.stringify(s)} → ${out}`); return out; };

test('검수 완료 문구(스펙 §8)', () => {
  for (const s of ['오늘의 이웃', '같은 잎사귀를 받고 온 이웃들이에요 · 내일 또 바뀌어요', '놀러 가기', '또 보기', '❤️ 다녀옴',
    '🚪 내 마을로', '"와 줘서 고마워요! 어땠어요?"', '❤️ 마음을 남겼어요 · 🪙+5', '❤️ 마음을 남겼어요',
    '어제부터 지금까지', '고마워요 🌱']) en(s);
  assert.equal(en('🏡 Sparkly Bear #4821 의 마을'), "🏡 Sparkly Bear #4821's village");
});

test('미검수 문구 + 이 계획이 만든 문구', () => {
  for (const s of ['🏡 이웃 마을 가는 길', '이웃 마을 가는 길', '"또 와 줘서 기뻐요!"', '🔐 로그인하면 마음을 남길 수 있어요',
    '아직 놀러 갈 이웃이 없어요 · 내일 다시 와 보세요', '이웃에게 내 마을 보여 주기',
    '🏡 내 마을이 이웃에게 보여요 · ⚙️ 설정에서 끌 수 있어요', '외 2명', '🏡 이웃의 숲',
    '이름 없는 여행자', '손 흔들기', '하트', '꽃', '별', '닫기']) en(s);
});

test('조합 문구 — 숫자·집 이름이 들어간 자리', () => {
  for (const st of [1, 2, 3, 4, 5, 6, 7]) en(houseLabel(st));
  en(pickerMeta({ house_stage: 6, decor_n: 23 }));
  en(pickerMeta({ house_stage: 3, decor_n: 0 }));
  assert.equal(en(rewardLine(2)), '🪙 Visit rewards today 2/3');
  assert.equal(en(noticeView({ total: 3, list: [] }, () => '🐻').title), '3 neighbors stopped by');
  assert.equal(en(noticeView({ total: 1, list: [] }, () => '🐻').title), 'A neighbor stopped by');
  en(noticeView({ total: 12, list: [] }, () => '🐻').title);
  en(`외 ${noticeView({ total: 12, list: [] }, () => '🐻').more}명`);
  en(reactOutcome({ ok: false, reason: 'login' }).toast);
  en(FAIL_TOAST);
  en('방문 0/1');
});
