import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeDrops, rollDrop, setProgress, bannerDue } from '../js/decor-drops/rules.js';
import { DROP_SOURCES } from '../js/data/decor-sets.js';

const fresh = () => normalizeDrops(null);
const P = DROP_SOURCES.cook.p;

test('normalize fills every source with 0 and drops junk', () => {
  const d = normalizeDrops({ tries: { cook: 3, bogus: 9, mine: -2, star: 'x' }, banner: { picnic: '2026-10-18', nope: 1 } });
  assert.equal(d.tries.cook, 3);
  assert.equal(d.tries.mine, 0);
  assert.equal(d.tries.star, 0);
  assert.ok(!('bogus' in d.tries));
  assert.deepEqual(d.banner, { picnic: '2026-10-18' });
});

test('rand just under p hits, rand at p misses', () => {
  assert.equal(rollDrop(fresh(), [], 'cook', P - 1e-9).hit, true);
  assert.equal(rollDrop(fresh(), [], 'cook', P).hit, false);
});

test('miss increments tries without mutating input', () => {
  const d0 = fresh();
  const r = rollDrop(d0, [], 'cook', 0.99);
  assert.equal(r.drops.tries.cook, 1);
  assert.equal(d0.tries.cook, 0);
  assert.equal(r.tries, 1);
});

test('pity guarantees the hit on the pity-th play', () => {
  let d = fresh();
  for (let i = 1; i < DROP_SOURCES.cook.pity; i++) d = rollDrop(d, [], 'cook', 0.99).drops;
  const r = rollDrop(d, [], 'cook', 0.99);
  assert.equal(r.hit, true);
  assert.equal(r.pity, true);
  assert.equal(r.tries, DROP_SOURCES.cook.pity);
});

test('hit resets tries for that source and is not marked pity', () => {
  const r = rollDrop(fresh(), [], 'cook', 0);
  assert.equal(r.item, 'picnicPies');
  assert.equal(r.drops.tries.cook, 0);
  assert.equal(r.pity, false);
});

test('owned item never rolls again', () => {
  const r = rollDrop(fresh(), ['picnicPies'], 'cook', 0);
  assert.equal(r.hit, false);
  assert.equal(r.drops.tries.cook, 0);
});

test('unknown source is a no-op', () => {
  assert.equal(rollDrop(fresh(), [], 'fish', 0).hit, false);
});

test('force hits regardless of rand', () => {
  assert.equal(rollDrop(fresh(), [], 'mine', 0.99, true).hit, true);
});

test('set progress counts items, not the bonus', () => {
  assert.deepEqual(setProgress([], 'picnic'), { got: [], n: 0, complete: false });
  assert.equal(setProgress(['picnicBasket'], 'picnic').n, 1);
  assert.equal(setProgress(['picnicTable'], 'picnic').n, 0);
  assert.equal(setProgress(['picnicBasket', 'picnicPies'], 'picnic').complete, true);
});

test('banner once per day, never after completion', () => {
  const d = fresh();
  assert.equal(bannerDue(d, [], 'picnic', '2026-10-18'), true);
  assert.equal(bannerDue({ ...d, banner: { picnic: '2026-10-18' } }, [], 'picnic', '2026-10-18'), false);
  assert.equal(bannerDue({ ...d, banner: { picnic: '2026-10-17' } }, [], 'picnic', '2026-10-18'), true);
  assert.equal(bannerDue(d, ['picnicBasket', 'picnicPies'], 'picnic', '2026-10-18'), false);
});
