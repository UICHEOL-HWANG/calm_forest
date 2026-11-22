import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ceilingOk } from '../js/house/surface.js';
import { postCircles } from '../js/world/outdoor-overlap.js';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const CAT = read('../js/data/catalog.js'), IN = read('../js/spaces/indoor.js'), GAME = read('../js/game.js');
const ART = { tea: read('../js/decor-drops/art-tea-pick.js'), atelier: read('../js/decor-drops/art-atelier-pick.js') };
const listOf = (src, name) => JSON.parse(src.match(new RegExp(`export const ${name} = (\\[[^\\]]*\\])`))[1].replace(/'/g, '"'));
const block = (name) => { const s = CAT.indexOf(`export const ${name} = [`); return CAT.slice(s, CAT.indexOf('\n];', s)); };
const lineOf = (src, id) => src.split('\n').find(l => l.includes(`id: '${id}'`));
const luma = h => (0.2126 * ((h >> 16) & 255) + 0.7152 * ((h >> 8) & 255) + 0.0722 * (h & 255)) / 255;
const INDOOR = { tea: ['tc_tea_table', 'tc_floor_cushion', 'tc_teaware_shelf'], atelier: ['at_easel', 'at_paint_shelf', 'at_frame_wall'] };
const YARD = { tea: ['tc_bamboo_basin'], atelier: ['at_outdoor_easel'] };

test('art ids match the tea house and atelier picks', () => {
  for (const k of ['tea', 'atelier']) {
    assert.deepEqual(listOf(ART[k], 'IDS'), INDOOR[k]);
    assert.deepEqual(listOf(ART[k], 'YARD_IDS'), YARD[k]);
  }
});

test('indoor picks are hidden keep decor with desc, foot except the cushion', () => {
  const D = block('DECOR');
  for (const id of [...INDOOR.tea, ...INDOOR.atelier]) {
    const l = lineOf(D, id);
    assert.ok(l, id);
    assert.match(l, /cost: 0, pay: 'coins', hidden: true, keep: true, /);
    assert.match(l, /desc: '[^']+요' \}/);
    assert.doesNotMatch(l, /\btop: \{|\bsm: true|—/);
    if (id === 'tc_floor_cushion') assert.doesNotMatch(l, /foot:/);
    else assert.match(l, /foot: \[/);
  }
});

test('yard picks are hidden quest outdoor items with their boxes', () => {
  const O = block('OUTDOOR');
  for (const id of [...YARD.tea, ...YARD.atelier]) {
    const l = lineOf(O, id);
    assert.ok(l, id);
    assert.match(l, /cost: \{ coins: 9999 \}/);
    assert.match(l, /hidden: true, quest: true/);
    assert.match(l, /desc: '[^']+요'/);
    assert.doesNotMatch(l, /—/);
  }
  assert.match(lineOf(O, 'tc_bamboo_basin'), /box: \[1\.2, 0\.9\] \}/);
  assert.match(lineOf(O, 'at_outdoor_easel'), /box: \[2\.0, 2\.0\], posts: \[\[-0\.6, 0\.15, 0\.25\], \[0\.15, -0\.15, 0\.08\]\]/);
});

test('outdoor easel posts stay inside its box at every rotation', () => {
  const posts = [[-0.6, 0.15, 0.25], [0.15, -0.15, 0.08]];
  for (const ry of [0, 1, 2, 3]) for (const c of postCircles(posts, 0, 0, ry)) assert.ok(Math.abs(c.x) + c.r <= 1 && Math.abs(c.z) + c.r <= 1, `ry ${ry}`);
});

test('tall indoor picks stay under the ceiling', () => {
  const scale = Number(CAT.match(/DECOR_SCALE = ([\d.]+)/)[1]);
  for (const h of [0.58, 0.15, 1.25, 1.46, 1.07, 1.34]) assert.equal(ceilingOk(0, h, scale), true, String(h));
});

test('palettes stay under the bright luma cap', () => {
  for (const src of Object.values(ART)) {
    const hexes = src.match(/const C = \{[\s\S]*?\n\};/)[0].match(/0x[0-9a-f]{6}/g);
    for (const h of hexes) assert.ok(luma(parseInt(h, 16)) <= 0.85, h);
  }
});

test('wired into indoor and yard mesh dispatch', () => {
  assert.match(IN, /TEA_PICK_IDS\.includes\(id\)\) \{\n\s*g\.add\(buildTeaPick\(id\)\)/);
  assert.match(IN, /ATELIER_PICK_IDS\.includes\(id\)\) \{\n\s*g\.add\(buildAtelierPick\(id\)\)/);
  assert.match(GAME, /TEA_PICK_YARD_IDS\.includes\(id\)\) \{\n\s*g\.add\(buildTeaPick\(id\)\)/);
  assert.match(GAME, /ATELIER_PICK_YARD_IDS\.includes\(id\)\) \{\n\s*g\.add\(buildAtelierPick\(id\)\)/);
});

test('art is baked smooth, no lights, no emissive, no comments, no sims imports', () => {
  for (const src of Object.values(ART)) {
    assert.match(src, /bakeGroup/);
    assert.match(src, /flatShading: false/);
    assert.doesNotMatch(src, /flatShading: true|PointLight|SpotLight|emissive|sims\/|flicker/);
    assert.doesNotMatch(src, /^\s*\/\/|\/\*/m);
  }
});
