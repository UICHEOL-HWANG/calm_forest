import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SEASONS, SEASON_DAYS, seasonById, seasonInfo, seasonLimited, seasonNotice, seasonOf, seasonStatusLine, weatherFromRoll } from '../js/season.js';
import { DEX_GATES, gateOpen, weatherOpen, rollKind } from '../js/dex-gates.js';
import { pickMissingDex } from '../js/museum.js';
import { readFileSync } from 'node:fs';

// js/data/catalog.js·dex.js 는 places.js 를 거쳐 three 를 import 한다 — 표 리터럴만 원문에서 떼어 읽는다
const src = f => readFileSync(new URL('../js/data/' + f, import.meta.url), 'utf8');
const FISH_KINDS = new Function('return ' + src('catalog.js').match(/export const FISH_KINDS = (\[[\s\S]*?\n\]);/)[1])();
const DEX = { fish: new Function('return ' + src('dex.js').match(/^  fish: (\[[\s\S]*?\n  \]),/m)[1])() };
const dexCat = cat => new Function('return ' + src('dex.js').match(new RegExp('^  ' + cat + ': (\\[[\\s\\S]*?\\n  \\]),', 'm'))[1])();
DEX.bug = dexCat('bug');
DEX.forage = dexCat('forage');
const placesTable = name => new Function('return ' + src('places.js').match(new RegExp('export const ' + name + ' = (\\[[\\s\\S]*?\\n\\]);'))[1])();
const BUG_KINDS = placesTable('BUG_KINDS');
const FORAGE_KINDS = placesTable('FORAGE_KINDS');
const SEASON_IDS = SEASONS.map(s => s.id);

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

const LIM = [
  { cat: 'fish', id: 'sakura_trout', name: '벚꽃 송어', ico: '🌸', owned: true },
  { cat: 'bug', id: 'petal', name: '꽃잎반디', ico: '🌸', owned: false },
  { cat: 'forage', id: 'mugwort', name: '어린 쑥', ico: '🌱', owned: false },
];
const SPRING = { season: seasonById('spring'), left: 3 };
const TABLES = { fish: FISH_KINDS, bug: BUG_KINDS, forage: FORAGE_KINDS, dex: DEX };

test('seasonLimited: one fish, one bug, one forage for every season', () => {
  for (const id of SEASON_IDS) {
    const list = seasonLimited(id, TABLES);
    assert.deepEqual(list.map(x => x.cat), ['fish', 'bug', 'forage']);
    for (const x of list) assert.ok(x.id && x.name && x.ico, JSON.stringify(x));
  }
  assert.deepEqual(seasonLimited('spring', TABLES).map(x => x.id), ['sakura_trout', 'petal', 'mugwort']);
  assert.deepEqual(seasonLimited('nope', TABLES), []);
});

test('seasonNotice: new season, last three days with something missing, otherwise empty', () => {
  assert.equal(seasonNotice({ season: seasonById('spring'), left: 14 }, LIM, true),
    '🌸 봄이 왔어요! 봄에만 나오는 물고기·반디·채집물 3종을 찾아보세요.');
  assert.equal(seasonNotice(SPRING, LIM, false),
    '⏳ 봄이 3일 남았어요. 아직 못 만난 봄 한정: 🌸 꽃잎반디, 🌱 어린 쑥');
  assert.equal(seasonNotice(SPRING, LIM.map(x => ({ ...x, owned: true })), false), '');
  assert.equal(seasonNotice({ season: seasonById('spring'), left: 4 }, LIM, false), '');
  assert.equal(seasonNotice(SPRING, [], true), '');
  assert.ok(!seasonNotice(SPRING, LIM, false).includes('—'));
});

test('seasonStatusLine: shows owned count', () => {
  assert.equal(seasonStatusLine(SPRING, LIM), '🌸 봄 · 3일 남음 · 한정 1/3');
  assert.equal(seasonStatusLine(SPRING, []), '🌸 봄 · 3일 남음');
});

