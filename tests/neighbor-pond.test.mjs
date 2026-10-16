import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeShowcase } from '../js/neighbors/sanitize.js';

const ctx = {
  outdoorIds: new Set(['bench']), decorIds: new Set(), animalIds: new Set(['bear']), fallbackAnimal: 'bear',
  yard: { x: -8, z: -8 },
  pondRiverIds: ['sakura_trout', 'puffer', 'maple_carp', 'ice_smelt', 'rare', 'uncommon', 'common'],
  seaIds: ['aji', 'buri', 'mola', 'tuna'],
};
const base = { houseStage: 3, nickname: 'a', character: 'bear', outdoor: [] };

test('pond 없으면 has=false', () => {
  assert.deepEqual(sanitizeShowcase(base, ctx).pond, { fish: [], sea: null, has: false });
});

test('모르는 id·중복·8개 이상은 버린다', () => {
  const raw = { ...base, pond: { fish: ['common', 'common', 'shark', 'rare', 1, 'uncommon', 'puffer', 'maple_carp', 'ice_smelt', 'sakura_trout'], sea: { sp: 'tuna', w: 70 } } };
  const p = sanitizeShowcase(raw, ctx).pond;
  assert.deepEqual(p.fish, ['common', 'rare', 'uncommon', 'puffer', 'maple_carp', 'ice_smelt', 'sakura_trout']);
  assert.deepEqual(p.sea, { sp: 'tuna', w: 70 });
});

test('깨진 대어는 null', () => {
  assert.equal(sanitizeShowcase({ ...base, pond: { fish: [], sea: { sp: 'whale', w: 9 } } }, ctx).pond.sea, null);
  assert.equal(sanitizeShowcase({ ...base, pond: { fish: [], sea: { sp: 'aji', w: -1 } } }, ctx).pond.sea, null);
});
