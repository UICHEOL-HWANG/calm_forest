import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  BRANCHES, BRANCH_IDS, TREE_DECOR, TILES, defaultTree, restoreTree, placeDecor, removeDecor, offerBundle,
  habitatDone, habitatMet, bundlesDone, bundleDone, branchRatio, lifePercent, branchUsable, branchGrowth, branchStatus, habitatRows,
} from '../js/world/tree-board.js';
import { defaultUnlocks, unlockedSet } from '../js/world/unlocks.js';
import { TAGS } from '../js/habitat.js';

const RICH = { wood: 999, stone: 999, coal: 999, fish: 999, crop: 999, seed: 999, gem: 9 };
const place = (tree, id, decos, inv = RICH) => {
  let t = tree, events = [];
  decos.forEach((d, i) => { const r = placeDecor(t, id, i, d, inv); assert.ok(r.ok, `${id} ${d} ${r.reason}`); t = r.tree; events.push(...r.events); });
  return { tree: t, events };
};
const fillBundles = (tree, id) => {
  let t = tree, events = [];
  for (const b of BRANCHES.find(x => x.id === id).bundles) { const r = offerBundle(t, id, b.id, RICH); assert.ok(r.ok); t = r.tree; events.push(...r.events); }
  return { tree: t, events };
};
// 가지마다 하한을 넘는 배치 하나
const RECIPE = {
  water: ['pond', 'pond', 'bigtree'],
  farm: ['plot', 'plot', 'plot', 'pond'],
  kitchen: ['plot', 'plot', 'lantern', 'lantern', 'flowers'],
  forest: ['bigtree', 'bigtree', 'flowers', 'hut'],
  snow: ['hut', 'hut', 'lantern', 'lantern'],
  mine: ['lantern', 'lantern', 'hut', 'bigtree'],
};

test('가지 순서: 💧 물이 첫 번째(E3 첫 물고기) → 밭 → 부엌 → 숲 → ❄️ 눈 → ⛏️ 광산', () => {
  assert.deepEqual(BRANCH_IDS, ['water', 'farm', 'kitchen', 'forest', 'snow', 'mine']);
  assert.deepEqual(BRANCHES.map(b => b.npc), ['angler', 'farmer', 'chef', 'forager', 'sledkeeper', 'miner']);
});

test('태그는 js/habitat.js 이름만 · 재료는 실제 가방 키만 · 장식 비용은 🪵🪨⚫ 만', () => {
  const src = readFileSync(new URL('../js/game.js', import.meta.url), 'utf8');
  const invLine = src.slice(src.indexOf('inventory: {'), src.indexOf('playerPos:'));
  const invKeys = new Set([...invLine.matchAll(/(\w+): \d/g)].map(m => m[1]));
  for (const d of TREE_DECOR) {
    for (const t of Object.keys(d.tags)) assert.ok(TAGS.includes(t), t);
    for (const k of Object.keys(d.cost)) assert.ok(['wood', 'stone', 'coal'].includes(k), `${d.id} ${k}`);
  }
  for (const b of BRANCHES) {
    for (const t of Object.keys(b.habitat)) assert.ok(TAGS.includes(t), t);
    for (const bd of b.bundles) for (const k of [...Object.keys(bd.need), ...Object.keys(bd.reward)]) assert.ok(invKeys.has(k), `${bd.id} ${k}`);
  }
});

test('꾸러미 재료는 그 가지가 열릴 때 이미 얻을 수 있는 것만(🍄 채집물·🌟 반딧불이 금지)', () => {
  const START = new Set(['wood', 'stone', 'coal', 'gem', 'fish', 'crop', 'seed']);
  for (const b of BRANCHES) for (const bd of b.bundles) for (const k of Object.keys(bd.need)) assert.ok(START.has(k), `${bd.id}: ${k}`);
});

test('모든 가지는 6칸 안에서 서식지를 맞출 수 있다', () => {
  for (const id of BRANCH_IDS) assert.ok(RECIPE[id].length <= TILES);
  let t = defaultTree();
  for (const id of BRANCH_IDS) { t = place(t, id, RECIPE[id]).tree; assert.ok(habitatDone(t, id), id); }
});

test('기본값: 6칸 비어 있고 플래그 false · 생명력 0', () => {
  const t = defaultTree();
  for (const id of BRANCH_IDS) {
    assert.deepEqual(t.branches[id].tiles, Array(6).fill(null));
    assert.equal(t.branches[id].habitat, false);
    assert.equal(t.branches[id].bundles, false);
  }
  assert.equal(lifePercent(t), 0);
});

