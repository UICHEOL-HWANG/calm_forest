import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { UNLOCKS, UNLOCK_IDS, defaultUnlocks, restoreUnlocks, unlockedSet, isUnlocked,
         newlyUnlocked, lockedNpcIds } from '../js/world/unlocks.js';

const fresh = (o = {}) => ({ unlocks: defaultUnlocks(), houseStage: 0, hintsSeen: {}, story: { ch: 0 }, coop: { built: false }, ...o });
const open = (s, opts) => unlockedSet(s, opts);

test('새 세이브: 올빼미·집터·작업대·텃밭·광산은 열림, 이웃·시설은 닫힘', () => {
  const s = open(fresh());
  for (const id of ['courier', 'house', 'bench', 'farm', 'mine']) assert.ok(s.has(id), `${id} 는 시작부터`);
  for (const id of ['merchant', 'builder', 'curator', 'farmer', 'angler', 'chef', 'museum', 'cafe', 'river', 'sea'])
    assert.ok(!s.has(id), `${id} 는 시작엔 닫힘`);
});

test('🎣 호수 낚시는 해금 표에 없다 → 항상 열림(E3 트리거 경로 보존)', () => {
  assert.ok(!UNLOCK_IDS.includes('lake'));
  assert.equal(isUnlocked(fresh(), 'lake'), true);
});

test('표에 없는 id 는 항상 열림 — 새 NPC·시설이 실수로 숨지 않게', () => {
  assert.equal(isUnlocked(fresh(), 'someFutureNpc'), true);
});

test('해금 순서: 상인 → 목수 → 다리 → 박물관·할아버지', () => {
  let s = fresh();
  const steps = [
    [{ hintsSeen: { merchantVisit: true } }, ['merchant', 'shop', 'market']],
    [{ houseStage: 1 }, ['builder']],
    [{ houseStage: 3 }, ['bridgeRepair']],
    [{ unlocks: { ...defaultUnlocks(), flags: { bridge: true } } }, ['museum', 'curator']],
  ];
  for (const [patch, expect] of steps) {
    const prev = open(s);
    s = { ...s, ...patch };
    assert.deepEqual(newlyUnlocked(prev, open(s)), expect);
  }
});

test('세계수 가지: 서식지 → 이웃, 물 꾸러미 → 사공·바다', () => {
  const s = fresh({ tree: { branches: { water: { habitat: true }, farm: { habitat: true } } } });
  const o = open(s);
  for (const id of ['angler', 'river', 'farmer', 'coop', 'orchard']) assert.ok(o.has(id), id);
  assert.ok(!o.has('ferryman') && !o.has('sea'));
  assert.ok(!o.has('rancher'), '목장 아주머니는 닭장을 지어야');
  const s2 = { ...s, coop: { built: true }, tree: { branches: { ...s.tree.branches, water: { habitat: true, bundles: true } } } };
  for (const id of ['rancher', 'ferryman', 'sea']) assert.ok(open(s2).has(id), id);
});

test('장 진행: 6장 → 천문대·별 보는 아이, 7장 → 이웃·거울 마을', () => {
  assert.ok(!open(fresh({ story: { ch: 5 } })).has('observatory'));
  assert.ok(open(fresh({ story: { ch: 6 } })).has('stargazer'));
  const o = open(fresh({ story: { ch: 7 } }));
  assert.ok(o.has('neighbor') && o.has('mirror'));
});

test('기존 세이브(unlocks 없음) → legacy → 전부 열림', () => {
  const u = restoreUnlocks(undefined);
  assert.equal(u.legacy, true);
  assert.equal(open(fresh({ unlocks: u })).size, UNLOCK_IDS.length);
  assert.equal(restoreUnlocks(null).legacy, true);
  assert.equal(restoreUnlocks([]).legacy, true);
  assert.equal(restoreUnlocks('x').legacy, true);
});

test('새 세이브가 저장·복원되면 legacy 가 아니고 flags 는 true 만 남는다', () => {
  const u = restoreUnlocks({ v: 1, legacy: false, flags: { bridge: true, evil: 'yes', no: false } });
  assert.deepEqual(u, { v: 1, legacy: false, flags: { bridge: true } });
});

test('킬 스위치(enabled:false) → 전부 열림', () => {
  assert.equal(open(fresh(), { enabled: false }).size, UNLOCK_IDS.length);
  assert.deepEqual(lockedNpcIds(fresh(), { enabled: false }), []);
});

test('state.unlocks 가 아예 없으면(옛 코드 경로) 전부 열림', () => {
  assert.equal(open({}).size, UNLOCK_IDS.length);
});

