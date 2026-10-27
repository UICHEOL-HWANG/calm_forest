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
  '타기', '타는 중', '만들기', '나룻배', '연잎배', '뗏목', '비단잉어', '강 재료', '🌊 급류', '오늘 급류 최고 점수',
  '⭐ 별조각 4/500', '🪙 코인 100/3000', '🪷 연꽃 4/10', '🪵 떠내려온 나무 0/25', '🐚 강 조개 3/20', '🌕 달빛 물고기 0/20',
  '완주 2/3번', '급류 무피해 완주 0/1번', '별 콤보 5/30', '뗏목으로 완주 1/15번', '밤 완주 1/15번', '급류 밤 완주 0/5번',
  '아직 없는 배예요', '조건이 아직 모자라요', '🍃 연잎배 완성!', '🪵 뗏목 완성!', '🐟 비단잉어 완성!',
  '⭐ 별조각으로 새 배 만들기',
];
for (const ko of RUNTIME) test(`en: ${ko}`, () => { const en = t(ko); assert.ok(!HAS_KO.test(en), `"${ko}" -> "${en}"`); });
