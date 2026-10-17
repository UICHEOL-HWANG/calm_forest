import { test } from 'node:test';
import assert from 'node:assert/strict';
globalThis.location = { search: '?lang=en', hostname: 'localhost', href: 'http://localhost/', reload() {} };
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
try { globalThis.navigator ??= { language: 'en-US', languages: ['en-US'] }; } catch { /* 이미 있음 */ }
globalThis.crypto ??= { randomUUID: () => 'test-uuid' };
const { t, setLang } = await import('../js/i18n.js');
const { STORY, storyFor } = await import('../js/story/chapters.js');
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
    '📖 새 이야기: 5장 「마을의 살림」', '\n\n🏡 다음 이야기는 곧 열려요.',
    '▸ 밭 넓히고 과일나무 심기 — 밭 1/2 · 나무 0/1', '▸ 내 집 짓기 — 공사 1/3']) {
    assert.ok(!HAS_KO.test(t(s)), `번역 없음: ${JSON.stringify(s)} → ${t(s)}`);
  }
});

test('🌉 1·2장(세계수를 지키는 법)·다리·귀환 문구 영어', () => {
  for (const c of storyFor(true).slice(0, 2)) {
    for (const k of ['title', 'goal', 'start', 'done']) assert.ok(!HAS_KO.test(t(c[k])), `${c.id}.${k} 번역 없음: ${c[k]}`);
  }
  for (const c of STORY.slice(6)) for (const k of ['start', 'done']) assert.ok(!HAS_KO.test(t(c[k])), `${c.id}.${k}`);
  for (const s of ['공사 1/3 · 다리 0/1', '🌉 무너진 다리', '🌉 다리 고치기 (🪵10 🪨5)', '🌉 무너진 다리 · 먼저 내 집을 완성해요',
    '🌉 재료 부족: 목재 3/10 · 돌 0/5', '🌉 다리를 고쳤어요! 개울 건너 박물관으로 갈 수 있어요', '의뢰 올빼미',
    '큐레이터 할아버지가 돌아왔어요!', '👷 목수 아저씨가 돌아왔어요!', '마을에 이웃이 한 명 더 늘었어요.',
    '다른 숲에서도 누군가 세계수를 지키고 있대요 · 내일 또 바뀌어요', '개울 건너 박물관으로 가는 길이에요', '무너진 다리',
    '"고맙네. 빈터를 꾸며 이웃을 부르고,\n꾸러미로 세계수 가지를 깨우게."',
    '"저 나무, 우리가 지켜야 해. 서쪽 박물관 할아버지가 방법을 알 거야."\n\n🌉 다리 고치기: 🪵10 🪨5',
    '개울 건너 박물관으로 가는 다리가 무너졌어요.\n먼저 내 집을 완성해요. 그다음에 고칠 수 있어요.',
    '🦉 서쪽 개울의 무너진 다리를 고쳐 보자']) {
    assert.ok(!HAS_KO.test(t(s)), `번역 없음: ${JSON.stringify(s)} → ${t(s)}`);
  }
});
