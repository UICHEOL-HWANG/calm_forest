import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GOALS, tutGoal, minerGoal, edgeAnchor, onScreen, detourPoint, freshBranchTab, guideEventParams, rearmMerchant } from '../js/guide/guide-rules.js';

test('튜토리얼 단계마다 목적지를 하나만 고르고 집 바닥은 실험에 맡긴다', () => {
  assert.deepEqual(tutGoal('chop', { wood: 0 }), { key: 'tree', cine: true });
  assert.deepEqual(tutGoal('sell', { wood: 2 }), { key: 'tree', cine: false });
  assert.equal(tutGoal('sell', { wood: 5 }), null);
  assert.deepEqual(tutGoal('mine', { wood: 0 }), { key: 'cave', cine: true });
  assert.equal(tutGoal('house1', { wood: 15 }), null);
  assert.deepEqual(tutGoal('house2', {}), { key: 'wall', cine: true });
  assert.deepEqual(tutGoal('harvest', {}), { key: 'farm', cine: true });
  assert.deepEqual(tutGoal('build', {}), { key: 'roof', cine: true });
  assert.deepEqual(tutGoal('dress', {}), { key: 'cosShop', cine: true });
  assert.deepEqual(tutGoal('bridge', {}), { key: 'bridge', cine: true });
  assert.deepEqual(tutGoal('curator', {}), { key: 'museum', cine: true });
  assert.equal(tutGoal('move', {}), null);
  assert.equal(tutGoal('done', {}), null);
});

test('목적지 문구는 하기 말투이고 엠대시와 놀다가 없다', () => {
  for (const g of Object.values(GOALS)) {
    assert.ok(g.title && g.label && g.ico);
    assert.ok(!/[—–]/.test(g.title + g.label));
    assert.ok(!/놀/.test(g.title + g.label));
  }
  assert.equal(GOALS.cave.title, '⛏️ 동굴 탐험하기');
  assert.equal(GOALS.farmBranch.title, '🌾 밭의 가지 살리기');
  assert.equal(GOALS.museum.title, '🧑‍🦳 할아버지 만나기');
});

test('광부 의뢰는 석탄 → 광부 → 승강기 순서로 이어진다', () => {
  assert.equal(minerGoal({ started: false, stage: 0 }, { coal: 0 }), null);
  assert.deepEqual(minerGoal({ started: true, stage: 0 }, { coal: 1 }), { key: 'coal', cine: true });
  assert.deepEqual(minerGoal({ started: true, stage: 0 }, { coal: 3 }), { key: 'miner', cine: false });
  assert.deepEqual(minerGoal({ started: true, stage: 1, maxFloor: 0 }, {}), { key: 'lift', cine: true });
  assert.equal(minerGoal({ started: true, stage: 1, maxFloor: 1 }, {}), null);
  assert.equal(minerGoal({ started: true, stage: 2, maxFloor: 0 }, {}), null);
});

test('화면 안 판정은 여백을 둔다', () => {
  assert.equal(onScreen({ x: 100, y: 200 }, 400, 800, 40), true);
  assert.equal(onScreen({ x: 10, y: 200 }, 400, 800, 40), false);
  assert.equal(onScreen(null, 400, 800, 40), false);
});

test('가장자리 화살표는 방향을 따라 화면 테두리 안쪽에 선다', () => {
  const left = edgeAnchor({ x: 200, y: 400 }, { x: -900, y: 400 }, 400, 800, 60);
  assert.equal(Math.round(left.x), 60);
  assert.equal(Math.round(left.y), 400);
  assert.ok(Math.abs(Math.abs(left.ang) - Math.PI) < 1e-6);
  const up = edgeAnchor({ x: 200, y: 400 }, { x: 200, y: -3000 }, 400, 800, 60);
  assert.equal(Math.round(up.y), 60);
  const corner = edgeAnchor({ x: 200, y: 400 }, { x: 5000, y: 5000 }, 400, 800, 60);
  assert.ok(corner.x <= 340 && corner.y <= 740 && corner.x >= 60 && corner.y >= 60);
});

test('곧은 길을 막는 건물이 있으면 옆으로 돌아가는 경유점을 준다', () => {
  const from = { x: 0, z: 0 }, to = { x: 10, z: 0 };
  assert.deepEqual(detourPoint(from, to, []), to);
  const wp = detourPoint(from, to, [{ x: 5, z: 0.3, r: 2 }]);
  assert.ok(Math.abs(wp.z) >= 2, JSON.stringify(wp));
  assert.ok(wp.x > 3 && wp.x < 7);
  const box = detourPoint(from, to, [{ x1: 4, z1: -1, x2: 6, z2: 3 }]);
  assert.ok(box.z < -1, JSON.stringify(box));
  assert.deepEqual(detourPoint(from, to, [{ x: 10, z: 0, r: 1.5 }]), to);
  assert.deepEqual(detourPoint(from, to, [{ x: 5, z: 6, r: 2 }]), to);
  assert.deepEqual(detourPoint(from, to, [{ x: 5, z: 0, r: 2, off: true }]), to);
});

test('판은 막 열린 가지(빈터 미완성) 탭으로 연다', () => {
  const ids = ['water', 'farm', 'kitchen'];
  const usable = { water: true, farm: true, kitchen: false };
  const hab = { water: true, farm: false, kitchen: false };
  const bloom = { water: false, farm: false, kitchen: false };
  const pick = () => freshBranchTab(ids, id => usable[id], id => hab[id], id => bloom[id]);
  assert.equal(pick(), 'farm');
  hab.farm = true;
  assert.equal(pick(), 'water');
  bloom.water = true;
  assert.equal(pick(), 'farm');
  bloom.farm = true;
  assert.equal(pick(), null);
});

