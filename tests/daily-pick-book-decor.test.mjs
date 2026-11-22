import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ceilingOk } from '../js/house/surface.js';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const CAT = read('../js/data/catalog.js'), IN = read('../js/spaces/indoor.js'), ART = read('../js/decor-drops/art-book-pick.js');
const listOf = (src, name) => JSON.parse(src.match(new RegExp(`export const ${name} = (\\[[^\\]]*\\])`))[1].replace(/'/g, '"'));
const block = (name) => { const s = CAT.indexOf(`export const ${name} = [`); return CAT.slice(s, CAT.indexOf('\n];', s)); };
const lineOf = (src, id) => src.split('\n').find(l => l.includes(`id: '${id}'`));
const luma = h => (0.2126 * ((h >> 16) & 255) + 0.7152 * ((h >> 8) & 255) + 0.0722 * (h & 255)) / 255;
const INDOOR = ['bk_bookshelf', 'bk_reading_lamp', 'bk_reading_chair', 'bk_globe'];

test('art ids match the bookshop pick, no yard items', () => {
  assert.deepEqual(listOf(ART, 'IDS'), INDOOR);
  assert.deepEqual(listOf(ART, 'YARD_IDS'), []);
});

test('indoor picks are hidden keep decor with foot and desc', () => {
  const D = block('DECOR');
  for (const id of INDOOR) {
    const l = lineOf(D, id);
    assert.ok(l, id);
    assert.match(l, /cost: 0, pay: 'coins', hidden: true, keep: true, foot: \[/);
    assert.match(l, /desc: '[^']+요' \}/);
    assert.doesNotMatch(l, /\btop: \{|\bsm: true|—|놀/);
  }
  for (const id of INDOOR) assert.ok(!lineOf(block('OUTDOOR'), id), id);
});

test('tall indoor picks stay under the ceiling', () => {
  const scale = Number(CAT.match(/DECOR_SCALE = ([\d.]+)/)[1]);
  for (const h of [1.09, 1.03, 0.82, 1.07]) assert.equal(ceilingOk(0, h, scale), true, String(h));
});

test('palette stays under the bright luma cap', () => {
  const hexes = ART.match(/const C = \{[\s\S]*?\n\};/)[0].match(/0x[0-9a-f]{6}/g);
  for (const h of hexes) assert.ok(luma(parseInt(h, 16)) <= 0.85, h);
});

test('wired into indoor mesh dispatch', () => {
  assert.match(IN, /BOOK_PICK_IDS\.includes\(id\)\) \{\n\s*g\.add\(buildBookPick\(id\)\)/);
});

test('art is baked smooth, lamp glows by flicker rows, no lights, no comments, no sims imports', () => {
  assert.match(ART, /bakeGroup/);
  assert.match(ART, /flatShading: false/);
  assert.doesNotMatch(ART, /flatShading: true|PointLight|SpotLight|emissive|sims\//);
  assert.doesNotMatch(ART, /^\s*\/\/|\/\*/m);
  assert.match(ART, /MeshBasicMaterial\(\{ vertexColors: true \}\)\); m\.position\.y = k \/ 10; m\.userData\.flicker = true/);
});

test('built meshes match the heights above and only the lamp glows', async () => {
  const { register } = await import('node:module');
  const threeUrl = new URL('../vendor/three/three.module.js', import.meta.url).href;
  register(`data:text/javascript,export const resolve = (s, c, n) => s === 'three' ? { url: '${threeUrl}', shortCircuit: true } : n(s, c);`);
  const THREE = await import('three');
  const { build } = await import('../js/decor-drops/art-book-pick.js');
  const H = { bk_bookshelf: 1.09, bk_reading_lamp: 1.03, bk_reading_chair: 0.82, bk_globe: 1.07 };
  for (const id of INDOOR) {
    const g = build(id), box = new THREE.Box3().setFromObject(g);
    assert.ok(box.max.y <= H[id] + 0.01 && box.min.y > -0.02, `${id} ${box.min.y} ${box.max.y}`);
    assert.equal(g.children.some(c => c.userData.flicker), id === 'bk_reading_lamp', id);
  }
});
