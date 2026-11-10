import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PANTRY_KEYS, QUESTS, CATCH } from '../js/port/data.js';
import { defaultPort, sanitizePort, rollCatch, acceptQuest, pickItem, claimQuest, addToPantry, pantryUnits, boardGate } from '../js/port/rules.js';
import { steer, pushOutOfIsland, fastStep } from '../js/port/sail.js';
import { portCard, splitLines } from '../js/port/card.js';

test('기본 상태는 의뢰 4개가 모두 대기, 창고는 0', () => {
  const p = defaultPort();
  assert.equal(p.v, 1);
  assert.deepEqual(Object.keys(p.quests), QUESTS.map(q => q.id));
  assert.ok(Object.values(p.quests).every(q => q.state === 'avail' && q.got === 0));
  assert.deepEqual(Object.keys(p.pantry), PANTRY_KEYS);
  assert.equal(pantryUnits(p), 0);
});

test('저장값 정규화: 모르는 키·음수·문자열·범위 밖은 버리거나 고친다', () => {
  const p = sanitizePort({ v: 1, visited: 'yes', fastUnlocked: true, quests: { fisher: { state: 'active', got: 9 }, ghost: { state: 'done', got: 1 } }, pantry: { fish: -3, squid: 4.7, gold: 99 }, boughtDay: 12 });
  assert.equal(p.visited, false);
  assert.equal(p.fastUnlocked, true);
  assert.equal(p.quests.fisher.got, 3);
  assert.equal(p.quests.ghost, undefined);
  assert.equal(p.quests.yatai.state, 'avail');
  assert.equal(p.pantry.fish, 0);
  assert.equal(p.pantry.squid, 4);
  assert.equal(p.pantry.gold, undefined);
  assert.equal(p.boughtDay, null);
  assert.deepEqual(sanitizePort(null), defaultPort());
});

test('어종 뽑기는 누적 확률표를 따른다', () => {
  assert.equal(rollCatch('near', 0.0), 'fish');
  assert.equal(rollCatch('near', 0.74), 'fish');
  assert.equal(rollCatch('near', 0.76), 'shrimp');
  assert.equal(rollCatch('far', 0.1), 'squid');
  assert.equal(rollCatch('far', 0.99), 'bigfish');
  assert.equal(rollCatch('night', 0.5), 'squid');
  for (const zone of Object.keys(CATCH)) assert.ok(Math.abs(CATCH[zone].reduce((a, [, w]) => a + w, 0) - 1) < 1e-9);
});

test('의뢰: 수락 → 줍기(need 까지만) → 보상, 순서를 어기면 그대로', () => {
  let p = defaultPort();
  assert.equal(pickItem(p, 'fisher').quests.fisher.got, 0);
  assert.equal(claimQuest(p, 'fisher'), null);
  p = acceptQuest(p, 'fisher');
  assert.equal(p.quests.fisher.state, 'active');
  for (let i = 0; i < 5; i++) p = pickItem(p, 'fisher');
  assert.equal(p.quests.fisher.got, 3);
  const r = claimQuest(p, 'fisher');
  assert.deepEqual(r.reward, { fish: 5, shrimp: 2 });
  assert.equal(r.port.quests.fisher.state, 'done');
  assert.equal(r.port.pantry.fish, 5);
  assert.equal(claimQuest(r.port, 'fisher'), null);
  assert.equal(p.quests.fisher.state, 'active');
});

test('창고 합계와 영업 회분(재료 8개 = 1회)', () => {
  const p = addToPantry(defaultPort(), { fish: 6, shrimp: 2, rice: 4 });
  assert.equal(p.pantry.fish, 6);
  assert.equal(pantryUnits(p), 1.5);
  assert.equal(addToPantry(p, { gold: 3 }).pantry.gold, undefined);
});

test('조이스틱 방향으로 돌고 속도가 붙으며, 놓으면 멈춘다', () => {
  let s = { heading: 0, speed: 0 };
  for (let i = 0; i < 20; i++) s = steer(s, { x: 1, y: 0 }, 0.05, { speed: 6, turn: 5 });
  assert.ok(Math.abs(s.heading - (-Math.PI / 2)) < 0.05);
  assert.ok(s.speed > 5);
  for (let i = 0; i < 40; i++) s = steer(s, { x: 0, y: 0 }, 0.05, { speed: 6, turn: 5 });
  assert.equal(s.speed, 0);
});

test('섬 안으로 들어오면 테두리 밖으로 밀어낸다', () => {
  const p = pushOutOfIsland({ x: 30, z: 0 }, { x: 44, z: 0 }, 22.2);
  assert.ok(Math.abs(Math.hypot(p.x - 44, p.z) - 22.2) < 1e-9);
});

test('바로 가기는 항로 점을 차례로 따라가 끝에서 done', () => {
  let st = { p: { x: 0, z: 0 }, wp: 1, done: false };
  const route = [[0, 0], [3, 0], [3, 4]];
  for (let i = 0; i < 10 && !st.done; i++) st = fastStep(st.p, route, st.wp, 1);
  assert.equal(st.done, true);
  assert.deepEqual(st.p, { x: 3, z: 4 });
});

