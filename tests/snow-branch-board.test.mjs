import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BRANCHES, BRANCH_IDS, TREE_DECOR, defaultTree, placeDecor, habitatDone, branchUsable, restoreTree } from '../js/world/tree-board.js';

const RICH = { wood: 999, stone: 999, coal: 999, fish: 999, crop: 999, seed: 999, gem: 9 };
const place = (tree, id, decos) => decos.reduce((t, d, i) => { const r = placeDecor(t, id, i, d, RICH); assert.ok(r.ok, `${id} ${d} ${r.reason}`); return r.tree; }, tree);
const UP_TO_FOREST = { water: ['pond', 'pond', 'bigtree'], farm: ['plot', 'plot', 'plot', 'pond'], kitchen: ['plot', 'plot', 'lantern', 'lantern', 'flowers'], forest: ['bigtree', 'bigtree', 'flowers', 'hut'] };
const forestDone = () => Object.entries(UP_TO_FOREST).reduce((t, [id, d]) => place(t, id, d), defaultTree());

test('눈의 가지는 숲 다음에 보이고 썰매지기가 이웃이다', () => {
  assert.deepEqual(BRANCH_IDS, ['water', 'farm', 'kitchen', 'forest', 'snow', 'mine']);
  const snow = BRANCHES.find(b => b.id === 'snow');
  assert.equal(snow.npc, 'sledkeeper');
  assert.equal(snow.after, 'forest');
  assert.equal(BRANCHES.find(b => b.id === 'mine').after, 'forest');
  assert.ok(snow.lead.todo && snow.lead.done);
});

test('숲을 마치면 눈과 광산이 둘 다 열리고 광산은 눈을 기다리지 않는다', () => {
  const t = forestDone();
  assert.equal(branchUsable(t, 'snow'), true);
  assert.equal(branchUsable(t, 'mine'), true);
  assert.equal(branchUsable(defaultTree(), 'snow'), false);
});

test('기존 장식만으로 6칸 안에서 눈의 가지 빈터를 채운다', () => {
  const t = place(forestDone(), 'snow', ['hut', 'hut', 'lantern', 'lantern']);
  assert.equal(habitatDone(t, 'snow'), true);
});

test('☃️ 눈사람은 눈의 가지 꽃 장식이다', () => {
  const d = TREE_DECOR.find(x => x.id === 'snowman');
  assert.equal(d.bloom, 'snow');
  for (const k of Object.keys(d.cost)) assert.ok(['wood', 'stone', 'coal'].includes(k));
});

test('restoreTree 가 눈의 가지 진행을 보존한다', () => {
  const t = place(forestDone(), 'snow', ['hut', 'hut', 'lantern', 'lantern']);
  const back = restoreTree(JSON.parse(JSON.stringify(t)));
  assert.equal(back.branches.snow.habitat, true);
  assert.deepEqual(back.branches.snow.tiles.slice(0, 4), ['hut', 'hut', 'lantern', 'lantern']);
});
