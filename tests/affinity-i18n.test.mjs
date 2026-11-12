import { test } from 'node:test';
import assert from 'node:assert/strict';

globalThis.location = { search: '?lang=en', hostname: 'localhost', href: 'http://localhost/', reload() {} };
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
try { globalThis.navigator ??= { language: 'en-US', userAgent: 'node' }; } catch {}
const { t, setLang } = await import('../js/i18n.js');
setLang('en');
const { LETTERS, BEST_ITEMS } = await import('../js/data/npc-letters.js');
const { NPCS } = await import('../js/data/npcs.js');
const { AFFINITY_NPCS } = await import('../js/affinity/stages.js');

const UI = [
  '📒 주민 수첩', '주민 수첩', '📮 소식', '✉️ 편지', '아직 온 편지가 없어요 🌱', '🎒 가방에 넣었어요',
  '오늘 선물 하트', '편지', '도면', '🖼️ 액자', '아이템', '받기', '받았어요', '뒤로',
  '📜 금빛 도구 도면 의뢰가 열려요', '🦉 오늘 의뢰 다 끝! 올빼미 ❤️+1',
  '🎁 선물 주기 (하루 ❤️2)', '🔁 반복 의뢰 ❤️+1', '🎁 선물 만들러 가기', '나중에', '🎁 작업대에서 꽃다발 만들기',
  '🥕 꽃다발 재료(작물 2개)를 챙겨 드렸어요', '🧺 보관함에 넣었어요',
  '씨앗', '작물', '목재', '코인', '미끼', '물고기', '밀가루', '꿀', '채집물', '반딧불이', '달걀', '돌', '석탄', '보석',
];

test('호감도 화면 문구는 영어로 바뀐다', () => {
  for (const s of UI) assert.doesNotMatch(t(s), /[가-힣]/, s);
});

test('편지 본문과 갈래는 모두 영어가 있다', () => {
  for (const npc of AFFINITY_NPCS) {
    for (const l of Object.values(LETTERS[npc])) {
      assert.ok(l.bodyEn, l.body);
      assert.doesNotMatch(l.bodyEn, /[가-힣]/, l.body);
      if (l.alt) { assert.ok(l.altEn, l.alt); assert.doesNotMatch(l.altEn, /[가-힣]/, l.alt); }
    }
  }
});

test('단짝 아이템 이름과 주민 이름은 영어가 있다', () => {
  for (const id of AFFINITY_NPCS) {
    assert.doesNotMatch(t(BEST_ITEMS[id].name), /[가-힣]/, BEST_ITEMS[id].name);
    assert.doesNotMatch(t(NPCS.find(n => n.id === id).name), /[가-힣]/, id);
  }
});