test('가지 순서 게이트: 앞 가지 서식지가 완성돼야 다음 판을 쓴다', () => {
  let t = defaultTree();
  assert.equal(branchUsable(t, 'water'), true);
  assert.equal(branchUsable(t, 'farm'), false);
  assert.equal(placeDecor(t, 'farm', 0, 'plot', RICH).reason, 'locked');
  assert.equal(offerBundle(t, 'farm', 'harvest', RICH).reason, 'locked');
  assert.equal(branchStatus(t, 'farm'), 'locked');
  // 꾸러미는 그 가지의 빈터(이웃 귀환)가 먼저 — 순서가 뒤집히지 않게(2026-10-17 사용자 결정)
  assert.equal(offerBundle(t, 'water', 'river', RICH).reason, 'habitat');
  t = place(t, 'water', RECIPE.water).tree;
  assert.equal(branchUsable(t, 'farm'), true);
  assert.equal(branchUsable(t, 'kitchen'), false);
  t = place(t, 'farm', RECIPE.farm).tree;
  assert.equal(branchUsable(t, 'kitchen'), true);
  assert.equal(branchUsable(t, 'nope'), false);
});

test('placeDecor: 빈칸·아는 장식·재료 확인, 상태를 고치지 않는다', () => {
  const t = defaultTree();
  const snap = JSON.stringify(t);
  assert.equal(placeDecor(t, 'water', 6, 'pond', RICH).reason, 'tile');
  assert.equal(placeDecor(t, 'water', -1, 'pond', RICH).reason, 'tile');
  assert.equal(placeDecor(t, 'water', 0, 'castle', RICH).reason, 'decor');
  assert.equal(placeDecor(t, 'water', 0, 'pond', { stone: 2 }).reason, 'afford');
  assert.equal(placeDecor(t, 'lava', 0, 'pond', RICH).reason, 'branch');
  const r = placeDecor(t, 'water', 0, 'pond', { stone: 3 });
  assert.ok(r.ok);
  assert.deepEqual(r.cost, { stone: 3 });
  assert.equal(r.tree.branches.water.tiles[0], 'pond');
  assert.equal(placeDecor(r.tree, 'water', 0, 'bigtree', RICH).reason, 'taken');
  assert.equal(JSON.stringify(t), snap, '원본 그대로');
});

test('서식지 완성 이벤트는 한 번 · 장식을 빼도 플래그는 유지(이웃이 다시 안 떠난다)', () => {
  let t = defaultTree();
  let r = placeDecor(t, 'water', 0, 'pond', RICH); t = r.tree; assert.deepEqual(r.events, []);
  r = placeDecor(t, 'water', 1, 'pond', RICH); t = r.tree; assert.deepEqual(r.events, []);
  assert.deepEqual(habitatRows(t, 'water'), [{ tag: 'damp', have: 6, need: 6, ok: true }, { tag: 'shade', have: 0, need: 2, ok: false }]);
  r = placeDecor(t, 'water', 2, 'bigtree', RICH); t = r.tree;
  assert.deepEqual(r.events, [{ type: 'habitat', branch: 'water' }]);
  r = placeDecor(t, 'water', 3, 'flowers', RICH); assert.deepEqual(r.events, [], '두 번 안 뜬다');
  const rm = removeDecor(t, 'water', 0);
  assert.ok(rm.ok);
  assert.deepEqual(rm.refund, { stone: 3 });
  assert.equal(rm.tree.branches.water.tiles[0], null);
  assert.equal(habitatMet(rm.tree, 'water'), false);
  assert.equal(habitatDone(rm.tree, 'water'), true, '단조');
  assert.ok(unlockedSet({ unlocks: defaultUnlocks(), tree: rm.tree }).has('angler'));
  assert.equal(removeDecor(rm.tree, 'water', 0).reason, 'tile', '빈칸은 못 뺀다');
});

