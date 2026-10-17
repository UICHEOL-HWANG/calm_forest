import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BRANCHES, BRANCH_IDS, TREE_DECOR, defaultTree, placeDecor, offerBundle } from '../js/world/tree-board.js';
import { TAGS } from '../js/habitat.js';
import {
  STAGES, CARE_NEEDS, CARE_DAYS, GUESTS, GUEST_COUNT, BLOOM_DECOR, BLOOM_REWARD,
  defaultBloom, restoreBloom, careNeed, careToday, offerStage, guestFor, observeGuest,
  bloomRows, decorLocked, growthOf, lifeOf,
} from '../js/world/tree-bloom.js';

const DAY = { night: false, rain: false };
const NIGHT = { night: true, rain: false };
const RICH = { wood: 999, stone: 999, coal: 999, fish: 999, crop: 999, seed: 999, gem: 99, forage: 999, charcoal: 99, brick: 99 };

function treeWith(id, decos, { bundles = false } = {}) {
  let tree = defaultTree();
  for (const bid of BRANCH_IDS) {
    if (bid === id) break;
    for (const [i, d] of ['pond', 'pond', 'bigtree', 'plot', 'plot', 'plot'].entries()) {
      const r = placeDecor(tree, bid, i, d, RICH);
      if (r.ok) tree = r.tree;
    }
  }
  decos.forEach((d, i) => { const r = placeDecor(tree, id, i, d, RICH); assert.ok(r.ok, `${id} ${d}`); tree = r.tree; });
  if (bundles) for (const bd of BRANCHES.find(b => b.id === id).bundles) tree = offerBundle(tree, id, bd.id, RICH).tree;
  return tree;
}
const waterHab = () => treeWith('water', ['pond', 'pond', 'bigtree']);
const waterFull = () => treeWith('water', ['pond', 'pond', 'bigtree'], { bundles: true });

