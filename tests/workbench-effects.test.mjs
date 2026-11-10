import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ADV_CROPS, MATURE, growthPerWater } from '../js/farm-crops.js';
import { expandWoodOf } from '../js/tool-tiers.js';
import { buildNeed } from '../js/house-cost.js';
import { wheatStatus } from '../js/orchard-onboard.js';

const src = p => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const wheat = ADV_CROPS.find(c => c.id === 'wheat');

test('water stars raise advanced crop growth per water', () => {
  const base = (MATURE + 1e-6) / wheat.waters;
  assert.equal(growthPerWater(wheat, true, true), base * 1.75);
  assert.equal(growthPerWater(wheat, true, true, 0), base * 1.75);
  assert.equal(growthPerWater(wheat, true, true, 1), base * 2.0);
  assert.equal(growthPerWater(wheat, true, true, 3), base * 2.5);
  assert.equal(growthPerWater(wheat, false, true, 3), base);
  assert.equal(growthPerWater(wheat, true, false, 2), base * 2.25 * 0.5);
});

test('basic crops keep 0.4 and 0.7 at star 0 and scale with the water star', () => {
  const carrot = { id: 'carrot' };
  assert.equal(growthPerWater(carrot, true, false, 0), 0.7);
  assert.equal(growthPerWater(carrot, false, false, 3), 0.4);
  assert.ok(Math.abs(growthPerWater(carrot, true, false, 3) - 1.0) < 1e-9);
  assert.ok(growthPerWater(carrot, true, false, 1) > 0.7);
});

test('hammer stars cut building and expansion wood, never coins', () => {
  const s = star => ({ upgrades: { hammer: true }, toolStars: { hammer: star } });
  assert.equal(expandWoodOf(s(0), 30), 21);
  assert.equal(expandWoodOf(s(1), 40), 26);
  assert.equal(expandWoodOf(s(2), 30), 18);
  assert.equal(expandWoodOf(s(3), 40), 22);
  assert.equal(expandWoodOf({ upgrades: {}, toolStars: { hammer: 3 } }, 30), 30);
  assert.equal(buildNeed(s(3), 'wood', 40), 22);
  assert.equal(buildNeed(s(3), 'coins', 400), 400);
  assert.equal(buildNeed(s(3), 'stone', 20), 20);
});

test('wheat hint counts waters with the water star', () => {
  const plot = { cropType: wheat, state: 'growing', growth: 0, fert: true };
  assert.equal(wheatStatus([plot], 0, { upgraded: true, rain: false, star: 0 }).watersLeft, 2);
  assert.equal(wheatStatus([plot], 0, { upgraded: true, rain: false, star: 3 }).watersLeft, 1);
  const slow = { ...plot, fert: false };
  assert.equal(wheatStatus([slow], 0, { upgraded: true, rain: false }).watersLeft, 3);
  assert.equal(wheatStatus([slow], 0, { upgraded: true, rain: false, star: 3 }).watersLeft, 2);
});

test('rod, pot and net read their star through the rules module', () => {
  assert.match(src('js/spaces/fishing.js'), /gameState\.upgrades\.rod \? rodBiteSec\(gameState\) : 1\.4/);
  assert.match(src('js/spaces/cooking.js'), /potMult\(gameState\)/);
  assert.doesNotMatch(src('js/spaces/cooking.js'), /upgrades\.pot \? 1\.5/);
  assert.match(src('js/spaces/glade.js'), /Math\.min\(0\.98, base \+ netBonus\(gameState\)\)/);
});

test('every water call site passes the water star', () => {
  for (const f of ['js/spaces/shovel.js', 'js/spaces/farm-auto.js']) {
    const calls = src(f).match(/growthPerWater\([^;]*/g) || [];
    assert.ok(calls.length > 0, f);
    for (const c of calls) assert.match(c, /starOf\(gameState, 'water'\)/, `${f}: ${c}`);
  }
  assert.match(src('js/spaces/npc.js'), /wheatStatus\([^;]*star: starOf\(gameState, 'water'\)/);
});
