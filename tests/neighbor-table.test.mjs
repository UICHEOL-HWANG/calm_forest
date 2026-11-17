import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { sanitizeShowcase, TABLE_MAX } from '../js/neighbors/sanitize.js';
import { neighborTable } from '../js/neighbors/rules.js';
import { TABLE_SHAPES, TABLE_LONG_FROM } from '../js/data/table.js';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const RECIPE_IDS = ['veg_stew', 'mushroom_soup', 'rice_ball', 'baked_yam', 'herb_salad', 'grilled_fish', 'omelette', 'bread', 'grape_juice', 'lunchbox', 'forest_feast'];
const TIER_IDS = ['perfect', 'great', 'good', 'plain'];
const ctx = {
  outdoorIds: new Set(['bench']), decorIds: new Set(), animalIds: new Set(['bear']), fallbackAnimal: 'bear', yard: { x: -8, z: -8 },
  pondRiverIds: ['common'], seaIds: ['aji'], recipeIds: RECIPE_IDS, tierIds: TIER_IDS,
};
const view = (table) => sanitizeShowcase({ character: 'bear', houseStage: 3, outdoor: [], ...(table === undefined ? {} : { table }) }, ctx);
const one = { dishes: [{ id: 'bread', tier: 'good' }], has: true };

test('catalog recipe ids match the list the SQL and this test use', () => {
  const src = read('js/data/catalog.js');
  const at = src.indexOf('export const RECIPES');
  assert.deepEqual([...src.slice(at, src.indexOf('];', at)).matchAll(/id: '([a-z_]+)'/g)].map(m => m[1]), RECIPE_IDS);
  assert.equal(TABLE_MAX, RECIPE_IDS.length);
});

test('a valid table passes through in order', () => {
  const t = view({ dishes: [{ id: 'bread', tier: 'great' }, { id: 'veg_stew', tier: 'perfect' }] }).table;
  assert.deepEqual(t, { dishes: [{ id: 'bread', tier: 'great' }, { id: 'veg_stew', tier: 'perfect' }], has: true });
});

test('unknown ids, free-pot ids, bad tiers, duplicates and wrong types are dropped', () => {
  const t = view({ dishes: [
    { id: 'free:crop', tier: 'perfect' }, { id: 'cake', tier: 'good' }, { id: 'bread', tier: 'gold' },
    { id: 'omelette', tier: 'good' }, { id: 'omelette', tier: 'plain' }, 'bread', null, { id: 7, tier: 'good' }, { tier: 'good' },
  ] }).table;
  assert.deepEqual(t, { dishes: [{ id: 'omelette', tier: 'good' }], has: true });
});

test('twelve entries → at most eleven dishes', () => {
  const dishes = [...RECIPE_IDS, 'bread'].map(id => ({ id, tier: 'good' }));
  assert.equal(dishes.length, 12);
  assert.equal(view({ dishes }).table.dishes.length, 11);
});

for (const [label, raw] of [['missing', undefined], ['null', null], ['string', 'x'], ['array', []], ['no dishes', {}], ['dishes not array', { dishes: 'bread' }]]) {
  test(`table ${label} → empty`, () => {
    assert.deepEqual(view(raw).table, { dishes: [], has: false });
  });
}

test('no table when the neighbour has no dishes', () => {
  assert.equal(neighborTable({ dishes: [], has: false }, null, []), null);
  assert.equal(neighborTable(undefined, null, []), null);
});

test('front site and shape follow the dish count', () => {
  assert.deepEqual(neighborTable(one, null, []), { dx: 4.5, dz: 8.5, shape: 'round', site: 'front' });
  const long = neighborTable({ dishes: RECIPE_IDS.slice(0, TABLE_LONG_FROM).map(id => ({ id, tier: 'good' })), has: true }, null, []);
  assert.equal(long.shape, 'long');
});

test('a pond on the front site sends the table back, still inside the fence', () => {
  const t = neighborTable(one, { dx: 3, dz: 9, r: 2 }, []);
  assert.equal(t.site, 'back');
  const { hx, hz } = TABLE_SHAPES.long;
  assert.ok(Math.hypot(Math.abs(t.dx) + hx, Math.abs(t.dz) + hz) < 17.2);
});

test('decor on both sites → no table', () => {
  assert.equal(neighborTable(one, null, [{ id: 'bench', dx: 4.5, dz: 8.5 }, { id: 'bench', dx: -3, dz: -11 }]), null);
});

test('scene builds the table without ring, collider or interaction, and fixed trees skip it', () => {
  const src = read('js/neighbors/scene.js');
  assert.match(src, /neighborTable\(view\.table, ps, view\.outdoor\)/);
  assert.match(src, /buildTable\(/);
  assert.doesNotMatch(src, /buildDashRing/);
  assert.match(src, /tableCovers\(/);
});

test('showcase ctx injects recipe and tier ids', () => {
  const src = read('js/spaces/neighbor.js');
  assert.match(src, /recipeIds: RECIPES\.map\(r => r\.id\)/);
  assert.match(src, /tierIds: COOK_TIERS\.map\(t => t\.id\)/);
});
