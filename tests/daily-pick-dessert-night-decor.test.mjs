import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ceilingOk } from '../js/house/surface.js';
import { postCircles } from '../js/world/outdoor-overlap.js';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const CAT = read('../js/data/catalog.js'), IN = read('../js/spaces/indoor.js'), GAME = read('../js/game.js');
const ART = { dessert: read('../js/decor-drops/art-dessert-pick.js'), night: read('../js/decor-drops/art-night-pick.js') };
const listOf = (src, name) => JSON.parse(src.match(new RegExp(`export const ${name} = (\\[[^\\]]*\\])`))[1].replace(/'/g, '"'));
const block = (name) => { const s = CAT.indexOf(`export const ${name} = [`); return CAT.slice(s, CAT.indexOf('\n];', s)); };
const lineOf = (src, id) => src.split('\n').find(l => l.includes(`id: '${id}'`));
const INDOOR = { dessert: ['ds_cake_case', 'ds_pudding_chair', 'ds_waffle_rug'], night: ['ns_constellation_lamp', 'ns_moon_sofa'] };
const YARD = { dessert: ['ds_icecream_cart'], night: ['ns_telescope', 'ns_starlight_arch'] };

test('art ids match the dessert and night sky picks', () => {
  for (const k of ['dessert', 'night']) {
    assert.deepEqual(listOf(ART[k], 'IDS'), INDOOR[k]);
    assert.deepEqual(listOf(ART[k], 'YARD_IDS'), YARD[k]);
  }
});

test('indoor picks are hidden keep decor with desc, furniture has foot, the rug is walkable', () => {
  const D = block('DECOR');
  for (const id of [...INDOOR.dessert, ...INDOOR.night]) {
    const l = lineOf(D, id);
    assert.ok(l, id);
    assert.match(l, /cost: 0, pay: 'coins', hidden: true, keep: true/);
    assert.match(l, /desc: '/);
    assert.doesNotMatch(l, /\btop: \{|\bsm: true|—/);
    if (id === 'ds_waffle_rug') assert.doesNotMatch(l, /foot:/);
    else assert.match(l, /foot: \[/);
  }
});

test('yard picks are hidden quest outdoor items', () => {
  const O = block('OUTDOOR');
  for (const id of [...YARD.dessert, ...YARD.night]) {
    const l = lineOf(O, id);
    assert.ok(l, id);
    assert.match(l, /cost: \{ coins: 9999 \}/);
    assert.match(l, /hidden: true, quest: true/);
    assert.doesNotMatch(l, /—/);
  }
  assert.match(lineOf(O, 'ds_icecream_cart'), /box: \[1\.6, 0\.8\]/);
  assert.match(lineOf(O, 'ns_telescope'), /box: \[0\.8, 0\.8\]/);
});

test('the starlight arch is walk-through: only the two posts are solid', () => {
  const l = lineOf(block('OUTDOOR'), 'ns_starlight_arch');
  assert.match(l, /box: \[2\.0, 0\.4\], posts: \[\[-0\.9, 0, 0\.15\], \[0\.9, 0, 0\.15\]\]/);
  const posts = [[-0.9, 0, 0.15], [0.9, 0, 0.15]];
  for (const ry of [0, 1, 2, 3]) for (const c of postCircles(posts, 0, 0, ry)) assert.ok(Math.hypot(c.x, c.z) - c.r > 0.6, `ry ${ry}`);
  assert.ok(GAME.indexOf('else if (def.posts)') < GAME.indexOf('else if (def.box)'));
});

test('tall indoor picks stay under the ceiling', () => {
  const scale = Number(CAT.match(/DECOR_SCALE = ([\d.]+)/)[1]);
  for (const h of [1.35, 1.36, 0.75, 0.55, 0.11]) assert.equal(ceilingOk(0, h, scale), true, String(h));
});

test('wired into indoor and yard mesh dispatch', () => {
  assert.match(IN, /DESSERT_PICK_IDS\.includes\(id\)\) \{\n\s*g\.add\(buildDessertPick\(id\)\)/);
  assert.match(IN, /NIGHT_PICK_IDS\.includes\(id\)\) \{\n\s*g\.add\(buildNightPick\(id\)\)/);
  assert.match(GAME, /DESSERT_PICK_YARD_IDS\.includes\(id\)\) \{\n\s*g\.add\(buildDessertPick\(id\)\)/);
  assert.match(GAME, /NIGHT_PICK_YARD_IDS\.includes\(id\)\) \{\n\s*g\.add\(buildNightPick\(id\)\)/);
});

test('art is baked, no lights, no emissive, no comments; night glow flickers, dessert glass is see-through', () => {
  for (const src of Object.values(ART)) {
    assert.match(src, /bakeGroup/);
    assert.doesNotMatch(src, /PointLight|SpotLight|emissive/);
    assert.doesNotMatch(src, /^\s*\/\/|\/\*/m);
  }
  assert.match(ART.night, /userData\.flicker = true/);
  assert.match(ART.dessert, /transparent: true, opacity: 0\.2, depthWrite: false/);
});
