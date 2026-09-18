import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createVisitors, MAX_ALIVE, SPAWN_DELAY_MIN, SPAWN_DELAY_MAX, STAY, CATCH_R, FADE } from '../js/farm-visitors.js';
import { VISITORS } from '../js/habitat.js';

// THREE 없이 도는 가짜 메시 — traverse 로 자기 자신만 훑는다
const fakeMesh = () => ({
  position: { x: 0, y: 0.4, z: 0 },
  material: { transparent: false, opacity: 1 },
  traverse(fn) { fn(this); },
});

const fakeGroup = () => {
  const children = [];
  return {
    children,
    add(m) { children.push(m); },
    remove(m) { const i = children.indexOf(m); if (i >= 0) children.splice(i, 1); },
  };
};

function harness(o = {}) {
  const spawned = [], discovered = [];
  const group = fakeGroup();
  const player = o.player || { x: 999, z: 999 };   // 기본은 멀리 — 근접 등록이 안 일어나게
  const v = createVisitors({
    group,
    makeMesh: () => fakeMesh(),
    cells: o.cells || (() => [{ x: 0, z: 0 }]),
    envAt: () => ({}),
    matchVisitors: () => (o.match === undefined ? [VISITORS[0]] : o.match),
    ctx: () => ({ night: false, rain: false }),
    playerPos: () => player,
    onSpawn: (id) => spawned.push(id),
    onDiscover: (id) => discovered.push(id),
    random: o.random || (() => 0),   // 지연 = SPAWN_DELAY_MIN, 자리 = 첫 후보
  });
  return { v, group, spawned, discovered, player };
}

test('상수: 동시 2마리 · 지연 6~14초 · 체류 25초 · 등록 2.5', () => {
  assert.equal(MAX_ALIVE, 2);
  assert.equal(SPAWN_DELAY_MIN, 6);
  assert.equal(SPAWN_DELAY_MAX, 14);
  assert.equal(STAY, 25);
  assert.equal(CATCH_R, 2.5);
  assert.ok(SPAWN_DELAY_MIN > FADE, '지연이 페이드보다 짧으면 "슬며시 나타남" 이 안 읽힌다');
  assert.ok(STAY > SPAWN_DELAY_MAX, '체류가 지연보다 짧으면 플레이어가 도착하기 전에 사라진다');
});

test('조건을 채워도 바로 뜨지 않는다 — 즉시 스폰은 싸구려가 된다', () => {
  const h = harness();
  h.v.update(0.016);
  assert.deepEqual(h.spawned, [], '첫 프레임에 떠 버렸다');
  assert.equal(h.group.children.length, 0);
});

test('지연이 지나면 뜬다', () => {
  const h = harness();
  h.v.update(0.016);
  h.v.update(SPAWN_DELAY_MIN);
  assert.deepEqual(h.spawned, ['butterfly']);
  assert.equal(h.group.children.length, 1);
  assert.deepEqual(h.v.alive, ['butterfly']);
});

test('뜨는 순간에는 투명하고, 페이드 시간이 지나면 불투명해진다', () => {
  const h = harness();
  h.v.update(0.016); h.v.update(SPAWN_DELAY_MIN);
  assert.equal(h.group.children[0].material.opacity, 0, '툭 튀어나오면 안 된다');
  h.v.update(FADE);
  assert.equal(h.group.children[0].material.opacity, 1);
});

test('체류가 끝나면 사라진다 — 머물지 않는다(관리 부담 0)', () => {
  const h = harness();
  h.v.update(0.016); h.v.update(SPAWN_DELAY_MIN);
  h.v.update(STAY);
  assert.deepEqual(h.v.alive, []);
  assert.equal(h.group.children.length, 0, '메시가 남으면 드로우콜이 샌다');
});

test('떠나기 직전에는 다시 투명해진다', () => {
  const h = harness();
  h.v.update(0.016); h.v.update(SPAWN_DELAY_MIN);
  h.v.update(STAY - FADE / 2);
  const op = h.group.children[0].material.opacity;
  assert.ok(op > 0 && op < 1, `페이드아웃 중이어야 한다(지금 ${op})`);
});

