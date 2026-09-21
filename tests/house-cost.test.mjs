import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BUILD_STAGES, buildInfo, MAX_BUILD_STAGE, EXPANSIONS, STAGE_NAMES } from '../js/house-cost.js';
import { TUNING } from '../js/tuning.js';

// 🏠 집 건축(0→3) 비용 — 2026-09-21 리밸런스.
//   베타 피드백 "만들고 집 업데이트 하는 게 너무 쉽다". 재료를 목재 단일(10×3)에서
//   목재·돌·코인으로 넓혀, 반복을 늘리는 대신 다른 콘텐츠를 거치게 만든다.
const SRC = readFileSync(new URL('../js/game.js', import.meta.url), 'utf8');
const HTML = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

const none = { inventory: {}, upgrades: {} };
const rich = { inventory: { wood: 999, stone: 999, coins: 999 }, upgrades: {} };

// ── 비용표 ────────────────────────────────────────────────────
test('3단계가 전부 있고 목재가 단계마다 늘어난다', () => {
  assert.equal(BUILD_STAGES.length, 3);
  assert.equal(MAX_BUILD_STAGE, 3);
  assert.deepEqual(BUILD_STAGES.map(s => s.stage), [1, 2, 3]);
  const woods = BUILD_STAGES.map(s => s.cost.wood);
  assert.deepEqual(woods, [15, 20, 25]);
});

test('🪵 총 목재가 예전(30)보다 늘었다 — "너무 쉽다" 피드백의 본체', () => {
  const total = BUILD_STAGES.reduce((a, s) => a + s.cost.wood, 0);
  assert.equal(total, 60);
});

// 🚧 튜토리얼 안전장치.
//   ⚠️ 여기서 지켜야 하는 건 "1단계가 목재만" 이 **아니다** — 튜토리얼 build 스텝의 달성 조건은
//      1단계가 아니라 **3단계 완성**이다(js/game.js buildHouseStage 의 `if (stage === 3)` 안에서
//      ui.act?.('build') 가 불린다. 코치 문구 '⑮ … 1장 완성' 과 달리 실제론 집이 다 지어져야 한다).
//      3단계는 돌 15 + 코인 80 을 요구하므로, 진짜 불변조건은 **튜토리얼 순서**다:
//      build 는 sell(코인)·mine(돌) 보다 뒤에 와야 한다.
test('튜토리얼 순서에서 build 는 sell·mine 보다 뒤다 — 앞서면 재료를 못 구해 막힌다', () => {
  const idx = (order, k) => order.indexOf(k);
  const steps = HTML.match(/const TUT_STEPS = \[(.*?)\n {4}\];/s)[1];
  const base = [...steps.matchAll(/key: '(\w+)'/g)].map(m => m[1]);
  for (const [label, order] of [['기본', base], ['A군', TUNING.TUT_ORDER_A]]) {
    assert.ok(idx(order, 'build') > idx(order, 'sell'), `${label}: build 가 sell 보다 앞이라 🪙코인 80 을 못 구한다`);
    assert.ok(idx(order, 'build') > idx(order, 'mine'), `${label}: build 가 mine 보다 앞이라 🪨돌 15 를 못 구한다`);
  }
});

// 데크가 목재만인 건 순서와 무관한 2차 안전망 — 순서를 누가 바꿔도 첫 삽은 뜬다
test('1단계(데크)는 목재만 요구한다 — 채광 전에도 첫 삽은 뜬다', () => {
  assert.deepEqual(Object.keys(BUILD_STAGES[0].cost), ['wood']);
});

test('STAGE_NAMES 는 비용표에서 파생된다 — 이름이 두 곳에서 갈리지 않게', () => {
  assert.deepEqual(STAGE_NAMES, ['', '나무 바닥(데크)', '통나무 벽', '지붕']);
  assert.equal(SRC.includes('const STAGE_NAMES ='), false);
});

test('2단계부터 돌, 3단계에 코인이 붙는다', () => {
  assert.deepEqual(BUILD_STAGES[1].cost, { wood: 20, stone: 10 });
  assert.deepEqual(BUILD_STAGES[2].cost, { wood: 25, stone: 15, coins: 80 });
});

// ── buildInfo — 증축(expandInfo)과 같은 items 형태 ──────────────
test('다음 단계의 재료·필요·보유를 증축과 같은 형태로 돌려준다', () => {
  const info = buildInfo({ houseStage: 1, inventory: { wood: 5 }, upgrades: {} });
  assert.equal(info.maxed, false);
  assert.equal(info.next.stage, 2);
  assert.deepEqual(info.items.map(i => [i.k, i.need, i.have]), [['wood', 20, 0 + 5], ['stone', 10, 0]]);
  assert.equal(info.affordable, false);
});

test('재료가 충분하면 affordable', () => {
  const info = buildInfo({ houseStage: 1, ...rich });
  assert.equal(info.affordable, true);
});

test('3단계를 다 지으면 maxed — 그 뒤는 증축(EXPANSIONS)이 맡는다', () => {
  const info = buildInfo({ houseStage: 3, ...rich });
  assert.equal(info.maxed, true);
  assert.equal(info.next, null);
});

test('상태가 비어 있어도 터지지 않고 1단계를 가리킨다', () => {
  const info = buildInfo({});
  assert.equal(info.next.stage, 1);
  assert.equal(info.affordable, false);
});

// ── 🔨 묵직한 망치 — 목재만 30% 깎는다 ─────────────────────────
test('망치는 목재만 깎고 돌·코인은 그대로', () => {
  const info = buildInfo({ houseStage: 2, inventory: {}, upgrades: { hammer: true } });
  const need = Object.fromEntries(info.items.map(i => [i.k, i.need]));
  assert.deepEqual(need, { wood: Math.ceil(25 * 0.7), stone: 15, coins: 80 });   // 25→18
});

// ── 증축 ─────────────────────────────────────────────────────
test('🏗️ 증축 목재가 ×1.5 로 올랐고 코인은 그대로다', () => {
  // 코인은 일반 유저 도달률이 0 이라 올리지 않기로 했다(econ_logs 측정, 2026-09-21).
  assert.deepEqual(EXPANSIONS.map(e => [e.stage, e.cost.wood, e.cost.coins]),
    [[4, 45, 120], [5, 75, 350], [6, 120, 800]]);
  assert.equal(SRC.includes('const EXPANSIONS ='), false);   // 수치가 game.js 로 되돌아가지 않게
});

// 🚧 game.js 가 낡은 단일 상수로 되돌아가지 않게
test('game.js 에 BUILD_COST 스칼라가 남아 있지 않다', () => {
  assert.equal(/const BUILD_COST\s*=/.test(SRC), false);
});
