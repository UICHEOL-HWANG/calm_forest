import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DAILY_PICK_POOL } from '../js/data/daily-pick.js';
import { ceilingOk } from '../js/house/surface.js';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const CAT = read('../js/data/catalog.js'), ART = read('../js/decor-drops/art-winter-pick.js');
const IN = read('../js/spaces/indoor.js'), GAME = read('../js/game.js'), EN = read('../js/i18n-en.js');
const listOf = (name) => JSON.parse(ART.match(new RegExp(`export const ${name} = (\\[[^\\]]*\\])`))[1].replace(/'/g, '"'));
const block = (name) => { const s = CAT.indexOf(`export const ${name} = [`); return CAT.slice(s, CAT.indexOf('\n];', s)); };
const lineOf = (src, id) => src.split('\n').find(l => l.includes(`id: '${id}'`));
const INDOOR = ['wp_hearth', 'wp_fur_rug', 'wp_cocoa_table'];

test('art ids match the decor picks', () => {
  assert.deepEqual(listOf('IDS'), INDOOR);
  assert.deepEqual(listOf('YARD_IDS'), ['wp_snowman']);
  assert.deepEqual([...INDOOR, 'wp_snowman'].sort(), DAILY_PICK_POOL.filter(p => p.kind === 'decor').map(p => p.id).sort());
});

test('indoor picks are hidden keep decor, snowman is a hidden quest outdoor', () => {
  const D = block('DECOR'), O = block('OUTDOOR');
  for (const id of INDOOR) {
    const l = lineOf(D, id);
    assert.ok(l, id);
    assert.match(l, /hidden: true/);
    assert.match(l, /keep: true/);
    assert.doesNotMatch(l, /\bsm: true|\btop: \{/);
  }
  assert.doesNotMatch(lineOf(D, 'wp_fur_rug'), /foot:/);
  const s = lineOf(O, 'wp_snowman');
  assert.match(s, /hidden: true/);
  assert.match(s, /quest: true/);
  assert.match(s, /posts: \[\[0, 0, 0\.4\]\]/);
});

test('tall picks stay under the ceiling', () => {
  const scale = Number(CAT.match(/DECOR_SCALE = ([\d.]+)/)[1]);
  assert.equal(ceilingOk(0, 1.14, scale), true);
  assert.equal(ceilingOk(0, 1.09, scale), true);
});

test('wired into indoor and yard mesh dispatch, names translated', () => {
  assert.match(IN, /WINTER_PICK_IDS\.includes\(id\)\) \{\n\s*g\.add\(buildWinterPick\(id\)\)/);
  assert.match(GAME, /WINTER_PICK_YARD_IDS\.includes\(id\)\) \{\n\s*g\.add\(buildWinterPick\(id\)\)/);
  for (const ko of ['작은 벽난로', '양털 러그', '핫초코 탁자', '목도리 두른 눈사람']) assert.match(EN, new RegExp(`'${ko}': '`));
});

test('art is baked, no lights, no comments, flame flickers', () => {
  assert.match(ART, /bakeGroup/);
  assert.doesNotMatch(ART, /PointLight|emissive/);
  assert.doesNotMatch(ART, /^\s*\/\/|\/\*/m);
  assert.match(ART, /userData\.flicker = true/);
});