test('다가가면 등록된다', () => {
  const h = harness({ player: { x: 0, z: 0 } });
  h.v.update(0.016); h.v.update(SPAWN_DELAY_MIN);
  h.v.update(0.016);
  assert.deepEqual(h.discovered, ['butterfly']);
});

test('멀면 등록되지 않는다', () => {
  const h = harness({ player: { x: 0, z: CATCH_R + 0.5 } });
  h.v.update(0.016); h.v.update(SPAWN_DELAY_MIN);
  h.v.update(0.016);
  assert.deepEqual(h.discovered, []);
});

test('한 마리를 두 번 등록하지 않는다 — 옆에 서 있어도 한 번뿐', () => {
  const h = harness({ player: { x: 0, z: 0 } });
  h.v.update(0.016); h.v.update(SPAWN_DELAY_MIN);
  for (let i = 0; i < 10; i++) h.v.update(0.1);
  assert.deepEqual(h.discovered, ['butterfly'], '프레임마다 등록이 불렸다');
});

test('동시에 2마리를 넘지 않는다', () => {
  const h = harness({ match: VISITORS.slice(0, 3) });   // 세 종이 동시에 가능해도
  for (let i = 0; i < 6; i++) { h.v.update(0.016); h.v.update(SPAWN_DELAY_MAX); }
  assert.ok(h.v.alive.length <= MAX_ALIVE, `${h.v.alive.length}마리가 떴다`);
});

test('같은 종이 둘 뜨지 않는다', () => {
  const h = harness({ match: [VISITORS[0]] });   // 🦋 하나만 가능한데 자리는 많다
  // 뜨고·머물고·떠나는 주기를 여러 번 돌리며 매 순간 중복이 없는지 본다
  for (let i = 0; i < 400; i++) {
    h.v.update(0.2);
    assert.equal(new Set(h.v.alive).size, h.v.alive.length, `같은 종이 겹쳐 떴다: ${h.v.alive}`);
    assert.ok(h.v.alive.length <= 1, `한 종만 가능한데 ${h.v.alive.length}마리가 떴다`);
  }
  assert.ok(h.spawned.length >= 2, '주기가 돌지 않았다 — 테스트가 아무것도 검증하지 못했다');
});

test('조건을 만족하는 종이 없으면 아무것도 안 뜬다', () => {
  const h = harness({ match: [] });
  for (let i = 0; i < 10; i++) h.v.update(SPAWN_DELAY_MAX);
  assert.deepEqual(h.spawned, []);
});

// ⚠️ 후보가 없을 때 타이머를 다시 감지 않으면 매 프레임 밭 전체(최대 120칸)를 훑는다
test('후보가 없어도 매 프레임 밭 전체를 훑지 않는다', () => {
  let scans = 0;
  const h = harness({ match: [], cells: () => { scans++; return [{ x: 0, z: 0 }]; } });
  for (let i = 0; i < 60; i++) h.v.update(0.016);   // 약 1초치 프레임
  assert.ok(scans <= 1, `1초에 ${scans}번 훑었다 — 타이머를 다시 감지 않는다`);
});

test('등록 뒤에도 계속 온다 — 등록은 1회, 방문은 반복', () => {
  const h = harness({ player: { x: 0, z: 0 } });
  h.v.update(0.016); h.v.update(SPAWN_DELAY_MIN);
  h.v.update(STAY);                       // 첫 손님이 떠난다
  assert.deepEqual(h.v.alive, []);
  h.v.update(SPAWN_DELAY_MAX);            // 다시 온다
  assert.equal(h.spawned.length, 2, '한 번 등록하면 다시 안 오면 정원 설계가 의미를 잃는다');
});

test('clear: 텃밭을 나가면 전부 치운다 — farmGroup 이 사라지기 전에 불러야 한다', () => {
  const h = harness();
  h.v.update(0.016); h.v.update(SPAWN_DELAY_MIN);
  h.v.clear();
  assert.deepEqual(h.v.alive, []);
  assert.equal(h.group.children.length, 0);
});