test('offerBundle: 가방에 있는 만큼만, 필요량을 넘지 않게', () => {
  let t = place(defaultTree(), 'water', RECIPE.water).tree;   // 빈터 먼저
  let r = offerBundle(t, 'water', 'river', { fish: 3, stone: 0 });
  assert.ok(r.ok);
  assert.deepEqual(r.take, { fish: 3 });
  assert.deepEqual(r.events, []);
  t = r.tree;
  assert.equal(offerBundle(t, 'water', 'river', { fish: 0, stone: 0 }).reason, 'empty');
  r = offerBundle(t, 'water', 'river', { fish: 50, stone: 50 });
  assert.deepEqual(r.take, { fish: 2, stone: 5 });
  assert.deepEqual(r.events, [{ type: 'bundle', branch: 'water', bundle: 'river', reward: { coins: 30 } }]);
  t = r.tree;
  assert.ok(bundleDone(t, 'water', 'river'));
  assert.equal(bundlesDone(t, 'water'), false);
  assert.equal(offerBundle(t, 'water', 'river', RICH).reason, 'full');
  assert.equal(offerBundle(t, 'water', 'nope', RICH).reason, 'bundle');
  r = offerBundle(t, 'water', 'ferry', RICH);
  assert.deepEqual(r.events.map(e => e.type), ['bundle', 'bundles']);
  assert.ok(bundlesDone(r.tree, 'water'));
  const o = unlockedSet({ unlocks: defaultUnlocks(), tree: r.tree });
  assert.ok(o.has('ferryman') && o.has('sea'), '나루터 꾸러미 → 🦆 사공·🌊 바다');
  assert.ok(o.has('angler'), '빈터를 먼저 끝냈으니 🎣 낚시꾼은 이미 돌아와 있다');
});

test('branchRatio · lifePercent · branchGrowth', () => {
  let t = defaultTree();
  t = placeDecor(t, 'water', 0, 'pond', RICH).tree;           // damp 3/6, shade 0/2 → 0.25
  assert.deepEqual(branchRatio(t, 'water'), { habitat: 0.25, bundles: 0 });
  assert.deepEqual(branchGrowth(t, 'water'), { leaves: 0, bloom: false });
  t = placeDecor(t, 'water', 1, 'pond', RICH).tree;
  t = placeDecor(t, 'water', 2, 'bigtree', RICH).tree;        // 빈터 완성 → 꾸러미를 바칠 수 있다
  assert.deepEqual(branchRatio(t, 'water'), { habitat: 1, bundles: 0 });
  t = offerBundle(t, 'water', 'river', { fish: 5 }).tree;     // 5/10 → 0.5 · ferry 0 → 평균 0.25
  assert.deepEqual(branchRatio(t, 'water'), { habitat: 1, bundles: 0.25 });
  assert.equal(lifePercent(t), Math.round(((1 + 0.25) / 2 / BRANCH_IDS.length) * 100));
  assert.deepEqual(branchGrowth(t, 'water'), { leaves: 0.55, bloom: false });
  // 전부 채우면 100
  let full = defaultTree();
  for (const id of BRANCH_IDS) { full = place(full, id, RECIPE[id]).tree; full = fillBundles(full, id).tree; }
  assert.equal(lifePercent(full), 100);
  for (const id of BRANCH_IDS) {
    assert.deepEqual(branchGrowth(full, id), { leaves: 1, bloom: true });
    assert.equal(branchStatus(full, id), 'bloom');
  }
});

test('restoreTree: 모르는 가지·장식·꾸러미·재료는 버리고 개수는 0~필요량 정수', () => {
  for (const v of [undefined, null, 0, 'x', [], {}, { branches: [] }]) assert.deepEqual(restoreTree(v), defaultTree());
  const saved = {
    v: 1,
    branches: {
      water: { tiles: ['pond', 'castle', 'pond', 'bigtree', null], given: { river: { fish: 99, stone: 2.5, gem: 3 }, junk: { wood: 1 } }, habitat: 'yes', bundles: 1 },
      lava: { tiles: ['pond'] },
      farm: { tiles: 'x', given: [], habitat: true },
    },
  };
  const t = restoreTree(saved);
  assert.deepEqual(Object.keys(t.branches), BRANCH_IDS);
  assert.deepEqual(t.branches.water.tiles, ['pond', null, 'pond', 'bigtree', null, null]);
  assert.deepEqual(t.branches.water.given, { river: { fish: 5 }, ferry: {} });
  assert.equal(t.branches.water.habitat, true, '칸이 하한을 넘으면 true');
  assert.equal(t.branches.water.bundles, false, "'1' 같은 값은 무시");
  assert.equal(t.branches.farm.habitat, true, '저장된 true 는 유지(단조)');
  assert.deepEqual(t.branches.farm.tiles, Array(6).fill(null));
  assert.equal(JSON.stringify(restoreTree(JSON.parse(JSON.stringify(t)))), JSON.stringify(t), '왕복');
});

test('game.js: 세이브 필드 + 복원 줄(firstDay·mountain 인접 줄을 깨지 않는다)', () => {
  const src = readFileSync(new URL('../js/game.js', import.meta.url), 'utf8');
  assert.match(src, /tree: defaultTree\(\),/);
  assert.match(src, /gameState\.tree = restoreTree\(saved\.tree\);/);
  assert.match(src, /gameState\.firstDay = resolveFirstDay\(saved\.firstDay\);\n\s*gameState\.mountain = restoreMountain\(saved\.mountain\);/);
});
