import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ceilingOk } from '../js/house/surface.js';
import { postCircles } from '../js/world/outdoor-overlap.js';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const CAT = read('../js/data/catalog.js'), IN = read('../js/spaces/indoor.js'), GAME = read('../js/game.js');
const ART = { newyear: read('../js/decor-drops/art-newyear-pick.js'), camp: read('../js/decor-drops/art-camp-pick.js') };
const listOf = (src, name) => JSON.parse(src.match(new RegExp(`export const ${name} = (\\[[^\\]]*\\])`))[1].replace(/'/g, '"'));
const block = (name) => { const s = CAT.indexOf(`export const ${name} = [`); return CAT.slice(s, CAT.indexOf('\n];', s)); };
const lineOf = (src, id) => src.split('\n').find(l => l.includes(`id: '${id}'`));
const INDOOR = { newyear: ['ny_folding_screen', 'ny_tteokguk_table', 'ny_bokjori_wall'], camp: ['cp_camp_chair', 'cp_lantern_hook'] };
const YARD = { newyear: ['ny_kite_stand'], camp: ['cp_tent', 'cp_marshmallow_fire'] };

test('art ids match the new year and camping picks', () => {
  for (const k of ['newyear', 'camp']) {
    assert.deepEqual(listOf(ART[k], 'IDS'), INDOOR[k]);
    assert.deepEqual(listOf(ART[k], 'YARD_IDS'), YARD[k]);
  }
});

test('indoor picks are hidden keep decor with foot and desc', () => {
  const D = block('DECOR');
  for (const id of [...INDOOR.newyear, ...INDOOR.camp]) {
    const l = lineOf(D, id);
    assert.ok(l, id);
    assert.match(l, /cost: 0, pay: 'coins', hidden: true, keep: true, foot: \[/);
    assert.match(l, /desc: '/);
    assert.doesNotMatch(l, /\btop: \{|\bsm: true|—/);
  }
});

test('yard picks are hidden quest outdoor items with their boxes', () => {
  const O = block('OUTDOOR');
  for (const id of [...YARD.newyear, ...YARD.camp]) {
    const l = lineOf(O, id);
    assert.ok(l, id);
    assert.match(l, /cost: \{ coins: 9999 \}/);
    assert.match(l, /hidden: true, quest: true/);
    assert.doesNotMatch(l, /—/);
  }
  assert.match(lineOf(O, 'cp_tent'), /box: \[1\.7, 1\.9\]/);
  assert.match(lineOf(O, 'cp_marshmallow_fire'), /box: \[1\.8, 1\.15\]/);
});

test('the kite line is walk-through: only the two posts are solid', () => {
  const l = lineOf(block('OUTDOOR'), 'ny_kite_stand');
  assert.match(l, /box: \[2\.0, 0\.4\], posts: \[\[-0\.9, 0, 0\.12\], \[0\.9, 0, 0\.12\]\]/);
  const posts = [[-0.9, 0, 0.12], [0.9, 0, 0.12]];
  for (const ry of [0, 1, 2, 3]) for (const c of postCircles(posts, 0, 0, ry)) assert.ok(Math.hypot(c.x, c.z) - c.r > 0.6, `ry ${ry}`);
});

test('tall indoor picks stay under the ceiling', () => {
  const scale = Number(CAT.match(/DECOR_SCALE = ([\d.]+)/)[1]);
  for (const h of [1.07, 0.51, 1.05, 0.88, 1.51]) assert.equal(ceilingOk(0, h, scale), true, String(h));
});

test('wired into indoor and yard mesh dispatch', () => {
  assert.match(IN, /NEWYEAR_PICK_IDS\.includes\(id\)\) \{\n\s*g\.add\(buildNewyearPick\(id\)\)/);
  assert.match(IN, /CAMP_PICK_IDS\.includes\(id\)\) \{\n\s*g\.add\(buildCampPick\(id\)\)/);
  assert.match(GAME, /NEWYEAR_PICK_YARD_IDS\.includes\(id\)\) \{\n\s*g\.add\(buildNewyearPick\(id\)\)/);
  assert.match(GAME, /CAMP_PICK_YARD_IDS\.includes\(id\)\) \{\n\s*g\.add\(buildCampPick\(id\)\)/);
});

test('art is baked, no lights, no emissive, no comments, no sims imports; camp glow flickers', () => {
  for (const src of Object.values(ART)) {
    assert.match(src, /bakeGroup/);
    assert.doesNotMatch(src, /PointLight|SpotLight|emissive|sims\//);
    assert.doesNotMatch(src, /^\s*\/\/|\/\*/m);
  }
  assert.match(ART.camp, /userData\.flicker = true/);
  assert.doesNotMatch(ART.newyear, /flicker/);
});
