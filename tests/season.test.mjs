import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SEASONS, SEASON_DAYS, seasonInfo, seasonOf, weatherFromRoll } from '../js/season.js';
import { DEX_GATES, gateOpen, weatherOpen, rollKind } from '../js/dex-gates.js';
import { pickMissingDex } from '../js/museum.js';
import { readFileSync } from 'node:fs';

// js/data/catalog.js·dex.js 는 places.js 를 거쳐 three 를 import 한다 — 표 리터럴만 원문에서 떼어 읽는다
const src = f => readFileSync(new URL('../js/data/' + f, import.meta.url), 'utf8');
const FISH_KINDS = new Function('return ' + src('catalog.js').match(/export const FISH_KINDS = (\[[\s\S]*?\n\]);/)[1])();
const DEX = { fish: new Function('return ' + src('dex.js').match(/^  fish: (\[[\s\S]*?\n  \]),/m)[1])() };

const addDays = (date, n) => new Date(Date.parse(date + 'T00:00:00Z') + n * 86400000).toISOString().slice(0, 10);

test('🍂 가을 1일 = 2026-10-09 = 수확제 광장 시즌 시작', () => {
  assert.deepEqual({ ...seasonInfo('2026-10-09'), season: seasonOf('2026-10-09') },
    { season: 'autumn', day: 1, left: 14, cycle: 0 });
  assert.equal(seasonOf('2026-10-08'), 'summer');
  assert.equal(seasonOf('2026-10-22'), 'autumn');   // 광장 시즌 마지막 날
  assert.equal(seasonOf('2026-10-23'), 'winter');
});

test('봄→여름→가을→겨울→봄 순서로 14일씩 돈다 — 기준일 이전도 음수 없이', () => {
  const order = [];
  for (let d = -112; d < 112; d += SEASON_DAYS) order.push(seasonOf(addDays('2026-09-11', d)));
  assert.deepEqual(order, ['spring', 'summer', 'autumn', 'winter', 'spring', 'summer', 'autumn', 'winter',
                           'spring', 'summer', 'autumn', 'winter', 'spring', 'summer', 'autumn', 'winter']);
  for (let d = -200; d < 200; d++) {
    const i = seasonInfo(addDays('2026-09-11', d));
    assert.ok(i.day >= 1 && i.day <= SEASON_DAYS && i.day + i.left === SEASON_DAYS + 1, `${d}: ${JSON.stringify(i)}`);
  }
});

test('날씨 경계는 오름차순이고, 한 바퀴 평균이 예전 고정 확률에서 크게 벗어나지 않는다', () => {
  const sum = { rain: 0, snow: 0, fog: 0, clear: 0 };
  for (const s of SEASONS) {
    const w = s.weather;
    assert.ok(w.rain <= w.snow && w.snow <= w.fog && w.fog <= 100, s.id);
    for (let r = 0; r < 100; r++) sum[weatherFromRoll(r, s.id)]++;
  }
  const avg = k => sum[k] / SEASONS.length;
  // 예전: 비 20 · 눈 12 · 안개 13 · 맑음 55
  assert.ok(Math.abs(avg('rain') - 20) <= 3, `rain ${avg('rain')}`);
  assert.ok(Math.abs(avg('snow') - 12) <= 3, `snow ${avg('snow')}`);
  assert.ok(Math.abs(avg('fog') - 13) <= 3, `fog ${avg('fog')}`);
  assert.ok(Math.abs(avg('clear') - 55) <= 5, `clear ${avg('clear')}`);
  // 눈은 겨울이 가장 많고, 봄·여름엔 없다
  assert.equal(weatherFromRoll(25, 'summer'), 'rain');
  for (let r = 0; r < 100; r++) assert.notEqual(weatherFromRoll(r, 'spring'), 'snow');
});

test('계절마다 한정 어종이 정확히 하나 — 표·도감·게이트가 서로 맞는다', () => {
  for (const s of SEASONS) {
    const fish = FISH_KINDS.filter(k => k.season === s.id);
    assert.equal(fish.length, 1, `${s.id} 한정 어종`);
    const id = fish[0].rarity;
    assert.ok(DEX.fish.some(e => e.id === id), `${id} 가 도감에 없다`);
    assert.deepEqual(DEX_GATES.fish[id].season, [s.id]);
    assert.equal(fish[0].p, 0, `${id} 원래 가중치는 0 이어야 계절 밖에서 안 나온다`);
  }
});

test('계절 한정 어종은 그 계절에만 낚이고, 다른 계절 분포는 그대로', () => {
  const N = 4000;
  for (const s of SEASONS) {
    const seen = {};
    for (let i = 0; i < N; i++) {
      const k = rollKind(FISH_KINDS, 'fish', { weather: 'clear', season: s.id, night: false }, () => i / N);
      seen[k.rarity] = (seen[k.rarity] || 0) + 1;
    }
    const mine = FISH_KINDS.find(k => k.season === s.id).rarity;
    assert.ok(Math.abs(seen[mine] / N - 0.12) < 0.01, `${s.id}: ${mine} ${(seen[mine] / N).toFixed(3)}`);
    for (const other of FISH_KINDS.filter(k => k.season && k.season !== s.id)) {
      assert.equal(seen[other.rarity], undefined, `${s.id} 에 ${other.rarity} 가 나왔다`);
    }
    assert.equal(seen.rare, undefined, '맑은 날 무지개 물고기 게이트는 그대로 닫혀 있다');
  }
});

test('계절 게이트: season 을 안 넘기면 닫힘(의뢰에 철 지난 종이 새지 않게)', () => {
  const g = DEX_GATES.fish.maple_carp;
  assert.equal(weatherOpen(g, 'clear', 'autumn'), true);
  assert.equal(weatherOpen(g, 'clear', 'winter'), false);
  assert.equal(weatherOpen(g, 'clear'), false);
  assert.equal(gateOpen(g, { weather: 'rain', season: 'autumn', night: true }), true);
  assert.equal(weatherOpen(DEX_GATES.fish.rare, 'rain'), true, '계절 없는 게이트는 예전 그대로');
});

test('큐레이터 의뢰: 철 지난 한정 어종은 고르지 않는다', () => {
  const D = { fish: DEX.fish };
  const owned = { fish: Object.fromEntries(DEX.fish.filter(e => !['maple_carp', 'ice_smelt'].includes(e.id)).map(e => [e.id, 1])) };
  for (let seed = 0; seed < 50; seed++) {
    const pick = pickMissingDex(owned, D, seed, { weather: 'clear', season: 'autumn' });
    assert.equal(pick?.id, 'maple_carp', '가을엔 단풍 잉어만 남은 후보');
  }
});
