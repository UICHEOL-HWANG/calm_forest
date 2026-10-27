import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HOMI_TIERS, HOMI_ENGRAVES, HOMI_REACH, HOMI_MISS_SPARE, HOMI_FEET, homiState, buyTier, buyEngrave, equipEngrave, homiEffects, homiBase } from '../js/forage/homi.js';
import { MUDFLAT } from '../js/forage/logic.js';

const rich = { coins: 500, mf_clam: 20, mf_cockle: 10, mf_razor: 10, mf_crab: 20 };

test('tiers grow slots 0 to 2 and carry their base effects upward', () => {
  assert.deepEqual(HOMI_TIERS.map(t => t.slots), [0, 1, 2]);
  assert.deepEqual(HOMI_TIERS.map(t => t.coin), [0, 90, 140]);
  assert.deepEqual(homiBase(0), []);
  assert.deepEqual(homiBase(1), ['reach']);
  assert.deepEqual(homiBase(2), ['reach', 'eye']);
  assert.deepEqual(HOMI_ENGRAVES.map(e => e.id), ['reach', 'eye', 'spare', 'feet']);
});

test('a fresh or broken save becomes a clean tier 0 hoe', () => {
  const clean = { tier: 0, owned: [], slots: [] };
  assert.deepEqual(homiState(undefined), clean);
  assert.deepEqual(homiState({ tier: 9, owned: ['x', 'reach', 'reach'], slots: ['reach', 'eye', 'spare'] }), { tier: 2, owned: ['reach'], slots: [null, null] });
  assert.deepEqual(homiState({ tier: 1, owned: ['spare', 'eye'], slots: ['eye', 'spare'] }), { tier: 1, owned: ['spare', 'eye'], slots: ['eye'] });
  assert.deepEqual(homiState({ tier: 2, owned: ['spare'], slots: ['spare', 'spare'] }), { tier: 2, owned: ['spare'], slots: ['spare', null] });
});

test('tiers are bought in order with coins and never skipped', () => {
  const s0 = homiState();
  assert.equal(buyTier(s0, rich, 2).ok, false);
  assert.equal(buyTier(s0, { coins: 89 }, 1).ok, false);
  const r = buyTier(s0, rich, 1);
  assert.equal(r.ok, true);
  assert.equal(r.state.tier, 1);
  assert.deepEqual(r.state.slots, [null]);
  assert.equal(r.spent.coins, 90);
  assert.equal(s0.tier, 0);
  assert.equal(buyTier(r.state, rich, 1).ok, false);
  const r2 = buyTier(r.state, rich, 2);
  assert.equal(r2.state.tier, 2);
  assert.deepEqual(r2.state.slots, [null, null]);
});

test('engraves cost the shells caught on the mudflat, once each', () => {
  const s = homiState({ tier: 1 });
  assert.equal(buyEngrave(s, { mf_crab: 7 }, 'spare').ok, false);
  const r = buyEngrave(s, rich, 'spare');
  assert.equal(r.ok, true);
  assert.deepEqual(r.spent, { mf_crab: 8 });
  assert.deepEqual(r.state.owned, ['spare']);
  assert.equal(buyEngrave(r.state, rich, 'spare').ok, false);
  assert.deepEqual(buyEngrave(homiState({ tier: 1, owned: ['eye'] }), rich, 'spare').state.owned, ['eye', 'spare']);
  assert.deepEqual(buyEngrave(s, rich, 'eye').spent, { mf_cockle: 4, mf_razor: 2 });
  assert.equal(buyEngrave(s, rich, 'nope').ok, false);
});

test('equipping fills a slot, moves instead of duplicating, and skips base effects', () => {
  const s = homiState({ tier: 2, owned: ['spare', 'reach', 'eye'] });
  assert.equal(equipEngrave(homiState({ tier: 0, owned: ['spare'] }), 0, 'spare').ok, false);
  assert.equal(equipEngrave(s, 2, 'spare').ok, false);
  assert.equal(equipEngrave(homiState({ tier: 2 }), 0, 'spare').ok, false);
  assert.equal(equipEngrave(s, 0, 'reach').ok, false);
  const a = equipEngrave(s, 0, 'spare');
  assert.deepEqual(a.state.slots, ['spare', null]);
  const b = equipEngrave(a.state, 1, 'spare');
  assert.deepEqual(b.state.slots, [null, 'spare']);
  assert.deepEqual(equipEngrave(b.state, 1, null).state.slots, [null, null]);
});

test('effects add up from the tier base and the engraved slots', () => {
  assert.deepEqual(homiEffects(homiState()), { reach: MUDFLAT.REACH, eye: false, missLimit: MUDFLAT.MISS_LIMIT, speed: 1, tier: 0, engraves: [] });
  assert.deepEqual(homiEffects(homiState({ tier: 1, owned: ['spare'], slots: ['spare'] })), { reach: HOMI_REACH, eye: false, missLimit: HOMI_MISS_SPARE, speed: 1, tier: 1, engraves: ['spare'] });
  assert.deepEqual(homiEffects(homiState({ tier: 1, owned: ['eye'], slots: ['eye'] })), { reach: HOMI_REACH, eye: true, missLimit: MUDFLAT.MISS_LIMIT, speed: 1, tier: 1, engraves: ['eye'] });
  assert.ok(HOMI_REACH > MUDFLAT.REACH);
  assert.equal(HOMI_MISS_SPARE, MUDFLAT.MISS_LIMIT + 1);
});

test('engraves cannot be bought without a slot or when the hoe already has the effect', () => {
  assert.equal(buyEngrave(homiState(), rich, 'spare').ok, false);
  assert.equal(buyEngrave(homiState({ tier: 1 }), rich, 'reach').ok, false);
  assert.equal(buyEngrave(homiState({ tier: 2 }), rich, 'eye').ok, false);
  assert.equal(buyEngrave(homiState({ tier: 1 }), rich, 'spare').ok, true);
});

test('the top hoe fills both slots and refunds an engrave that became built in', () => {
  const t2 = homiState({ tier: 2, owned: ['spare', 'feet'], slots: ['spare', 'feet'] });
  assert.deepEqual(t2.slots, ['spare', 'feet']);
  assert.equal(homiEffects(t2).speed, HOMI_FEET);
  assert.ok(HOMI_FEET > 1 && HOMI_FEET < 1.3);
  const up = buyTier(homiState({ tier: 1, owned: ['eye', 'spare'], slots: ['eye'] }), rich, 2);
  assert.equal(up.ok, true);
  assert.deepEqual(up.refund, { mf_cockle: 4, mf_razor: 2 });
  assert.deepEqual(up.state.owned, ['spare']);
  assert.deepEqual(up.state.slots, [null, null]);
  assert.deepEqual(buyTier(homiState(), rich, 1).refund, {});
});
