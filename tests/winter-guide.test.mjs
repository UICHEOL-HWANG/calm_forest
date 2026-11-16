import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { bannerDue, arrowWanted, FOUNTAIN_BANNER_MAX, FOUNTAIN_ARROW_REACH, FOUNTAIN_SPOT_R } from '../js/plaza/winter-guide.js';
import { fountainCard } from '../js/plaza/winter-card.js';
import { GUIDE_PRIORITY, createArbiter } from '../js/guide/arbiter.js';
import { winterDefault } from '../js/plaza/winter-rules.js';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const B = { phase: 'active', open: true, reached: false, busy: false, tries: 0 };
const A = { phase: 'active', open: true, reached: false, inVillage: true, busy: false, other: false };

test('bannerDue: 시즌 중·집 완성 뒤·아직 안 와 봤고 2번까지', () => {
  assert.equal(FOUNTAIN_BANNER_MAX, 2);
  assert.equal(bannerDue(B), true);
  assert.equal(bannerDue({ ...B, tries: 2 }), false);
  assert.equal(bannerDue({ ...B, open: false }), false);
  assert.equal(bannerDue({ ...B, reached: true }), false);
  assert.equal(bannerDue({ ...B, busy: true }), false);
  assert.equal(bannerDue({ ...B, phase: 'after' }), false);
});

test('arrowWanted: 다른 안내가 앞서면 비킨다', () => {
  assert.equal(arrowWanted(A), true);
  assert.equal(arrowWanted({ ...A, other: true }), false);
  assert.equal(arrowWanted({ ...A, inVillage: false }), false);
  assert.equal(arrowWanted({ ...A, reached: true }), false);
});

test('중재: fountain 은 이야기 목표보다 낮다', () => {
  assert.ok(GUIDE_PRIORITY.fountain < GUIDE_PRIORITY.goal);
  const arb = createArbiter();
  arb.register({ name: 'goal', active: () => true });
  arb.register({ name: 'fountain', active: () => false });
  assert.equal(arb.mayShow('fountain'), false);
});

test('fountainCard: 시즌 중·안내가 열린 사람에게 "❄️ 내 분수 n/4", 다 지으면 사라진다', () => {
  const now = Date.parse('2026-12-20T12:00:00+09:00');
  const plaza = { winter: { 'winter-2026': { ...winterDefault(), given: { '1:wood': 20, '1:stone': 15 } } } };
  const c = fountainCard(plaza, now, true, null);
  assert.deepEqual([c.title, c.progress, c.target], ['❄️ 내 분수', 2, 4]);
  assert.equal(fountainCard(plaza, now, false, null), null);
  assert.equal(fountainCard(plaza, Date.parse('2026-12-10T12:00:00+09:00'), true, null), null);
  const done = { winter: { 'winter-2026': { ...winterDefault(), given: { '1:wood': 20, '1:stone': 15, '2:stone': 25, '2:coal': 10, '3:fish': 10, '3:forage': 15 } } } };
  assert.equal(fountainCard(done, now, true, null), null);
  assert.equal(fountainCard({}, Date.parse('2026-12-10T12:00:00+09:00'), true, 'wtest-1').progress, 1);
});

test('연결: 중재 등록·첫 방문·의뢰 패널', () => {
  assert.ok(read('js/plaza/winter.js').includes("guideArbiter.register({ name: 'fountain', active: winterGuideActive })"));
  assert.ok(read('js/game.js').includes('fountain: () => fountainSpotNow()'));
  assert.ok(read('js/spaces/npc.js').includes('fountainCard(gameState.plaza, Date.now(), featureGuidesOpen(gameState))'));
});

test('첫 방문 칸은 시즌 중에만 열린다', () => {
  assert.ok(read('js/plaza/winter.js').includes("export const fountainSpotNow = () => spot === 'fountain' && debugStage === null && winterPhase() === 'active';"));
});

test('화살표 도착 반경은 분수 칸 안쪽이다', () => {
  assert.ok(FOUNTAIN_ARROW_REACH < FOUNTAIN_SPOT_R);
});
