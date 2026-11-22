import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ceilingOk } from '../js/house/surface.js';
import { postCircles } from '../js/world/outdoor-overlap.js';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const CAT = read('../js/data/catalog.js'), IN = read('../js/spaces/indoor.js'), GAME = read('../js/game.js');
const ART = { concert: read('../js/decor-drops/art-concert-pick.js'), festival: read('../js/decor-drops/art-festival-pick.js') };
const listOf = (src, name) => JSON.parse(src.match(new RegExp(`export const ${name} = (\\[[^\\]]*\\])`))[1].replace(/'/g, '"'));
const block = (name) => { const s = CAT.indexOf(`export const ${name} = [`); return CAT.slice(s, CAT.indexOf('\n];', s)); };
const lineOf = (src, id) => src.split('\n').find(l => l.includes(`id: '${id}'`));
const luma = h => (0.2126 * ((h >> 16) & 255) + 0.7152 * ((h >> 8) & 255) + 0.0722 * (h & 255)) / 255;
const INDOOR = { concert: ['mu_gramophone', 'mu_piano_stool', 'mu_music_stand'], festival: ['sf_lantern_string', 'sf_goldfish_bowl'] };
const YARD = { concert: ['mu_mini_stage'], festival: ['sf_shaved_ice_stand', 'sf_festival_stall'] };
const STAGE_POSTS = [[-0.78, -0.5, 0.09], [0.78, -0.5, 0.09]];

test('art ids match the concert and summer festival picks', () => {
  for (const k of ['concert', 'festival']) {
    assert.deepEqual(listOf(ART[k], 'IDS'), INDOOR[k]);
    assert.deepEqual(listOf(ART[k], 'YARD_IDS'), YARD[k]);
  }
});

test('indoor picks are hidden keep decor with foot and desc', () => {
  const D = block('DECOR');
  for (const id of [...INDOOR.concert, ...INDOOR.festival]) {
    const l = lineOf(D, id);
    assert.ok(l, id);
    assert.match(l, /cost: 0, pay: 'coins', hidden: true, keep: true, foot: \[/);
    assert.match(l, /desc: '[^']+요' \}/);
    assert.doesNotMatch(l, /\btop: \{|\bsm: true|—|놀/);
  }
});

test('yard picks are hidden quest outdoor items with their boxes', () => {
  const O = block('OUTDOOR');
  for (const id of [...YARD.concert, ...YARD.festival]) {
    const l = lineOf(O, id);
    assert.ok(l, id);
    assert.match(l, /cost: \{ coins: 9999 \}/);
    assert.match(l, /hidden: true, quest: true/);
    assert.match(l, /desc: '[^']+요'/);
    assert.doesNotMatch(l, /—|놀/);
  }
  assert.ok(lineOf(O, 'mu_mini_stage').includes(`box: [2.0, 1.6], posts: ${JSON.stringify(STAGE_POSTS).replace(/,/g, ', ')} }`));
  assert.match(lineOf(O, 'sf_shaved_ice_stand'), /box: \[1\.4, 0\.9\] \}/);
  assert.match(lineOf(O, 'sf_festival_stall'), /box: \[1\.8, 1\.1\] \}/);
});

test('stage posts sit inside its box at every rotation', () => {
  for (const ry of [0, 1, 2, 3]) {
    const [hx, hz] = ry % 2 ? [0.8, 1.0] : [1.0, 0.8];
    for (const c of postCircles(STAGE_POSTS, 0, 0, ry)) assert.ok(Math.abs(c.x) + c.r <= hx && Math.abs(c.z) + c.r <= hz, `ry ${ry}`);
  }
});

test('tall indoor picks stay under the ceiling', () => {
  const scale = Number(CAT.match(/DECOR_SCALE = ([\d.]+)/)[1]);
  for (const h of [1.35, 0.54, 1.3, 1.68, 0.82]) assert.equal(ceilingOk(0, h, scale), true, String(h));
});

test('palettes stay under the bright luma cap', () => {
  for (const src of Object.values(ART)) {
    const hexes = src.match(/const C = \{[\s\S]*?\n\};/)[0].match(/0x[0-9a-f]{6}/g);
    for (const h of hexes) assert.ok(luma(parseInt(h, 16)) <= 0.85, h);
  }
});

test('wired into indoor and yard mesh dispatch', () => {
  assert.match(IN, /CONCERT_PICK_IDS\.includes\(id\)\) \{\n\s*g\.add\(buildConcertPick\(id\)\)/);
  assert.match(IN, /FESTIVAL_PICK_IDS\.includes\(id\)\) \{\n\s*g\.add\(buildFestivalPick\(id\)\)/);
  assert.match(GAME, /CONCERT_PICK_YARD_IDS\.includes\(id\)\) \{\n\s*g\.add\(buildConcertPick\(id\)\)/);
  assert.match(GAME, /FESTIVAL_PICK_YARD_IDS\.includes\(id\)\) \{\n\s*g\.add\(buildFestivalPick\(id\)\)/);
});

test('art is baked smooth, no lights, no emissive, no comments, no sims imports', () => {
  for (const src of Object.values(ART)) {
    assert.match(src, /bakeGroup/);
    assert.match(src, /flatShading: false/);
    assert.doesNotMatch(src, /flatShading: true|PointLight|SpotLight|emissive|sims\//);
    assert.doesNotMatch(src, /^\s*\/\/|\/\*/m);
  }
  assert.doesNotMatch(ART.concert, /flicker/);
  assert.match(ART.festival, /MeshBasicMaterial\(\{ vertexColors: true \}\)\); m\.position\.y = k \/ 10; m\.userData\.flicker = true/);
});