test('대사는 문장 끝에서 나눈다', () => {
  assert.deepEqual(splitLines('그물 부표가 떠내려갔어. 3개만 주워 줄래?'), ['그물 부표가 떠내려갔어.', '3개만 주워 줄래?']);
});

test('의뢰 카드는 섬 안에서, 진행 중인 의뢰가 있을 때만 뜬다', () => {
  assert.equal(portCard(defaultPort(), true), null);
  assert.equal(portCard(undefined, true), null);
  const p = pickItem(acceptQuest(defaultPort(), 'fisher'), 'fisher');
  assert.equal(portCard(p, false), null);
  const c = portCard(p, true);
  assert.equal(c.id, 'port_quest');
  assert.equal(c.progress, 1);
  assert.equal(c.target, 3);
  assert.equal(c.ready, false);
});

test('도착한 자리에선 한 번 반경 밖으로 나가기 전엔 배를 다시 타지 않는다', () => {
  let armed = false;
  let g = boardGate(armed, 0, 1.2);
  assert.equal(g.can, false); armed = g.armed;
  g = boardGate(armed, 0.5, 1.2);
  assert.equal(g.can, false); armed = g.armed;
  g = boardGate(armed, 1.3, 1.2);
  assert.equal(g.can, false); assert.equal(g.armed, true); armed = g.armed;
  g = boardGate(armed, 0.4, 1.2);
  assert.equal(g.can, true);
});

test('pushOutOfCircles keeps the boat outside every route buoy', async () => {
  const { pushOutOfCircles } = await import('../js/port/sail.js');
  const buoys = [{ x: 0, z: 0, r: 1.4 }, { x: 5, z: 0, r: 1.4 }];
  const p = pushOutOfCircles({ x: 0.5, z: 0.2 }, buoys);
  assert.ok(Math.hypot(p.x, p.z) >= 1.4 - 1e-9);
  assert.deepEqual(pushOutOfCircles({ x: 2.5, z: 0 }, buoys), { x: 2.5, z: 0 });
});

test('offsetRoute keeps both ends and moves every buoy waypoint sideways by d', async () => {
  const { offsetRoute } = await import('../js/port/sail.js');
  const route = [[0, 0], [5, 0], [10, 0]];
  const out = offsetRoute(route, 1.8);
  assert.deepEqual(out[0], [0, 0]);
  assert.deepEqual(out[2], [10, 0]);
  assert.ok(Math.abs(Math.hypot(out[1][0] - 5, out[1][1]) - 1.8) < 1e-9);
});

test('fast route never comes within buoy reach of the real buoys', async () => {
  const { offsetRoute, fastStep, pushOutOfCircles } = await import('../js/port/sail.js');
  const { ROUTE, FAST_ROUTE, BUOYS } = await import('../js/port/data.js');
  assert.equal(FAST_ROUTE.length, ROUTE.length);
  let st = { p: { x: FAST_ROUTE[0][0], z: FAST_ROUTE[0][1] }, wp: 1, done: false };
  for (let i = 0; i < 2000 && !st.done; i++) {
    st = fastStep(st.p, FAST_ROUTE, st.wp, 0.1);
    for (const b of BUOYS) assert.ok(Math.hypot(st.p.x - b.x, st.p.z - b.z) >= b.r, `hit buoy at ${b.x},${b.z}`);
  }
  assert.ok(st.done);
  assert.equal(typeof offsetRoute, 'function');
  assert.equal(typeof pushOutOfCircles, 'function');
});

test('every fishing spot sits clear of the route buoys so the boat can reach its centre', async () => {
  const { SEA_SPOTS, PIER_SPOT, BUOYS } = await import('../js/port/data.js');
  for (const s of [...SEA_SPOTS, PIER_SPOT]) {
    for (const b of BUOYS) assert.ok(Math.hypot(s.at[0] - b.x, s.at[1] - b.z) > b.r + 1.5, `spot ${s.at} too close to buoy ${b.x},${b.z}`);
  }
});

test('sellCatch sells only the sea catch at the hut and leaves restaurant goods', async () => {
  const { sellCatch } = await import('../js/port/rules.js');
  const { SELL_PRICE } = await import('../js/port/data.js');
  const port = { pantry: { fish: 3, bigfish: 1, squid: 2, shrimp: 1, clam: 4, rice: 2, veg: 2 } };
  const r = sellCatch(port);
  assert.equal(r.coins, 3 * SELL_PRICE.fish + SELL_PRICE.bigfish + 2 * SELL_PRICE.squid + SELL_PRICE.shrimp);
  assert.deepEqual(r.sold, { fish: 3, bigfish: 1, squid: 2, shrimp: 1 });
  assert.deepEqual(r.port.pantry, { fish: 0, bigfish: 0, squid: 0, shrimp: 0, clam: 4, rice: 2, veg: 2 });
  assert.equal(port.pantry.fish, 3);
});

test('sellCatch with nothing to sell returns null', async () => {
  const { sellCatch } = await import('../js/port/rules.js');
  assert.equal(sellCatch({ pantry: { clam: 4, rice: 2 } }), null);
});
