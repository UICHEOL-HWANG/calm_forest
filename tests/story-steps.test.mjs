import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultTree, placeDecor } from '../js/world/tree-board.js';
import { storyStep, shortfall, shortText, STORY_GUIDE_RULES } from '../js/guide/story-steps.js';

const withHabitat = (tree, id, decos) => decos.reduce((t, d, i) => placeDecor(t, id, i, d, { wood: 99, stone: 99, coal: 99 }).tree, tree);
const waterDone = () => withHabitat(defaultTree(), 'water', ['pond', 'pond', 'bigtree']);
const farmDone = (t) => withHabitat(t, 'farm', ['plot', 'plot', 'plot', 'pond']);
const kitchenDone = (t) => withHabitat(t, 'kitchen', ['plot', 'plot', 'lantern', 'lantern', 'flowers']);

test('모자란 재료만 골라 얼마나 더 필요한지 센다', () => {
  assert.deepEqual(shortfall({ stone: 3, wood: 1 }, { stone: 1, wood: 5 }), [{ k: 'stone', need: 3, have: 1, more: 2 }]);
  assert.deepEqual(shortfall({ stone: 3 }, { stone: 3 }), []);
  assert.equal(shortText([{ k: 'stone', need: 3, have: 0, more: 3 }]), '🪨 3개 더 필요 · 동굴에서');
  assert.equal(shortText([{ k: 'wood', need: 6, have: 4, more: 2 }, { k: 'coal', need: 1, have: 0, more: 1 }]), '🪵 2개 · ⚫ 1개 더 필요 · 나무에서');
  assert.equal(shortText([]), '');
});

test('안내하는 장은 2장 물의 가지와 3장 첫 요리뿐이다', () => {
  assert.deepEqual([...STORY_GUIDE_RULES], ['branchWater', 'tasteGated']);
  assert.equal(storyStep({ rule: 'homeBridge', tree: defaultTree(), inv: {} }), null);
  assert.equal(storyStep({ rule: 'friends', tree: defaultTree(), inv: {} }), null);
  assert.equal(storyStep(null), null);
});

test('2장: 판을 안 열었으면 세계수로 간다', () => {
  const s = storyStep({ rule: 'branchWater', tree: defaultTree(), inv: {}, boardOpen: false });
  assert.equal(s.where, 'worldTree');
  assert.equal(s.key, 'water_tree');
  assert.equal(s.title, '🌳 세계수 살펴보기');
});

test('2장: 판을 열었는데 다른 탭이면 물의 가지 탭을 가리킨다', () => {
  const s = storyStep({ rule: 'branchWater', tree: defaultTree(), inv: {}, boardOpen: true, boardTab: 'farm' });
  assert.equal(s.where, 'board');
  assert.equal(s.target, 'tab');
  assert.equal(s.tab, 'water');
  assert.equal(s.key, 'water_tab');
});

test('2장: 물의 가지 탭이면 추천 장식을 가리키고 모자라면 부족 줄을 단다', () => {
  const s = storyStep({ rule: 'branchWater', tree: defaultTree(), inv: { stone: 1, wood: 0 }, boardOpen: true, boardTab: 'water' });
  assert.equal(s.target, 'deco');
  assert.equal(s.deco, 'pond');
  assert.equal(s.key, 'water_place');
  assert.equal(s.short, '🪨 2개 더 필요 · 동굴에서');
  assert.deepEqual(s.shortList, [{ k: 'stone', need: 3, have: 1, more: 2 }]);
  const ok = storyStep({ rule: 'branchWater', tree: defaultTree(), inv: { stone: 9, wood: 9 }, boardOpen: true, boardTab: 'water' });
  assert.equal(ok.short, null);
  assert.match(ok.doNow, /눌러서 빈 칸에 놓아요/);
});

test('2장: 빈 칸이 모자라 추천이 없으면 칸을 비우라고 한다', () => {
  const full = withHabitat(defaultTree(), 'water', ['plot', 'plot', 'plot', 'plot', 'plot', 'plot']);
  const s = storyStep({ rule: 'branchWater', tree: full, inv: {}, boardOpen: true, boardTab: 'water' });
  assert.equal(s.target, 'tiles');
  assert.equal(s.key, 'water_clear');
});

