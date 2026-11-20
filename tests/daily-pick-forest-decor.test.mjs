import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ceilingOk } from '../js/house/surface.js';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const CAT = read('../js/data/catalog.js'), ART = read('../js/decor-drops/art-forest-pick.js');
const IN = read('../js/spaces/indoor.js'), GAME = read('../js/game.js');
const listOf = (name) => JSON.parse(ART.match(new RegExp(`export const ${name} = (\\[[^\\]]*\\])`))[1].replace(/'/g, '"'));
const block = (name) => { const s = CAT.indexOf(`export const ${name} = [`); return CAT.slice(s, CAT.indexOf('\n];', s)); };
const lineOf = (src, id) => src.split('\n').find(l => l.includes(`id: '${id}'`));
const INDOOR = ['fp_owl_clock', 'fp_acorn_cupboard', 'fp_hedgehog_cushion'];

test('art ids match the forest picks', () => {
  assert.deepEqual(listOf('IDS'), INDOOR);
  assert.deepEqual(listOf('YARD_IDS'), ['fp_deer_mailbox']);
});

test('indoor picks are hidden keep decor, mailbox is a hidden quest outdoor', () => {
  const D = block('DECOR'), O = block('OUTDOOR');
  for (const id of INDOOR) {
    const l = lineOf(D, id);
    assert.ok(l, id);
    assert.match(l, /cost: 0, pay: 'coins', hidden: true, keep: true/);
    assert.match(l, /foot: \[/);
    assert.match(l, /desc: '/);
    assert.doesNotMatch(l, /\btop: \{|—/);
  }
  assert.match(lineOf(D, 'fp_hedgehog_cushion'), /sm: true, h: 0\.58/);
  assert.doesNotMatch(lineOf(D, 'fp_owl_clock'), /\bsm: true/);
  assert.doesNotMatch(lineOf(D, 'fp_acorn_cupboard'), /\bsm: true/);
  const m = lineOf(O, 'fp_deer_mailbox');
  assert.match(m, /cost: \{ coins: 9999 \}/);
  assert.match(m, /hidden: true, quest: true/);
  assert.match(m, /posts: \[\[0, 0, 0\.3\]\]/);
  assert.doesNotMatch(m, /—/);
});

test('tall picks stay under the ceiling', () => {
  const scale = Number(CAT.match(/DECOR_SCALE = ([\d.]+)/)[1]);
  assert.equal(ceilingOk(0, 1.66, scale), true);
  assert.equal(ceilingOk(0, 1.43, scale), true);
});

test('wired into indoor and yard mesh dispatch', () => {
  assert.match(IN, /FOREST_PICK_IDS\.includes\(id\)\) \{\n\s*g\.add\(buildForestPick\(id\)\)/);
  assert.match(GAME, /FOREST_PICK_YARD_IDS\.includes\(id\)\) \{\n\s*g\.add\(buildForestPick\(id\)\)/);
});

test('art is baked, no lights, no emissive, no comments', () => {
  assert.match(ART, /bakeGroup/);
  assert.doesNotMatch(ART, /PointLight|SpotLight|emissive/);
  assert.doesNotMatch(ART, /^\s*\/\/|\/\*/m);
});
