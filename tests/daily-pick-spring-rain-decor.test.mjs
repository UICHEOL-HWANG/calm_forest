import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ceilingOk } from '../js/house/surface.js';
import { postCircles } from '../js/world/outdoor-overlap.js';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const CAT = read('../js/data/catalog.js'), IN = read('../js/spaces/indoor.js'), GAME = read('../js/game.js');
const ART = { spring: read('../js/decor-drops/art-spring-pick.js'), rain: read('../js/decor-drops/art-rain-pick.js') };
const listOf = (src, name) => JSON.parse(src.match(new RegExp(`export const ${name} = (\\[[^\\]]*\\])`))[1].replace(/'/g, '"'));
const block = (name) => { const s = CAT.indexOf(`export const ${name} = [`); return CAT.slice(s, CAT.indexOf('\n];', s)); };
const lineOf = (src, id) => src.split('\n').find(l => l.includes(`id: '${id}'`));
const INDOOR = { spring: ['sb_blossom_pot', 'sb_picnic_mat'], rain: ['rn_umbrella_stand', 'rn_rain_curtain'] };
const YARD = { spring: ['sb_petal_swing', 'sb_blossom_arch'], rain: ['rn_rain_planter', 'rn_snail_garden'] };

test('art ids match the spring blossom and rainy day picks', () => {
  for (const k of ['spring', 'rain']) {
    assert.deepEqual(listOf(ART[k], 'IDS'), INDOOR[k]);
    assert.deepEqual(listOf(ART[k], 'YARD_IDS'), YARD[k]);
  }
});

test('indoor picks are hidden keep decor with desc, foot except the rug', () => {
  const D = block('DECOR');
  for (const id of [...INDOOR.spring, ...INDOOR.rain]) {
    const l = lineOf(D, id);
    assert.ok(l, id);
    assert.match(l, /cost: 0, pay: 'coins', hidden: true, keep: true, /);
    assert.match(l, /desc: '/);
    assert.doesNotMatch(l, /\btop: \{|\bsm: true|—/);
    if (id === 'sb_picnic_mat') assert.doesNotMatch(l, /foot:/);
    else assert.match(l, /foot: \[/);
  }
});

test('yard picks are hidden quest outdoor items with their boxes', () => {
  const O = block('OUTDOOR');
  for (const id of [...YARD.spring, ...YARD.rain]) {
    const l = lineOf(O, id);
    assert.ok(l, id);
    assert.match(l, /cost: \{ coins: 9999 \}/);
    assert.match(l, /hidden: true, quest: true/);
    assert.doesNotMatch(l, /—/);
  }
  assert.match(lineOf(O, 'rn_rain_planter'), /box: \[1\.1, 1\.0\]/);
  assert.match(lineOf(O, 'rn_snail_garden'), /box: \[1\.4, 1\.1\]/);
});

test('the arch is walk-through and the swing only blocks its four legs', () => {
  const O = block('OUTDOOR');
  const arch = [[-0.9, 0, 0.15], [0.9, 0, 0.15]];
  const legs = [[-0.85, -0.38, 0.1], [-0.85, 0.38, 0.1], [0.85, -0.38, 0.1], [0.85, 0.38, 0.1]];
  assert.ok(lineOf(O, 'sb_blossom_arch').includes(`box: [2.0, 0.4], posts: ${JSON.stringify(arch).replace(/,/g, ', ')}`));
  assert.ok(lineOf(O, 'sb_petal_swing').includes(`box: [2.0, 0.9], posts: ${JSON.stringify(legs).replace(/,/g, ', ')}`));
  for (const posts of [arch, legs]) for (const ry of [0, 1, 2, 3]) for (const c of postCircles(posts, 0, 0, ry)) assert.ok(Math.hypot(c.x, c.z) - c.r > 0.6, `ry ${ry}`);
});

test('tall indoor picks stay under the ceiling', () => {
  const scale = Number(CAT.match(/DECOR_SCALE = ([\d.]+)/)[1]);
  for (const h of [1.35, 0.05, 1.04, 1.7]) assert.equal(ceilingOk(0, h, scale), true, String(h));
});

test('wired into indoor and yard mesh dispatch', () => {
  assert.match(IN, /SPRING_PICK_IDS\.includes\(id\)\) \{\n\s*g\.add\(buildSpringPick\(id\)\)/);
  assert.match(IN, /RAIN_PICK_IDS\.includes\(id\)\) \{\n\s*g\.add\(buildRainPick\(id\)\)/);
  assert.match(GAME, /SPRING_PICK_YARD_IDS\.includes\(id\)\) \{\n\s*g\.add\(buildSpringPick\(id\)\)/);
  assert.match(GAME, /RAIN_PICK_YARD_IDS\.includes\(id\)\) \{\n\s*g\.add\(buildRainPick\(id\)\)/);
});

test('art is baked, no lights, no emissive, no comments, no sims imports; blossoms are smooth shaded spheres', () => {
  for (const src of Object.values(ART)) {
    assert.match(src, /bakeGroup/);
    assert.doesNotMatch(src, /PointLight|SpotLight|emissive|sims\/|flicker/);
    assert.doesNotMatch(src, /^\s*\/\/|\/\*/m);
  }
  assert.doesNotMatch(ART.spring, /Icosahedron/);
  assert.match(ART.spring, /baked\(soft, false\)/);
});