test('season lines are covered by the English dictionary in every season', async () => {
  globalThis.location ??= { search: '?lang=en', hostname: 'localhost', href: 'http://localhost/', reload() {} };
  globalThis.localStorage ??= { getItem: () => null, setItem: () => {}, removeItem: () => {} };
  globalThis.crypto ??= { randomUUID: () => 'test-uuid' };
  const { t, setLang } = await import('../js/i18n.js');
  setLang('en');
  for (const id of SEASON_IDS) {
    const lim = seasonLimited(id, TABLES);
    const s = { season: seasonById(id), left: 2 };
    const lines = [seasonNotice({ ...s, left: 14 }, lim, true), seasonNotice(s, lim, false),
      seasonNotice(s, lim.map((x, i) => ({ ...x, owned: i !== 1 })), false), seasonStatusLine(s, lim.map((x, i) => ({ ...x, owned: i === 0 })))];
    for (const line of lines) assert.doesNotMatch(t(line), /[가-힣]/, `${line} -> ${t(line)}`);
  }
});

test('계절 마지막 하루는 영어로 1 day 단수', async () => {
  const { t, setLang } = await import('../js/i18n.js');
  setLang('en');
  const lim = seasonLimited('spring', TABLES);
  const s = { season: seasonById('spring'), left: 1 };
  const notice = t(seasonNotice(s, lim, false));
  const hud = t(seasonStatusLine(s, lim));
  for (const line of [notice, hud]) {
    assert.match(line, /\b1 day\b/, line);
    assert.doesNotMatch(line, /1 days/, line);
  }
  assert.match(t(seasonStatusLine({ ...s, left: 3 }, lim)), /3 days left/);
});

// ── 🎨 풍경 · 🌸🍂 흩날림 ─────────────────────────────────────
import { SEASON_PALETTE, SEASON_DRIFT, applySeasonPalette } from '../js/season.js';
import { createSeasonDrift, DRIFT_BOX, DRIFT_TOP } from '../js/season-fx.js';
import * as THREE from '../vendor/three/three.module.js';

test('계절 팔레트는 땅·잎 다섯 색만 바꾼다 — 여름은 기본 그대로', () => {
  const base = { ground: 1, groundDark: 2, leaf1: 3, leaf2: 4, leaf3: 5, trunk: 6, sky: 7 };
  assert.deepEqual(applySeasonPalette({ ...base }, 'summer'), base);
  for (const id of ['spring', 'autumn', 'winter']) {
    assert.deepEqual(Object.keys(SEASON_PALETTE[id]).sort(), ['ground', 'groundDark', 'leaf1', 'leaf2', 'leaf3']);
    const out = applySeasonPalette({ ...base }, id);
    assert.equal(out.trunk, 6); assert.equal(out.sky, 7);
    assert.equal(out.leaf2, SEASON_PALETTE[id].leaf2);
  }
});

test('흩날림은 봄·가을만 · InstancedMesh 하나 · 그림자 없음(드로우콜 +1)', () => {
  assert.equal(createSeasonDrift(THREE, 'summer'), null);
  assert.equal(createSeasonDrift(THREE, 'winter'), null);
  for (const id of Object.keys(SEASON_DRIFT)) {
    const d = createSeasonDrift(THREE, id, { count: 12 });
    assert.ok(d.mesh.isInstancedMesh);
    assert.equal(d.mesh.count, 12);
    assert.equal(d.mesh.castShadow, false);
    assert.ok(d.mesh.instanceColor, '색은 인스턴스 색 — 재질은 하나');
    assert.ok(!Array.isArray(d.mesh.material));
  }
});

test('흩날림: 숨김이면 안 움직이고, 보이면 조각이 플레이어 주변 상자 안에 머문다', () => {
  let s = 1; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const d = createSeasonDrift(THREE, 'autumn', { count: 40, rnd });
  d.update(0.016, 0, 100, -50, false);
  assert.equal(d.mesh.visible, false);
  const p = new THREE.Vector3(), m = new THREE.Matrix4();
  for (let f = 0; f < 600; f++) d.update(0.05, f * 0.05, 100, -50, true);   // 30초
  assert.equal(d.mesh.visible, true);
  for (let i = 0; i < 40; i++) {
    d.mesh.getMatrixAt(i, m); p.setFromMatrixPosition(m);
    assert.ok(Math.abs(p.x - 100) <= DRIFT_BOX / 2 + 0.1 && Math.abs(p.z + 50) <= DRIFT_BOX / 2 + 0.1, `조각 ${i} 가 상자 밖 (${p.x.toFixed(1)}, ${p.z.toFixed(1)})`);
    assert.ok(p.y >= -0.1 && p.y <= DRIFT_TOP + 0.1, `조각 ${i} 높이 ${p.y}`);
  }
});