test('2장: 물의 가지를 완성하면 안내가 끝난다', () => {
  assert.equal(storyStep({ rule: 'branchWater', tree: waterDone(), inv: {} }), null);
});

test('3장: 밭 가지 → 부엌 가지 순서로 안내한다', () => {
  const t1 = waterDone();
  assert.equal(storyStep({ rule: 'tasteGated', tree: t1, inv: {}, boardOpen: true, boardTab: 'water' }).key, 'farm_tab');
  const t2 = farmDone(t1);
  assert.equal(storyStep({ rule: 'tasteGated', tree: t2, inv: {}, boardOpen: false }).key, 'kitchen_tree');
  const k = storyStep({ rule: 'tasteGated', tree: t2, inv: { wood: 9, stone: 9, coal: 0 }, boardOpen: true, boardTab: 'kitchen' });
  assert.equal(k.target, 'deco');
});

test('3장: 부엌 가지 뒤에는 카페로, 카페 안에선 만들 수 있는 손님으로', () => {
  const t = kitchenDone(farmDone(waterDone()));
  const out = storyStep({ rule: 'tasteGated', tree: t, inv: {}, atCafe: false, cooked: 0, served: 0 });
  assert.equal(out.where, 'cafeDoor');
  assert.equal(out.key, 'cafe_door');
  const orders = [
    { i: 0, done: false, recipe: { ico: '🍞', name: '빵', cost: { flour: 2 } } },
    { i: 1, done: false, recipe: { ico: '🍙', name: '주먹밥', cost: { crop: 2 } } },
  ];
  const inside = storyStep({ rule: 'tasteGated', tree: t, inv: { crop: 3 }, atCafe: true, orders, cooked: 0, served: 0 });
  assert.equal(inside.where, 'cafeGuest');
  assert.equal(inside.guest, 1);
  assert.equal(inside.key, 'cafe_guest');
  assert.equal(inside.short, null);
});

test('3장: 만들 수 있는 주문이 없으면 가장 덜 모자란 손님과 부족 줄', () => {
  const t = kitchenDone(farmDone(waterDone()));
  const orders = [
    { i: 0, done: false, recipe: { ico: '🍲', name: '채소죽', cost: { crop: 3 } } },
    { i: 1, done: false, recipe: { ico: '🐟', name: '생선구이', cost: { fish: 2 } } },
    { i: 2, done: true, recipe: { ico: '🍙', name: '주먹밥', cost: { crop: 2 } } },
  ];
  const s = storyStep({ rule: 'tasteGated', tree: t, inv: { crop: 2 }, atCafe: true, orders, cooked: 0, served: 0 });
  assert.equal(s.guest, 0);
  assert.equal(s.key, 'cafe_short');
  assert.equal(s.short, '🥕 1개 더 필요 · 텃밭에서');
});

test('3장: 요리와 서빙을 마치면 끝', () => {
  const t = kitchenDone(farmDone(waterDone()));
  assert.equal(storyStep({ rule: 'tasteGated', tree: t, inv: {}, atCafe: true, orders: [], cooked: 1, served: 1 }), null);
});

test('안내 문구에 엠대시와 놀다가 없다', () => {
  const t = waterDone();
  const snaps = [
    { rule: 'branchWater', tree: defaultTree(), inv: {}, boardOpen: false },
    { rule: 'branchWater', tree: defaultTree(), inv: {}, boardOpen: true, boardTab: 'farm' },
    { rule: 'branchWater', tree: defaultTree(), inv: {}, boardOpen: true, boardTab: 'water' },
    { rule: 'tasteGated', tree: kitchenDone(farmDone(t)), inv: {}, atCafe: false, cooked: 0, served: 0 },
  ];
  for (const s of snaps) {
    const st = storyStep(s);
    const text = `${st.title} ${st.doNow} ${st.short || ''}`;
    assert.ok(!/[—–]/.test(text) && !/놀/.test(text), text);
  }
});