test('group 이 없어도 터지지 않는다 — 퇴장 직후 update 가 한 번 더 들어올 수 있다', () => {
  const v = createVisitors({
    group: null,
    makeMesh: fakeMesh,
    cells: () => [{ x: 0, z: 0 }],
    envAt: () => ({}),
    matchVisitors: () => [VISITORS[0]],
    ctx: () => ({ night: false, rain: false }),
    playerPos: () => ({ x: 999, z: 999 }),
    onSpawn: () => {}, onDiscover: () => {},
    random: () => 0,
  });
  assert.doesNotThrow(() => { v.update(0.016); v.update(SPAWN_DELAY_MIN); v.update(STAY); v.clear(); });
});

// ⚠️⚠️ 실제 사고(2026-09-18): farmGroup 은 position (0,0,84) 를 가진다.
//   월드 좌표를 mesh.position 에 그대로 넣으면 월드 z=168 — 밭에서 84 떨어진 허공에 뜬다.
//   화면에 안 보이는데 근접 판정은 같은 로컬 값을 써서 "등록은 되는" 상태라 놓치기 쉽다.
//   그래서 ① 메시는 **로컬로 변환해** 놓고 ② 근접 판정은 **월드로** 한다.
test('부모 그룹이 오프셋을 가지면 메시 좌표를 로컬로 변환해 놓는다', () => {
  const group = fakeGroup();
  const spawned = [];
  const v = createVisitors({
    group, origin: { x: 0, z: 84 },              // farmGroup 의 월드 오프셋
    makeMesh: () => fakeMesh(),
    cells: () => [{ x: -2, z: 84 }],             // 월드 좌표
    envAt: () => ({}),
    matchVisitors: () => [VISITORS[0]],
    ctx: () => ({ night: false, rain: false }),
    playerPos: () => ({ x: 999, z: 999 }),
    onSpawn: (id) => spawned.push(id), onDiscover: () => {},
    random: () => 0,
  });
  v.update(0.016); v.update(SPAWN_DELAY_MIN);
  assert.deepEqual(spawned, ['butterfly'], '전제: 떴어야 한다');
  const m = group.children[0];
  assert.equal(m.position.x, -2, '로컬 x = 월드 x - origin.x');
  assert.equal(m.position.z, 0, '로컬 z = 월드 z - origin.z (84 - 84)');
});

test('근접 등록은 월드 좌표로 판정한다 — 오프셋 그룹에서도 제대로 잡힌다', () => {
  const discovered = [];
  const v = createVisitors({
    group: fakeGroup(), origin: { x: 0, z: 84 },
    makeMesh: () => fakeMesh(),
    cells: () => [{ x: 0, z: 84 }],
    envAt: () => ({}),
    matchVisitors: () => [VISITORS[0]],
    ctx: () => ({ night: false, rain: false }),
    playerPos: () => ({ x: 0, z: 85 }),          // 월드로 거리 1 — 등록돼야 한다
    onSpawn: () => {}, onDiscover: (id) => discovered.push(id),
    random: () => 0,
  });
  v.update(0.016); v.update(SPAWN_DELAY_MIN); v.update(0.016);
  assert.deepEqual(discovered, ['butterfly'],
    '로컬(0,0) 과 플레이어 월드(0,85) 를 비교하면 거리 85 로 나와 영영 등록되지 않는다');
});

test('origin 이 없으면 월드 = 로컬로 동작한다(하위 호환)', () => {
  const group = fakeGroup();
  const v = createVisitors({
    group,
    makeMesh: () => fakeMesh(),
    cells: () => [{ x: 3, z: 7 }],
    envAt: () => ({}),
    matchVisitors: () => [VISITORS[0]],
    ctx: () => ({ night: false, rain: false }),
    playerPos: () => ({ x: 999, z: 999 }),
    onSpawn: () => {}, onDiscover: () => {},
    random: () => 0,
  });
  v.update(0.016); v.update(SPAWN_DELAY_MIN);
  assert.equal(group.children[0].position.x, 3);
  assert.equal(group.children[0].position.z, 7);
});
