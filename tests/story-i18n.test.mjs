import { test } from 'node:test';
import assert from 'node:assert/strict';
globalThis.location = { search: '?lang=en', hostname: 'localhost', href: 'http://localhost/', reload() {} };
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
try { globalThis.navigator ??= { language: 'en-US', languages: ['en-US'] }; } catch { /* 이미 있음 */ }
globalThis.crypto ??= { randomUUID: () => 'test-uuid' };
const { t, setLang } = await import('../js/i18n.js');
const { STORY } = await import('../js/story/chapters.js');
setLang('en');
const HAS_KO = /[가-힣]/;

test('새 장 제목·목표·문장 전부 영어가 있다', () => {
  for (const c of STORY.slice(4)) {
    for (const k of ['title', 'goal', 'start', 'done']) {
      if (!c[k]) continue;
      assert.ok(!HAS_KO.test(t(c[k])), `${c.id}.${k} 번역 없음: ${c[k]}`);
    }
  }
});

test('진행 표시·토스트·잠금·부제', () => {
  for (const s of ['밭 1/2 · 나무 0/1', '특별 진열 0/1', '별자리 0/1', '곧 열려요', '숲에서 이어지는 이야기',
    '📖 새 이야기가 이어져요 — 5장 「마을의 살림」', '\n\n🏡 다음 이야기는 곧 열려요.',
    '▸ 밭 넓히고 과일나무 심기 — 밭 1/2 · 나무 0/1', '▸ 내 집 짓기 — 공사 1/3']) {
    assert.ok(!HAS_KO.test(t(s)), `번역 없음: ${JSON.stringify(s)} → ${t(s)}`);
  }
});
