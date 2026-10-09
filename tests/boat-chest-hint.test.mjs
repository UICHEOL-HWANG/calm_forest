import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
globalThis.location = { search: '?lang=en', hostname: 'localhost', href: 'http://localhost/', reload() {} };
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
try { globalThis.navigator ??= { language: 'en-US', languages: ['en-US'] }; } catch { /* 이미 있음 */ }
globalThis.crypto ??= { randomUUID: () => 'test-uuid' };
const { chestHintToday } = await import('../js/boat-chest.js');
const { t, setLang } = await import('../js/i18n.js');

// 2026-10-09 페르소나 p34 10/10 "마을 어디서도 보물상자가 안 보인다" — 상자는 🛶 나룻배 코스에만 떠내려오는데
//   나루터 입구·탑승 안내 어디에도 그 말이 없었다(실유저 9/29 이후 나룻배 4명 5판). 오늘 아직 건질 수 있을 때만 알린다.
test('chestHintToday — 오늘 안 건졌고 탈 횟수가 남았을 때만', () => {
  const today = '2026-10-09';
  assert.equal(chestHintToday({ chestDate: null }, today, 3), true);
  assert.equal(chestHintToday({ chestDate: '2026-10-08' }, today, 1), true);
  assert.equal(chestHintToday({ chestDate: today }, today, 3), false, '오늘 이미 건짐');
  assert.equal(chestHintToday({ chestDate: null }, today, 0), false, '오늘 다 탔으면 못 건진다');
  assert.equal(chestHintToday(undefined, today, 3), true, '옛 세이브(boat 없음)');
});

test('연결 — 마을 나루터 입구·나룻배 탑승 안내가 상자를 알린다', () => {
  const doors = readFileSync(new URL('../js/spaces/doors.js', import.meta.url), 'utf8');
  const river = readFileSync(new URL('../js/spaces/river.js', import.meta.url), 'utf8');
  assert.match(doors, /chestHintNow\(\) \? '🛶 나루터 · 🧰 오늘의 보물상자가 떠내려와요' : '🛶 나루터 \(나룻배 타러 가기\)'/);
  assert.match(river, /export function chestHintNow\(\)/);
  assert.match(river, /chestHintNow\(\) \? ' · 🧰 보물상자' : ''/);
});

test('영어판 — 새 안내 문구가 한국어 없이 번역된다', () => {
  setLang('en');
  assert.equal(t('🛶 나루터 · 🧰 오늘의 보물상자가 떠내려와요'), "🛶 Dock · 🧰 Today's Treasure Chest is floating downstream");
  assert.equal(t('🛶 나룻배 타기 (오늘 2/3회 남음) · 🧰 보물상자'), '🛶 Ride the Rowboat (2/3 left today) · 🧰 Treasure Chest');
  assert.equal(t('🛶 나룻배 타기 (오늘 3/3회 남음)'), '🛶 Ride the Rowboat (3/3 left today)', '상자 없는 날 문구는 그대로');
});
