import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tierOf, nextTier, seasonPhase, donateMax, currentItems, visualStage, leafToCoins,
         restorePlaza, plazaDefault, siteOpen, plazaBlocks, stageSeenPlan, gateOpens,
         economyAllowed, nearPollDue } from '../js/plaza/rules.js';

const P = (o = {}) => ({ starts_at: '2026-10-09T00:00:00+09:00', ends_at: '2026-10-23T00:00:00+09:00',
  started: true, stage: 1, max_stage: 3, completed: false, items: [
    { stage: 1, item: 'stone', have: 50, need: 200 }, { stage: 1, item: 'wood', have: 300, need: 300 },
    { stage: 2, item: 'coal', have: 0, need: 100 }], ...o });

test('tierOf: 경계 9/10 · 59/60 · 149/150', () => {
  assert.equal(tierOf(0), null); assert.equal(tierOf(9), null); assert.equal(tierOf(10), 'bronze');
  assert.equal(tierOf(59), 'bronze'); assert.equal(tierOf(60), 'silver');
  assert.equal(tierOf(149), 'silver'); assert.equal(tierOf(150), 'gold');
});

test('nextTier: 다음 등급까지 남은 개수, 최고 등급이면 null', () => {
  assert.deepEqual(nextTier(0), { id: 'bronze', left: 10 });
  assert.deepEqual(nextTier(59), { id: 'silver', left: 1 });
  assert.equal(nextTier(150), null);
});

test('seasonPhase: KST 경계', () => {
  const p = P();
  assert.equal(seasonPhase(p, Date.parse('2026-10-08T23:59:59+09:00')), 'before');
  assert.equal(seasonPhase(p, Date.parse('2026-10-09T00:00:00+09:00')), 'active');
  assert.equal(seasonPhase(p, Date.parse('2026-10-22T23:59:59+09:00')), 'active');
  assert.equal(seasonPhase(p, Date.parse('2026-10-23T00:00:00+09:00')), 'after');
  assert.equal(seasonPhase(null, Date.now()), 'before');
});

test('donateMax: 보유·오늘 남은 상한·품목 남은 필요량 중 최소, 음수 없음', () => {
  assert.equal(donateMax(12, 30, 150), 12);
  assert.equal(donateMax(99, 7, 150), 7);
  assert.equal(donateMax(99, 30, 3), 3);
  assert.equal(donateMax(0, 30, 3), 0);
  assert.equal(donateMax(5, -2, 3), 0);
});

test('currentItems: 현재 단계 품목만, 이름순', () => {
  assert.deepEqual(currentItems(P()).map(i => i.item), ['stone', 'wood']);
  assert.deepEqual(currentItems(P({ stage: 4, completed: true })), []);
});

test('visualStage: 서버 값 우선, 없으면 캐시, 범위 0..4', () => {
  assert.equal(visualStage(P(), 0), 1);
  assert.equal(visualStage(P({ stage: 4, completed: true }), 1), 4);
  assert.equal(visualStage(null, 2), 2);
  assert.equal(visualStage(null, 9), 4);
  assert.equal(visualStage(P({ started: false }), 0), 0);
});

test('leafToCoins: 🍂1 = 🪙2, 비정상 입력은 0', () => {
  assert.equal(leafToCoins(7), 14); assert.equal(leafToCoins(0), 0);
  assert.equal(leafToCoins(-3), 0); assert.equal(leafToCoins('x'), 0);
});

test('restorePlaza: 옛 세이브·깨진 값은 기본값, 새 객체 반환', () => {
  assert.deepEqual(restorePlaza(undefined), plazaDefault());
  const saved = { lastStage: 3, claimed: { 'harvest-2026': 'gold' }, invited: 'harvest-2026', converted: {}, seen: { 2: true, arrived: true } };
  const r = restorePlaza(saved);
  assert.deepEqual(r, saved); assert.notEqual(r, saved);
  assert.equal(restorePlaza({ lastStage: 'x' }).lastStage, 0);
  assert.equal(restorePlaza({ lastStage: 99 }).lastStage, 4);
  assert.deepEqual(restorePlaza({ claimed: { a: 'hack' } }).claimed, {});
});

test('siteOpen: 시작일(KST) 이전엔 광장 터를 비운다', () => {
  assert.equal(siteOpen(Date.parse('2026-10-08T23:00:00+09:00')), false);
  assert.equal(siteOpen(Date.parse('2026-10-09T00:00:00+09:00')), true);
});

