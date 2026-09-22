// tests/pet-rules.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  PET_PRICE, PET_RADIUS, PET_TASKS, GROW_NEED, REST_SEC, CHAIN_MAX,
  emptyPet, stageOf, toNextStage, canCommand, pickPetTask, afterWork,
} from '../js/pet/rules.js';

test('표: 펫은 잡일만 한다 — 수확·파종은 없다(스펙 §7-1)', () => {
  assert.deepEqual([...PET_TASKS], ['water', 'weed', 'pest']);
  assert.ok(!PET_TASKS.includes('harvest'), '수확은 보상이라 뺏으면 안 된다');
  assert.ok(!PET_TASKS.includes('plant'));
});

test('표: 성장 문턱은 일꾼(120/400)보다 낮다 — 펫은 일을 덜 한다(§8-1)', () => {
  assert.deepEqual([...GROW_NEED], [0, 40, 140]);
  assert.ok(GROW_NEED[1] < 120 && GROW_NEED[2] < 400);
});

test('stageOf / toNextStage: 40 · 140 경계', () => {
  assert.equal(stageOf(0), 0); assert.equal(stageOf(39), 0); assert.equal(stageOf(40), 1);
  assert.equal(stageOf(139), 1); assert.equal(stageOf(140), 2); assert.equal(stageOf(99999), 2);
  assert.equal(stageOf(undefined), 0, '세이브에 없으면 1단계');
  assert.equal(toNextStage(0), 40); assert.equal(toNextStage(40), 100); assert.equal(toNextStage(140), null);
});

test('canCommand: 쿨다운이 끝나야 시킬 수 있다 — 일급 대신 브레이크(§7-4)', () => {
  const p = emptyPet('spirit');
  assert.equal(canCommand(p, 1000), true);
  assert.equal(canCommand({ ...p, restUntil: 5000 }, 4999), false);
  assert.equal(canCommand({ ...p, restUntil: 5000 }, 5000), true);
  assert.equal(canCommand(null, 1), false, '펫이 없으면 못 시킨다');
});

test('pickPetTask: 반경 밖은 안 건드린다 — 밭 전체는 일꾼의 몫(§6-2)', () => {
  const far = [{ i: 0, x: 99, z: 0, state: 'growing', wet: false, weed: false, pest: false }];
  assert.equal(pickPetTask(far, { x: 0, z: 0 }, PET_RADIUS), null);
});

test('pickPetTask: 물 > 잡초 > 해충 순 — 시들기 임박한 것부터', () => {
  const plots = [
    { i: 1, x: 1, z: 0, state: 'growing', wet: true,  weed: true,  pest: false },
    { i: 2, x: 2, z: 0, state: 'growing', wet: false, weed: false, pest: false, wiltAt: 50 },
    { i: 3, x: 1, z: 1, state: 'growing', wet: false, weed: false, pest: false, wiltAt: 10 },
  ];
  assert.deepEqual(pickPetTask(plots, { x: 0, z: 0 }, PET_RADIUS), { type: 'water', i: 3 });
});

test('pickPetTask: 잡초가 덮인 밭에는 물을 주지 않는다 — 자라지 않는다', () => {
  const plots = [{ i: 1, x: 1, z: 0, state: 'growing', wet: false, weed: true, pest: false }];
  assert.deepEqual(pickPetTask(plots, { x: 0, z: 0 }, PET_RADIUS), { type: 'weed', i: 1 });
});

test('pickPetTask: 익은 밭이 있어도 수확하지 않는다', () => {
  const plots = [{ i: 1, x: 1, z: 0, state: 'mature', wet: true, weed: false, pest: false }];
  assert.equal(pickPetTask(plots, { x: 0, z: 0 }, PET_RADIUS), null);
});

test('afterWork: 한 일만큼 works 가 늘고 쿨다운이 걸린다 — 원본 불변', () => {
  const p = emptyPet('bird');
  const r = afterWork(p, 3, 10_000);
  assert.equal(r.works, 3);
  assert.equal(r.restUntil, 10_000 + REST_SEC * 1000);
  assert.equal(p.works, 0, '원본이 바뀌면 안 된다');
});

test('afterWork: 한 번에 CHAIN_MAX 를 넘겨 세지 않는다', () => {
  assert.equal(afterWork(emptyPet('bird'), 99, 0).works, CHAIN_MAX);
});

test('PET_PRICE 는 꾸미기 최고가(2,600)보다 비싸다 — 펫이 가장 큰 상품이다', () => {
  assert.ok(PET_PRICE > 2600);
});
