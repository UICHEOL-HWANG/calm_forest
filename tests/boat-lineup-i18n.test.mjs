import { test } from 'node:test';
import assert from 'node:assert/strict';
const HAS_KO = /[가-힣]/;
globalThis.location = { search: '?lang=en', hostname: 'localhost', href: 'http://localhost/', reload() {} };
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
try { globalThis.navigator ??= { language: 'en-US', languages: ['en-US'] }; } catch { }
globalThis.crypto ??= { randomUUID: () => 'test-uuid' };
const { t, setLang } = await import('../js/i18n.js');
setLang('en');
const RUNTIME = [
  '뱃사공의 창고', '잔잔한 물길', '급류', '잔잔한 물길을 한 번 완주하면 급류가 열려요',
  '타기', '타는 중', '만들기', '나룻배', '연잎배', '뗏목', '비단잉어', '강 재료', '🌊 급류', '오늘 급류 최고 점수', '🏆 최고 812', '🌊 340', '스킬',
  '⭐ 별조각 4/500', '🪙 코인 100/3000', '🪷 연꽃 4/10', '🪵 떠내려온 나무 0/25', '🐚 강 조개 3/20', '🌕 달빛 물고기 0/20',
  '완주 2/3번', '급류 무피해 완주 0/1번', '별 콤보 5/30', '뗏목으로 완주 1/15번', '밤 완주 1/15번', '급류 밤 완주 0/5번',
  '아직 없는 배예요', '조건이 아직 모자라요', '🍃 연잎배 완성!', '🪵 뗏목 완성!', '🐟 비단잉어 완성!',
  '⭐ 별조각으로 새 배 만들기',
  '한 번도 부딪히지 않았어요. 완벽한 뱃길!', '580m를 내려왔어요', '120m 지점에서 멈췄어요. 여기까지 모은 건 그대로 가져가요',
  '🎒 주운 건 그대로 · 🛶 배는 내일 멀쩡해요', '나루터', '🏆 최고 기록', '52.3초', '2회', '×12', '최고 콤보', '시간', '충돌',
  '이번 뱃길에서 얻은 것 · 보유 ⭐ 14', '+13', '×2', '재료 +3', '다음 뱃길에 또 떠내려와요', '이번엔 빈손이에요',
  '오늘 남은 뱃길 1/3', '🛶 한 번 더', '🛶 내일 또 만나요', '그만하기', '무사히 도착!', '배가 가라앉았어요', '뱃길을 멈췄어요',
];
for (const ko of RUNTIME) test(`en: ${ko}`, () => { const en = t(ko); assert.ok(!HAS_KO.test(en), `"${ko}" -> "${en}"`); });
