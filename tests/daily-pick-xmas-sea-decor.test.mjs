import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ceilingOk } from '../js/house/surface.js';
import { postCircles } from '../js/world/outdoor-overlap.js';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const CAT = read('../js/data/catalog.js'), IN = read('../js/spaces/indoor.js'), GAME = read('../js/game.js');
const ART = { xmas: read('../js/decor-drops/art-xmas-pick.js'), sea: read('../js/decor-drops/art-sea-pick.js') };
const listOf = (src, name) => JSON.parse(src.match(new RegExp(`export const ${name} = (\\[[^\\]]*\\])`))[1].replace(/'/g, '"'));
const block = (name) => { const s = CAT.indexOf(`export const ${name} = [`); return CAT.slice(s, CAT.indexOf('\n];', s)); };
const lineOf = (src, id) => src.split('\n').find(l => l.includes(`id: '${id}'`));
const INDOOR = { xmas: ['xm_mini_tree', 'xm_gift_pile', 'xm_ginger_house'], sea: ['sp_shell_lamp', 'sp_lighthouse_model', 'sp_boat_planter'] };
const YARD = { xmas: ['xm_wreath_arch'], sea: ['sp_net_hammock'] };

test('art ids match the christmas and seaside picks', () => {
  for (const k of ['xmas', 'sea']) {
    assert.deepEqual(listOf(ART[k], 'IDS'), INDOOR[k]);
    assert.deepEqual(listOf(ART[k], 'YARD_IDS'), YARD[k]);
  }
});

test('indoor picks are hidden keep decor with desc and foot', () => {
  const D = block('DECOR');
  for (const id of [...INDOOR.xmas, ...INDOOR.sea]) {
    const l = lineOf(D, id);
    assert.ok(l, id);
    assert.match(l, /cost: 0, pay: 'coins', hidden: true, keep: true/);
    assert.match(l, /foot: \[/);
    assert.match(l, /desc: '/);
    assert.doesNotMatch(l, /\btop: \{|—/);
  }
  assert.match(lineOf(D, 'xm_gift_pile'), /sm: true, h: 0\.61/);
  for (const id of ['xm_mini_tree', 'xm_ginger_house', 'sp_shell_lamp', 'sp_lighthouse_model', 'sp_boat_planter']) assert.doesNotMatch(lineOf(D, id), /\bsm: true/);
});

test('yard picks are hidden quest outdoor items', () => {
  const O = block('OUTDOOR');
  for (const id of [...YARD.xmas, ...YARD.sea]) {
    const l = lineOf(O, id);
    assert.match(l, /cost: \{ coins: 9999 \}/);
    assert.match(l, /hidden: true, quest: true/);
    assert.doesNotMatch(l, /—/);
  }
  assert.match(lineOf(O, 'sp_net_hammock'), /box: \[2\.5, 0\.8\]/);
});

test('the wreath arch is walk-through: only the two cane posts are solid', () => {
  const l = lineOf(block('OUTDOOR'), 'xm_wreath_arch');
  assert.match(l, /box: \[2\.0, 0\.4\], posts: \[\[-0\.84, 0, 0\.14\], \[0\.84, 0, 0\.14\]\]/);
  const posts = [[-0.84, 0, 0.14], [0.84, 0, 0.14]];
  for (const ry of [0, 1, 2, 3]) for (const c of postCircles(posts, 0, 0, ry)) assert.ok(Math.hypot(c.x, c.z) - c.r > 0.6, `ry ${ry}`);
  assert.ok(GAME.indexOf('else if (def.posts)') < GAME.indexOf('else if (def.box)'));
});

test('tall picks stay under the ceiling', () => {
  const scale = Number(CAT.match(/DECOR_SCALE = ([\d.]+)/)[1]);
  for (const h of [1.42, 1.21, 0.98, 0.51, 0.41]) assert.equal(ceilingOk(0, h, scale), true, String(h));
});

test('wired into indoor and yard mesh dispatch', () => {
  assert.match(IN, /XMAS_PICK_IDS\.includes\(id\)\) \{\n\s*g\.add\(buildXmasPick\(id\)\)/);
  assert.match(IN, /SEA_PICK_IDS\.includes\(id\)\) \{\n\s*g\.add\(buildSeaPick\(id\)\)/);
  assert.match(GAME, /XMAS_PICK_YARD_IDS\.includes\(id\)\) \{\n\s*g\.add\(buildXmasPick\(id\)\)/);
  assert.match(GAME, /SEA_PICK_YARD_IDS\.includes\(id\)\) \{\n\s*g\.add\(buildSeaPick\(id\)\)/);
});

test('art is baked, glow flickers, no lights, no emissive, no comments', () => {
  for (const src of Object.values(ART)) {
    assert.match(src, /bakeGroup/);
    assert.match(src, /userData\.flicker = true/);
    assert.doesNotMatch(src, /PointLight|SpotLight|emissive/);
    assert.doesNotMatch(src, /^\s*\/\/|\/\*/m);
  }
});
