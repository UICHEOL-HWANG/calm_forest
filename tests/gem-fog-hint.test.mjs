import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
globalThis.location = { search: '?lang=en', hostname: 'localhost', href: 'http://localhost/', reload() {} };
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
try { globalThis.navigator ??= { language: 'en-US', languages: ['en-US'] }; } catch { /* 이미 있음 */ }
globalThis.crypto ??= { randomUUID: () => 'test-uuid' };
const { nextFogOffset, gemFogBanner } = await import('../js/gem-fog-hint.js');
const { t, setLang } = await import('../js/i18n.js');

const plan = (...ws) => (d) => ws[d] ?? 'clear';

test('nextFogOffset — 오늘 이후 첫 안개 날까지 며칠', () => {
  assert.equal(nextFogOffset(plan('clear', 'clear', 'fog')), 2);
  assert.equal(nextFogOffset(plan('clear', 'fog')), 1);
  assert.equal(nextFogOffset(plan('fog', 'clear', 'clear', 'fog')), 3, '오늘이 안개여도 다음 안개를 찾는다');
  assert.equal(nextFogOffset(() => 'clear', 10), null);
});

test('gemFogBanner — 안개 날엔 없음, 그 외엔 오늘 날씨와 다음 안개 날짜', () => {
  const dateOf = (d) => `2026-10-${18 + d}`;
  assert.equal(gemFogBanner('fog', 7, dateOf), null);
  assert.deepEqual(gemFogBanner('clear', 7, dateOf), { ico: '💎', title: '보석은 🌫️ 안개 낀 날에만 반짝여요', line: '오늘은 맑음 · 다음 안개 10월 25일' });
  assert.equal(gemFogBanner('rain', 1, dateOf).line, '오늘은 비 · 내일 안개 예보예요');
  assert.equal(gemFogBanner('snow', 2, dateOf).line, '오늘은 눈 · 다음 안개 10월 20일');
  assert.equal(gemFogBanner('clear', null, dateOf).line, '');
});

test('연결 — 동굴에 들어갈 때 배너를 띄우고, 첫 안내·버프 설명이 보석을 약속하지 않는다', () => {
  const mine = readFileSync(new URL('../js/spaces/mine.js', import.meta.url), 'utf8');
  const catalog = readFileSync(new URL('../js/data/catalog.js', import.meta.url), 'utf8');
  assert.match(mine, /gemFogBanner\(/);
  assert.doesNotMatch(mine, /🪨⚫💎 얻기/);
  assert.doesNotMatch(catalog, /광석\(돌·석탄·💎보석\)/);
  const doors = readFileSync(new URL('../js/spaces/doors.js', import.meta.url), 'utf8');
  assert.doesNotMatch(doors, /돌·석탄·💎보석을 캐는 곳/);
});

test('폰 — 💎 배너가 떠 있는 동안 1장 칩(없으면 의뢰 패널)을 가리고 그 자리에 배너를 둔다', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /const swapped = item\.slotQuest \? swapIntoLeftSlot\(el\) : null;/);
  assert.match(html, /chip\?\.classList\.contains\('show'\) && mm\.height\) \{ target = chip; top = mm\.bottom \+ 8; left = mm\.left; \}/);
  assert.match(html, /target\.style\.visibility = 'hidden';/);
  assert.match(html, /if \(swapped\) setTimeout\(swapped, 250\);/);
  assert.match(html, /if \(item\.slotQuest && document\.body\.classList\.contains\('cine-open'\)\) \{ hintBQ\.unshift\(item\); setTimeout\(nextHintBanner, 400\); return; \}/);
});

test('강조 배너 팝 애니메이션이 위치(transform)를 건드리지 않는다 — 폰에서 가운데로 갔다 오른쪽으로 튀던 문제', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const pop = html.match(/@keyframes hbPop \{[^\n]*\}/)[0];
  assert.doesNotMatch(pop, /transform/);
  assert.match(pop, /scale: \.85/);
});

test('영어판 — 새 문구가 한국어 없이 번역된다', () => {
  setLang('en');
  assert.equal(t('보석은 🌫️ 안개 낀 날에만 반짝여요'), 'Gems only sparkle on 🌫️ foggy days');
  assert.equal(t('오늘은 맑음 · 다음 안개 10월 25일'), 'Clear today · Next fog on 10/25');
  assert.equal(t('오늘은 비 · 내일 안개 예보예요'), 'Rainy today · Fog is forecast for tomorrow');
  assert.equal(t('🌫️ 안개 날'), '🌫️ Foggy days');
  assert.equal(t('🪨⚫ 얻기'), 'Get 🪨⚫');
  assert.equal(t('⛏️괭이로 돌·석탄을 캐는 곳 · 💎 보석은 🌫️ 안개 날'), 'Mine Stone and Coal with the ⛏️hoe · 💎 Gems on 🌫️ foggy days');
});