test('id 중복 없음 · kind 는 npc|place', () => {
  assert.equal(new Set(UNLOCK_IDS).size, UNLOCK_IDS.length);
  for (const u of UNLOCKS) assert.ok(u.kind === 'npc' || u.kind === 'place', u.id);
});

test('js/data/npcs.js 의 모든 NPC 가 해금 표에 있다', () => {
  const src = readFileSync(new URL('../js/data/npcs.js', import.meta.url), 'utf8');
  const ids = [...src.matchAll(/^\s*id: '([a-z]+)', name:/gm)].map(m => m[1]);
  assert.ok(ids.length >= 11, `NPC id 를 못 읽었다(${ids.length})`);
  const npcIds = new Set(UNLOCKS.filter(u => u.kind === 'npc').map(u => u.id));
  for (const id of ids) assert.ok(npcIds.has(id), `${id} 가 해금 표에 없다`);
});

test('새 세이브 시작 시 닫힌 NPC 목록 — 올빼미 빼고 전부', () => {
  const locked = lockedNpcIds(fresh());
  assert.ok(!locked.includes('courier'));
  assert.equal(locked.length, UNLOCKS.filter(u => u.kind === 'npc').length - 1);
});

// ── 🦉 의뢰 풀 — 잠긴 시설·숨은 이웃을 쓰는 의뢰는 안 나온다(못 깨는 의뢰가 하루 체인을 막는다) ──
import { unlockQuestCtx } from '../js/world/unlocks.js';
import { questAvailable, pickGated, repeatNPCsFor, UNLOCK_GATES, REPEAT_POOL } from '../js/quests.js';
import { DAILY_POOL, DAILY_COUNT } from '../js/data/npcs.js';

const freshCtx = (o = {}) => ({ coopBuilt: false, houseStage: 0, locked: {}, ...unlockQuestCtx(fresh(o)) });

test('새 세이브(시작 세트만 열림)에서도 일일 의뢰 풀이 DAILY_COUNT 종 이상 남는다', () => {
  const ctx = freshCtx();
  const ok = DAILY_POOL.filter(q => questAvailable(q.type, ctx)).map(q => q.type);
  assert.ok(ok.length >= DAILY_COUNT, `남은 종류 ${ok.length} < ${DAILY_COUNT}: ${ok.join(',')}`);
  for (const t of ['sell', 'serve', 'catch', 'forage', 'boat', 'seafish', 'mist', 'gift'])
    assert.ok(!ok.includes(t), `${t} 는 시작엔 못 깬다`);
  for (let seed = 1; seed < 400; seed += 7)
    assert.equal(pickGated(DAILY_POOL, DAILY_COUNT, seed, ctx).length, DAILY_COUNT, `seed ${seed}`);
});

test('🧙 상인이 돌아오면 🛒 판매·🎁 선물 의뢰가 풀에 들어온다', () => {
  const ctx = freshCtx({ hintsSeen: { merchantVisit: true } });
  assert.ok(questAvailable('sell', ctx));
  assert.ok(questAvailable('gift', ctx), '이웃 한 명(상인)이면 선물을 줄 수 있다');
  assert.ok(!questAvailable('serve', ctx));
});

test('해금 꺼짐·legacy → 의뢰 게이트가 아무것도 더 거르지 않는다', () => {
  for (const ctx of [unlockQuestCtx(fresh(), { enabled: false }), unlockQuestCtx(fresh({ unlocks: restoreUnlocks(undefined) }))]) {
    assert.deepEqual(ctx.closed, {});
    assert.deepEqual(ctx.hiddenNpcs, []);
    for (const t of Object.keys(UNLOCK_GATES)) assert.ok(questAvailable(t, { ...ctx, coopBuilt: true, houseStage: 9, locked: {} }), t);
  }
});

test('UNLOCK_GATES 가 가리키는 시설은 전부 해금 표에 있다', () => {
  for (const [t, id] of Object.entries(UNLOCK_GATES)) assert.ok(UNLOCK_IDS.includes(id), `${t} → ${id}`);
});

test('반복 의뢰 후보에서 숨은 이웃을 뺀다 — 빈 목록이면 예전과 같다', () => {
  const ids = Object.keys(REPEAT_POOL);
  const { hiddenNpcs } = unlockQuestCtx(fresh({ hintsSeen: { merchantVisit: true }, houseStage: 1 }));
  for (let seed = 1; seed < 200; seed += 3) {
    assert.deepEqual(repeatNPCsFor(ids, seed, []), repeatNPCsFor(ids, seed));
    for (const id of repeatNPCsFor(ids, seed, hiddenNpcs)) assert.ok(!hiddenNpcs.includes(id), id);
  }
  assert.deepEqual(new Set(repeatNPCsFor(ids, 5, hiddenNpcs)), new Set(['merchant', 'builder']));
});