test('표: 가지마다 단계 3개·돌보기 2종·손님 5종(낮 3·밤 2)·꽃 장식 1개', () => {
  const invSrc = readFileSync(new URL('../js/game.js', import.meta.url), 'utf8');
  const invLine = invSrc.slice(invSrc.indexOf('inventory: {'), invSrc.indexOf('playerPos:'));
  const invKeys = new Set([...invLine.matchAll(/(\w+): \d/g)].map(m => m[1]));
  for (const id of BRANCH_IDS) {
    assert.equal(STAGES[id].length, 3, id);
    for (const s of STAGES[id]) for (const k of [...Object.keys(s.need), ...Object.keys(s.reward)]) assert.ok(invKeys.has(k), `${id} ${k}`);
    assert.equal(CARE_NEEDS[id].length, 2, id);
    for (const n of CARE_NEEDS[id]) for (const k of Object.keys(n)) assert.ok(invKeys.has(k), `${id} care ${k}`);
    const gs = GUESTS[id];
    assert.equal(gs.length, GUEST_COUNT);
    assert.equal(gs.filter(g => g.when === 'day').length, 3, id);
    assert.equal(gs.filter(g => g.when === 'night').length, 2, id);
    for (const g of gs) for (const t of Object.keys(g.need)) assert.ok(TAGS.includes(t), `${g.id} ${t}`);
    const deco = TREE_DECOR.find(d => d.id === BLOOM_DECOR[id]);
    assert.ok(deco, `${id} bloom decor`);
    assert.equal(deco.bloom, id);
  }
  const ids = Object.values(GUESTS).flat().map(g => g.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.deepEqual(Object.keys(BLOOM_REWARD), ['gem']);
});

test('코인을 새로 주지 않는다(경제 가드레일)', () => {
  for (const id of BRANCH_IDS) for (const s of STAGES[id]) assert.ok(!('coins' in s.reward), id);
  assert.ok(!('coins' in BLOOM_REWARD));
});

test('손님 조건은 6칸 안에서 채울 수 있다(꽃 장식 없이)', () => {
  const base = TREE_DECOR.filter(d => !d.bloom);
  const best = (need) => {
    let left = 6;
    const env = {};
    for (const [t, n] of Object.entries(need)) {
      const d = base.filter(x => x.tags[t]).sort((a, b) => b.tags[t] - a.tags[t])[0];
      while ((env[t] || 0) < n && left > 0) { for (const [k, v] of Object.entries(d.tags)) env[k] = (env[k] || 0) + v; left--; }
    }
    return Object.entries(need).every(([t, n]) => (env[t] || 0) >= n);
  };
  for (const g of Object.values(GUESTS).flat()) assert.ok(best(g.need), g.id);
});

test('restoreBloom: 옛 세이브·깨진 값은 빈 상태, 모르는 손님·가지는 버린다', () => {
  assert.deepEqual(restoreBloom(undefined), defaultBloom());
  assert.deepEqual(restoreBloom('x'), defaultBloom());
  const known = GUESTS.water[0].id;
  const r = restoreBloom({ branches: { water: { stage: 9, given: { fish: 5, zzz: 3 }, care: { days: 99, last: '2026-10-17' }, seen: { [known]: true, nope: true }, slots: { day: '2026-10-17' }, bloomed: 'yes' }, lava: {} } });
  assert.equal(r.branches.water.stage, 3);
  assert.deepEqual(r.branches.water.given, {});
  assert.equal(r.branches.water.care.days, CARE_DAYS);
  assert.equal(r.branches.water.care.last, '2026-10-17');
  assert.deepEqual(Object.keys(r.branches.water.seen), [known]);
  assert.equal(r.branches.water.slots.day, '2026-10-17');
  assert.equal(r.branches.water.bloomed, false);
  assert.ok(!r.branches.lava);
});

test('careNeed: 날짜·가지마다 정해지고 2종 중 하나', () => {
  for (const id of BRANCH_IDS) {
    const a = careNeed(id, '2026-10-17'), b = careNeed(id, '2026-10-17');
    assert.deepEqual(a, b);
    assert.ok(CARE_NEEDS[id].some(n => JSON.stringify(n) === JSON.stringify(a)));
  }
  const seen = new Set();
  for (let d = 1; d <= 20; d++) seen.add(JSON.stringify(careNeed('water', `2026-10-${String(d).padStart(2, '0')}`)));
  assert.equal(seen.size, 2);
});

test('careToday: 빈터 전엔 막힘, 하루 한 번, 재료를 통째로 낸다, 7일이면 끝', () => {
  let bloom = defaultBloom();
  assert.equal(careToday(bloom, defaultTree(), 'water', '2026-10-17', RICH).reason, 'habitat');
  const tree = waterHab();
  assert.equal(careToday(bloom, tree, 'water', '2026-10-17', {}).reason, 'afford');
  const r = careToday(bloom, tree, 'water', '2026-10-17', RICH);
  assert.ok(r.ok);
  assert.deepEqual(r.take, careNeed('water', '2026-10-17'));
  assert.equal(r.bloom.branches.water.care.days, 1);
  assert.equal(bloom.branches.water.care.days, 0);
  assert.equal(careToday(r.bloom, tree, 'water', '2026-10-17', RICH).reason, 'done');
  bloom = r.bloom;
  for (let d = 18; d <= 23; d++) bloom = careToday(bloom, tree, 'water', `2026-10-${d}`, RICH).bloom;
  assert.equal(bloom.branches.water.care.days, CARE_DAYS);
  assert.equal(careToday(bloom, tree, 'water', '2026-10-30', RICH).reason, 'complete');
});

test('offerStage: 기존 꾸러미 전엔 막힘, 나눠 바치기, 단계마다 보상 이벤트', () => {
  const bloom0 = defaultBloom();
  assert.equal(offerStage(bloom0, waterHab(), 'water', RICH).reason, 'bundles');
  const tree = waterFull();
  const [k] = Object.keys(STAGES.water[0].need);
  const part = offerStage(bloom0, tree, 'water', { [k]: 1 });
  assert.ok(part.ok);
  assert.deepEqual(part.take, { [k]: 1 });
  assert.equal(part.bloom.branches.water.stage, 0);
  assert.equal(part.events.length, 0);
  const full = offerStage(part.bloom, tree, 'water', RICH);
  assert.equal(full.bloom.branches.water.stage, 1);
  assert.deepEqual(full.bloom.branches.water.given, {});
  assert.deepEqual(full.events[0], { type: 'stage', branch: 'water', stage: 1, reward: STAGES.water[0].reward });
  assert.equal(offerStage(full.bloom, tree, 'water', {}).reason, 'empty');
  let b = full.bloom;
  b = offerStage(b, tree, 'water', RICH).bloom;
  b = offerStage(b, tree, 'water', RICH).bloom;
  assert.equal(b.branches.water.stage, 3);
  assert.equal(offerStage(b, tree, 'water', RICH).reason, 'complete');
});

test('guestFor: 빈터 태그·낮밤에 맞는 손님만, 슬롯마다 한 번', () => {
  const tree = waterHab();
  const bloom = defaultBloom();
  const g = guestFor(bloom, tree, 'water', '2026-10-17', DAY);
  assert.ok(g.guest);
  assert.equal(g.guest.when, 'day');
  assert.equal(guestFor(bloom, tree, 'water', '2026-10-17', DAY).guest.id, g.guest.id);
  const n = guestFor(bloom, tree, 'water', '2026-10-17', NIGHT);
  if (n.guest) assert.equal(n.guest.when, 'night');
  assert.equal(guestFor(bloom, defaultTree(), 'water', '2026-10-17', DAY).guest, null);
  const o = observeGuest(bloom, tree, 'water', '2026-10-17', DAY);
  assert.ok(o.ok);
  assert.equal(o.bloom.branches.water.seen[g.guest.id], true);
  assert.equal(guestFor(o.bloom, tree, 'water', '2026-10-17', DAY).guest, null);
  assert.equal(observeGuest(o.bloom, tree, 'water', '2026-10-17', DAY).reason, 'gone');
  assert.ok(guestFor(o.bloom, tree, 'water', '2026-10-18', DAY).guest);
});

test('장식을 바꾸면 다른 손님이 올 수 있다(수집 고리)', () => {
  const ids = new Set();
  const sets = [['pond', 'pond', 'bigtree'], ['pond', 'pond', 'pond', 'bigtree', 'flowers', 'flowers'], ['pond', 'bigtree', 'bigtree', 'pond']];
  for (const s of sets) for (let d = 1; d <= 28; d++) {
    const g = guestFor(defaultBloom(), treeWith('water', s), 'water', `2026-10-${String(d).padStart(2, '0')}`, DAY).guest;
    if (g) ids.add(g.id);
  }
  assert.equal(ids.size, 3);
});

test('세 줄이 다 차면 꽃핌 이벤트 한 번 + 보상 · 단조', () => {
  const tree = treeWith('water', ['pond', 'pond', 'pond', 'bigtree', 'flowers', 'flowers'], { bundles: true });
  let bloom = defaultBloom();
  for (let i = 0; i < 3; i++) bloom = offerStage(bloom, tree, 'water', RICH).bloom;
  for (let d = 10; d < 10 + CARE_DAYS - 1; d++) bloom = careToday(bloom, tree, 'water', `2026-10-${d}`, RICH).bloom;
  bloom = { ...bloom, branches: { ...bloom.branches, water: { ...bloom.branches.water, seen: Object.fromEntries(GUESTS.water.map(g => [g.id, true])) } } };
  assert.equal(bloom.branches.water.bloomed, false);
  const r = careToday(bloom, tree, 'water', '2026-10-30', RICH);
  assert.ok(r.events.some(e => e.type === 'bloom' && e.branch === 'water'));
  assert.equal(r.bloom.branches.water.bloomed, true);
  assert.deepEqual(r.events.find(e => e.type === 'bloom').reward, BLOOM_REWARD);
  assert.deepEqual(bloomRows(r.bloom, tree, 'water'), { stage: { have: 3, need: 3 }, care: { have: CARE_DAYS, need: CARE_DAYS }, guests: { have: GUEST_COUNT, need: GUEST_COUNT } });
});

test('decorLocked: 꽃 장식은 그 가지가 꽃피어야 열린다', () => {
  const bloom = defaultBloom();
  assert.equal(decorLocked(bloom, BLOOM_DECOR.water), true);
  assert.equal(decorLocked(bloom, 'pond'), false);
  const open = { ...bloom, branches: { ...bloom.branches, water: { ...bloom.branches.water, bloomed: true } } };
  assert.equal(decorLocked(open, BLOOM_DECOR.water), false);
});

test('growthOf·lifeOf: 꽃은 꽃피우기 완료에서만, 생명력은 꽃피우기까지 포함', () => {
  const tree = waterFull();
  const bloom = defaultBloom();
  const g = growthOf(bloom, tree, 'water');
  assert.equal(g.bloom, false);
  assert.ok(g.leaves > 0.55 && g.leaves < 0.7, String(g.leaves));
  assert.ok(lifeOf(bloom, tree) < 20);
  const done = { ...bloom, branches: { ...bloom.branches, water: { ...bloom.branches.water, bloomed: true } } };
  assert.deepEqual(growthOf(done, tree, 'water'), { leaves: 1, bloom: true });
});
