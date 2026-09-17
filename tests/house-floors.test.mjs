import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { floorsFor, floorAt, normalizeFloor, decorUnlocked, canPlaceOn } from '../js/house-floors.js';

test('3단계는 1층뿐', () => {
  const fs = floorsFor(3);
  assert.equal(fs.length, 1);
  assert.equal(fs[0].half, 7);
});

test('4단계는 다락이 열린다(작은 층)', () => {
  const fs = floorsFor(4);
  assert.deepEqual(fs.map(f => f.id), ['ground', 'attic']);
  assert.equal(floorAt(4, 1).half, 4.5);
});

test('5단계에서 위층이 2층으로 넓어진다 — f 는 그대로 1', () => {
  assert.equal(floorAt(5, 1).id, 'upper');
  assert.equal(floorAt(5, 1).half, 6);
});

test('6단계에서만 루프탑이 열리고 실외다', () => {
  assert.equal(floorAt(5, 2), null);
  assert.equal(floorAt(6, 2).outdoor, true);
});

test('위층은 넓어지기만 한다 — 다락 가구 좌표가 2층에서도 유효', () => {
  assert.ok(floorAt(5, 1).half >= floorAt(4, 1).half);
});

test('normalizeFloor: 없거나 아직 안 열린 층은 1층으로 떨군다', () => {
  assert.equal(normalizeFloor(undefined, 6), 0);
  assert.equal(normalizeFloor(2, 4), 0);   // 4단계엔 루프탑이 없다
  assert.equal(normalizeFloor(1, 4), 1);
});

test('고급 가구는 stage 로 해금되고, 기존 가구는 항상 열려 있다', () => {
  assert.equal(decorUnlocked({ id: 'sofa' }, 3), true);
  assert.equal(decorUnlocked({ id: 'jacuzzi', stage: 6 }, 5), false);
  assert.equal(decorUnlocked({ id: 'jacuzzi', stage: 6 }, 6), true);
});

test('실외 전용 가구는 루프탑에만 놓인다', () => {
  const firepit = { id: 'firepit', stage: 6, outdoorOnly: true };
  assert.equal(canPlaceOn(firepit, floorAt(6, 2)), true);
  assert.equal(canPlaceOn(firepit, floorAt(6, 0)), false);
  assert.equal(canPlaceOn({ id: 'sofa' }, floorAt(6, 2)), true);
});

// ── Task 2: 고급 가구 10종 데이터 + 코인 결제 ─────────────────────
const SRC = readFileSync(new URL('../js/game.js', import.meta.url), 'utf8');
const DECOR_SRC = SRC.slice(SRC.indexOf('const DECOR = ['), SRC.indexOf('\n];', SRC.indexOf('const DECOR = [')));

test('고급 가구 10종이 코인 전용으로 들어 있다', () => {
  const coinLines = DECOR_SRC.split('\n').filter(l => l.includes("pay: 'coins'"));
  assert.equal(coinLines.length, 10);
});

test('고급 가구 가격은 구성품 대역과 같다', () => {
  const costs = [...DECOR_SRC.matchAll(/cost: (\d+),\s*pay: 'coins'/g)].map(m => +m[1]);
  assert.deepEqual(costs.sort((a, b) => a - b), [120, 150, 180, 250, 280, 300, 400, 500, 700, 900]);
});

test('루프탑 가구 3종만 실외 전용이다', () => {
  assert.equal((DECOR_SRC.match(/outdoorOnly: true/g) || []).length, 3);
});

test('기존 21종은 작물·생선 그대로다', () => {
  // ⚠️ task-2-brief 는 "기존 22종"을 전제했으나 DECOR 원본을 세어 보면 21종이다(주석
  // "2026-09-09 추가 9종" 기준으로도 12+9=21). 실측값에 맞춰 기대치를 21로 둔다.
  const old = DECOR_SRC.split('\n').filter(l => /pay: '(crop|fish)'/.test(l));
  assert.equal(old.length, 21);
});

// ── Task 3: 가구 f(층) 저장 + 복원 마이그레이션 ─────────────────────
test('옛 세이브(f 없음)의 가구는 전부 1층으로 읽힌다', () => {
  const oldSave = [{ id: 'sofa', x: 1, z: 2, rot: 0 }, { id: 'bed', x: -3, z: 0, rot: 1 }];
  const restored = oldSave.map(d => ({ ...d, f: normalizeFloor(d.f, 6) }));
  assert.deepEqual(restored.map(d => d.f), [0, 0]);
});

test('복원 코드가 house 부재 가드를 유지한다', () => {
  assert.ok(SRC.includes('if (saved.house && Array.isArray(saved.house.decor))'));
});

// ── Task 5: 상점에 층 해금 반영 ─────────────────────────────────
test('상점 목록은 잠긴 가구에 locked 를 붙인다', () => {
  const list = [{ id: 'sofa' }, { id: 'jacuzzi', stage: 6 }].map(d => ({ ...d, locked: !decorUnlocked(d, 4) }));
  assert.deepEqual(list.map(d => d.locked), [false, true]);
});

test('getDecor 가 해금 상태를 실어 보낸다', () => {
  assert.ok(SRC.includes('locked: !decorUnlocked('));
});

test('getDecor 가 hidden 가구는 목록에서 뺀다(Task 6 parasol_set 대비)', () => {
  assert.ok(SRC.includes('DECOR.filter(d => !d.hidden)'));
});

test('placeDecor 가 결제 전에 층 해금·실외 전용 가드를 건다', () => {
  const decorSrc = SRC.slice(SRC.indexOf('function placeDecor('), SRC.indexOf('function placeDecor(') + 2000);
  const guardIdx = decorSrc.indexOf('decorUnlocked(def, gameState.houseStage)');
  const payIdx = decorSrc.indexOf('gameState.inventory[pay] -= def.cost');
  assert.ok(guardIdx > -1 && payIdx > -1 && guardIdx < payIdx);
  assert.ok(decorSrc.includes('canPlaceOn(def, floorDef)'));
  assert.ok(decorSrc.includes('집을 더 증축하면 살 수 있어요'));
  assert.ok(decorSrc.includes('루프탑에만 놓을 수 있어요'));
});

test('placeDecor 의 해금 가드는 silent(세이브 복원) 복원을 막지 않는다', () => {
  // applySave 는 houseStage 를 가구보다 나중에 복원한다 — silent 경로까지 gameState.houseStage 로
  // 즉시 걸면 이미 정당하게 산 고급 가구가 복원 시 사라진다(회귀). guard 가 !silent 안에 있어야 한다.
  const decorSrc = SRC.slice(SRC.indexOf('function placeDecor('), SRC.indexOf('function placeDecor(') + 2000);
  const guardBlockIdx = decorSrc.indexOf('if (!silent) {');
  const innerGuardIdx = decorSrc.indexOf('decorUnlocked(def, gameState.houseStage)');
  assert.ok(guardBlockIdx > -1 && innerGuardIdx > guardBlockIdx);
});