test('guide_step 파라미터는 5개 이하 키값이다', () => {
  assert.deepEqual(guideEventParams('tut', 'cave', 'cine_skip', { step: 'mine' }), { flow: 'tut', goal: 'cave', act: 'cine_skip', step: 'mine' });
  const p = guideEventParams('tree', 'farmBranch', 'arrive', { step: 'farm', dist: 12.4, extra: 1 });
  assert.ok(Object.keys(p).length <= 5);
  assert.equal(p.dist, 12);
  assert.equal(p.extra, undefined);
});

test('상인 맞이 단계에서 제안창을 못 본 세이브는 상인이 다시 오게 한다', () => {
  assert.deepEqual(rearmMerchant({ tutStep: 'sell', merchantVisit: true, merchantArrived: true }), { tutStep: 'sell', merchantVisit: false, merchantArrived: true });
  const met = { tutStep: 'sell', merchantVisit: true, merchantMet: true };
  assert.equal(rearmMerchant(met), met);
  const later = { tutStep: 'mine', merchantVisit: true };
  assert.equal(rearmMerchant(later), later);
});

test('도착 반경은 그 목적지의 상호작용 거리보다 작다', async () => {
  const { ARRIVE } = await import('../js/guide/guide-rules.js');
  const INTERACT = {
    tree: 2.6, stone: 2.4, coal: 2.4,
    cave: 2.0, farm: 2.0,
    miner: 1.8, lift: 2.0,
    farmBranch: 2.4 + 2.3,
    wall: 3.2, roof: 3.2,
    cosShop: 2.8, bridge: 2.2, museum: 2.4,
    exit: 1.7,
  };
  for (const key of Object.keys(GOALS)) {
    assert.ok(Number.isFinite(ARRIVE[key]), key);
    assert.ok(ARRIVE[key] <= INTERACT[key] - 0.15, `${key} ${ARRIVE[key]} vs ${INTERACT[key]}`);
  }
});

test('마을 목적지인데 다른 공간 안이면 그 공간의 나가는 문부터 가리킨다', async () => {
  const { exitFirst } = await import('../js/guide/guide-rules.js');
  const door = { x: 0, z: 10 };
  const tree = { at: { x: 5, z: 5 }, g: GOALS.tree };
  assert.equal(exitFirst('tree', tree, { exitAt: door }), tree);
  const out = exitFirst('tree', null, { exitAt: door });
  assert.equal(out.exit, true);
  assert.equal(out.key, 'exit');
  assert.deepEqual(out.at, door);
  assert.equal(out.g.title, '🚪 마을로 나가기');
  assert.equal(exitFirst('tree', null, { exitAt: null }), null);
  assert.equal(exitFirst('farm', null, { inSpaceFor: true, exitAt: door }), null);
  assert.equal(exitFirst('coal', null, { exitAt: door }), null);
  assert.equal(exitFirst('lift', null, { exitAt: door }), null);
});

test('이야기 안내 목적지도 도착 반경이 상호작용 거리보다 작다', async () => {
  const { ARRIVE, VILLAGE_KEYS } = await import('../js/guide/guide-rules.js');
  const INTERACT = { story_worldTree: 2.4 + 2.3, story_cafeDoor: 2.2, story_cafeGuest: 2.4 };
  for (const [k, r] of Object.entries(INTERACT)) assert.ok(ARRIVE[k] <= r - 0.15, `${k} ${ARRIVE[k]} vs ${r}`);
  assert.ok(VILLAGE_KEYS.has('story_worldTree') && VILLAGE_KEYS.has('story_cafeDoor') && !VILLAGE_KEYS.has('story_cafeGuest'));
});

test('문이 건물 바로 뒤에 있으면 건물을 돌아가는 경유점을 준다', () => {
  const box = { x1: 1.4, z1: 10.8, x2: 6.6, z2: 14.8 };
  const wp = detourPoint({ x: 4, z: 6 }, { x: 4, z: 15.3 }, [box]);
  assert.ok(wp.x < 1.4 || wp.x > 6.6, JSON.stringify(wp));
  assert.deepEqual(detourPoint({ x: 4, z: 6 }, { x: 4, z: 12 }, [box]), { x: 4, z: 12 });
});

test('경유점을 따라 걸으면 건물을 뚫지 않고 몇 걸음 안에 문에 닿는다', () => {
  const box = { x1: 1.4, z1: 10.8, x2: 6.6, z2: 14.8 };
  const door = { x: 4, z: 15.3 };
  const crosses = (a, b) => {
    for (let i = 1; i < 50; i++) {
      const x = a.x + (b.x - a.x) * i / 50, z = a.z + (b.z - a.z) * i / 50;
      if (x > box.x1 && x < box.x2 && z > box.z1 && z < box.z2) return true;
    }
    return false;
  };
  let at = { x: 4, z: 6 }, hops = 0;
  while (Math.hypot(at.x - door.x, at.z - door.z) > 1e-6 && hops < 5) {
    const wp = detourPoint(at, door, [box]);
    assert.ok(!crosses(at, wp), `${JSON.stringify(at)} → ${JSON.stringify(wp)}`);
    at = wp; hops++;
  }
  assert.ok(hops <= 3, `hops ${hops}`);
});