test('plazaBlocks: 광장 반경·돌길 위는 산포 금지', () => {
  assert.equal(plazaBlocks(23, -4), true);
  assert.equal(plazaBlocks(23 + 6.5, -4), true);   // PLAZA_R 5 + pad 2 안
  assert.equal(plazaBlocks(23 + 7.5, -4), false);
  assert.equal(plazaBlocks(17.0, -0.1), true);     // 돌길 위
  assert.equal(plazaBlocks(1.9, 2.3), true);       // 🌾 입구 아치
  assert.equal(plazaBlocks(0, -20), false);
});

test('stageSeenPlan: 세이브 복원 전엔 절대 emit 하지 않는다(부팅 순서 함정)', () => {
  const p = { seen: {} };
  assert.deepEqual(stageSeenPlan(p, 2, 'harvest-2026', { saveRestored: false }), { emit: false, key: 'stage2:harvest-2026' });
});

test('stageSeenPlan: 복원됐고 처음 보는 단계면 emit', () => {
  const p = { seen: {} };
  assert.deepEqual(stageSeenPlan(p, 2, 'harvest-2026', { saveRestored: true }), { emit: true, key: 'stage2:harvest-2026' });
});

test('stageSeenPlan: 복원됐지만 이미 본 단계면 emit 안 함', () => {
  const p = { seen: { 'stage2:harvest-2026': true } };
  assert.deepEqual(stageSeenPlan(p, 2, 'harvest-2026', { saveRestored: true }), { emit: false, key: 'stage2:harvest-2026' });
});

test('stageSeenPlan: 검수(?plaza=) 중엔 emit 안 함', () => {
  const p = { seen: {} };
  assert.deepEqual(stageSeenPlan(p, 2, 'harvest-2026', { saveRestored: true, debug: true }), { emit: false, key: 'stage2:harvest-2026' });
});

test('stageSeenPlan: 0단계(광장 없음)는 emit 안 함', () => {
  const p = { seen: {} };
  assert.deepEqual(stageSeenPlan(p, 0, 'harvest-2026', { saveRestored: true }), { emit: false, key: 'stage0:harvest-2026' });
});

test('gateOpens: 복원 전이고 play 모드일 때만 연다', () => {
  assert.equal(gateOpens(false, 'play'), true);
  assert.equal(gateOpens(false, 'attract'), false);   // 로그인 배경 — 아직 안 연다
  assert.equal(gateOpens(true, 'play'), false);       // 이미 열렸으면 다시 안 연다
  assert.equal(gateOpens(true, 'attract'), false);
});

test('economyAllowed: ?plaza= 로 단계 고정 중엔 경제 동작 금지', () => {
  assert.equal(economyAllowed(null), true);
  assert.equal(economyAllowed(0), false);
  assert.equal(economyAllowed(4), false);
});

test('nearPollDue: 시작 전엔 10분에 한 번만, 시작했으면·값이 없으면 항상 허용', () => {
  const before = { started: false, starts_at: '2026-10-09T00:00:00+09:00' };
  const now = Date.parse('2026-10-08T12:00:00+09:00');
  assert.equal(nearPollDue(before, now, now), false);
  assert.equal(nearPollDue(before, now, now - 600_000), true);
  assert.equal(nearPollDue(before, now, -Infinity), true);
  assert.equal(nearPollDue({ started: true }, now, now), true);
  assert.equal(nearPollDue(null, now, now), true);
});

test('깃발 줄 기둥: 🏆게시판·📊시세판 동쪽, 기부함·좌판·광장 원과 떨어져 있다', async () => {
  const { PLAZA, PLAZA_R, PLAZA_BOX, PLAZA_STALL_POS, PLAZA_BUNTING_POSTS } = await import('../js/data/plaza.js');
  for (const [x, z] of PLAZA_BUNTING_POSTS) {
    assert.ok(x > 15.5, `x ${x} > 15.5`);
    assert.ok(Math.hypot(x - PLAZA.x, z - PLAZA.z) > PLAZA_R, `(${x},${z}) 광장 밖`);
    assert.ok(Math.hypot(x - PLAZA_BOX.x, z - PLAZA_BOX.z) > 1.5, `(${x},${z}) 기부함과 떨어짐`);
    assert.ok(Math.hypot(x - PLAZA_STALL_POS.x, z - PLAZA_STALL_POS.z) > 1.5, `(${x},${z}) 좌판과 떨어짐`);
  }
});
