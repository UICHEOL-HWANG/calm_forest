import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dailyCardView, dailyCardTexts } from '../js/daily-card.js';

const COINS = [5, 8, 12, 16, 20, 25, 30];
const AUTUMN = { id: 'autumn', ico: '🍂', name: '가을' };
const CARP = { ico: '🐟', name: '단풍 잉어' };
const base = {
  streak: 3, reward: { coins: 12 }, coinsTable: COINS,
  weather: 'rain', forecast: 'fog', severe: null, forecastInDex: false,
  season: AUTUMN, seasonLeft: 10, fish: CARP, fishOwned: false, seasonNew: false,
};

test('연속 일수와 7칸 점: 지난 날 on, 오늘 now, 남은 날 off', () => {
  const v = dailyCardView(base);
  assert.equal(v.title, '3일 연속 🔥');
  assert.deepEqual(v.dots, ['on', 'on', 'now', 'off', 'off', 'off', 'off']);
});

test('8일차는 새 주의 첫 칸', () => {
  assert.deepEqual(dailyCardView({ ...base, streak: 8, reward: { coins: 30 } }).dots, ['now', 'off', 'off', 'off', 'off', 'off', 'off']);
});

test('보상 칸: 오늘 코인과 내일 코인을 숫자로', () => {
  const v = dailyCardView(base);
  assert.equal(v.reward, '+12🪙');
  assert.equal(v.next, '내일은 +16');
});

test('7일차는 💎 를 같이 보여 주고, 6일차는 내일 💎 를 예고', () => {
  assert.equal(dailyCardView({ ...base, streak: 7, reward: { coins: 30, gem: 1 } }).reward, '+30🪙 +1💎');
  assert.equal(dailyCardView({ ...base, streak: 6, reward: { coins: 25 } }).next, '내일은 +30 💎');
  assert.equal(dailyCardView({ ...base, streak: 9, reward: { coins: 30 } }).next, '내일은 +30');
});

test('오늘 날씨 칸은 맑은 날에도 뜬다', () => {
  assert.deepEqual(dailyCardView(base).today, { label: '🌧️ 비', desc: '밭이 저절로 자라요' });
  assert.deepEqual(dailyCardView({ ...base, weather: 'clear' }).today, { label: '☀️ 맑음', desc: '농사하기 좋은 날' });
});

test('내일 칸: 도감에 없는 날씨면 NEW, 있으면 없음', () => {
  assert.equal(dailyCardView(base).tomorrow.isNew, true);
  assert.equal(dailyCardView({ ...base, forecastInDex: true }).tomorrow.isNew, false);
  assert.equal(dailyCardView(base).tomorrow.label, '🌫️ 안개');
});

test('내일 서리·태풍 예보는 경고 칸으로', () => {
  const t = dailyCardView({ ...base, severe: 'frost' }).tomorrow;
  assert.equal(t.warn, true);
  assert.equal(t.label, '❄️ 서리 예보');
  assert.equal(t.desc, '오늘 수확하거나 덮개를 준비해요');
  assert.equal(t.isNew, false);
});

test('계절 칸: 새 계절 첫 접속 · 끝나기 3일 전(못 낚음)만, 나머지는 없음', () => {
  assert.equal(dailyCardView({ ...base, seasonNew: true }).season, '🍂 가을이 왔어요 · 10일 동안 🐟 단풍 잉어가 낚여요');
  assert.equal(dailyCardView({ ...base, seasonLeft: 3 }).season, '⏳ 가을 3일 남음 · 🐟 단풍 잉어는 지금만 낚여요');
  assert.equal(dailyCardView({ ...base, seasonLeft: 3, fishOwned: true }).season, null);
  assert.equal(dailyCardView(base).season, null);
  assert.equal(dailyCardView({ ...base, fish: null, seasonNew: true }).season, null);
});

test('문구에 엠대시를 쓰지 않는다', () => {
  for (const s of dailyCardTexts({ ...base, seasonNew: true, severe: 'storm' })) assert.ok(!s.includes('—'), s);
});

globalThis.location = { search: '?lang=en', hostname: 'localhost', href: 'http://localhost/', reload() {} };
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
try { globalThis.navigator ??= { language: 'en-US', languages: ['en-US'] }; } catch {}
globalThis.crypto ??= { randomUUID: () => 'test-uuid' };
const { t, setLang } = await import('../js/i18n.js');
setLang('en');

const SEASONS = [['spring', '🌸', '봄', '벚꽃 송어'], ['summer', '☀️', '여름', '동글 복어'], ['autumn', '🍂', '가을', '단풍 잉어'], ['winter', '❄️', '겨울', '얼음 빙어']];
const CASES = [];
for (const w of ['clear', 'rain', 'snow', 'fog']) for (const f of ['clear', 'rain', 'snow', 'fog']) CASES.push({ ...base, weather: w, forecast: f });
for (const s of ['frost', 'storm']) CASES.push({ ...base, severe: s });
for (const [id, ico, name, fish] of SEASONS) {
  const p = { ...base, season: { id, ico, name }, fish: { ico: '🐟', name: fish } };
  CASES.push({ ...p, seasonNew: true }, { ...p, seasonLeft: 2 });
}
for (const n of [1, 6, 7, 12]) CASES.push({ ...base, streak: n, reward: n % 7 ? { coins: 20 } : { coins: 30, gem: 1 } });

test('영어 모드에서 카드 문구에 한국어가 안 남는다', () => {
  const left = new Set();
  for (const c of CASES) for (const s of dailyCardTexts(c)) if (/[가-힣]/.test(t(s))) left.add(`${s} → ${t(s)}`);
  assert.deepEqual([...left], []);
});

test('index.html: 전용 모달·Space 확인·소식함 이어 띄우기', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /<div id="daily-modal">/);
  assert.match(html, /'daily-modal': 'daily-ok'/);
  assert.match(html, /showDailyCard\(/);
});
