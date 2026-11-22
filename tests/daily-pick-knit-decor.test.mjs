import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ceilingOk } from '../js/house/surface.js';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const CAT = read('../js/data/catalog.js'), IN = read('../js/spaces/indoor.js'), ART = read('../js/decor-drops/art-knit-pick.js');
const listOf = (src, name) => JSON.parse(src.match(new RegExp(`export const ${name} = (\\[[^\\]]*\\])`))[1].replace(/'/g, '"'));
const block = (name) => { const s = CAT.indexOf(`export const ${name} = [`); return CAT.slice(s, CAT.indexOf('\n];', s)); };
const lineOf = (src, id) => src.split('\n').find(l => l.includes(`id: '${id}'`));
const luma = h => (0.2126 * ((h >> 16) & 255) + 0.7152 * ((h >> 8) & 255) + 0.0722 * (h & 255)) / 255;
const INDOOR = ['kn_rocking_chair', 'kn_yarn_basket', 'kn_patch_rug', 'kn_knit_pot'];
const H = { kn_rocking_chair: 1.1, kn_yarn_basket: 0.65, kn_patch_rug: 0.04, kn_knit_pot: 0.89 };

test('art ids match the knitting pick, no yard items', () => {
  assert.deepEqual(listOf(ART, 'IDS'), INDOOR);
  assert.deepEqual(listOf(ART, 'YARD_IDS'), []);
});

test('indoor picks are hidden keep decor with desc, rug has no foot like other rugs', () => {
  const D = block('DECOR');
  for (const id of INDOOR) {
    const l = lineOf(D, id);
    assert.ok(l, id);
    assert.match(l, /cost: 0, pay: 'coins', hidden: true, keep: true, /);
    assert.match(l, /desc: '[^']+요' \}/);
    assert.doesNotMatch(l, /\btop: \{|\bsm: true|—|놀/);
    if (id === 'kn_patch_rug') assert.doesNotMatch(l, /foot:/);
    else assert.match(l, /foot: \[/);
  }
  for (const id of INDOOR) assert.ok(!lineOf(block('OUTDOOR'), id), id);
});

test('tall indoor picks stay under the ceiling and the 1.86 top limit', () => {
  const scale = Number(CAT.match(/DECOR_SCALE = ([\d.]+)/)[1]);
  for (const h of Object.values(H)) {
    assert.equal(ceilingOk(0, h, scale), true, String(h));
    assert.ok(h * scale + 0.2 <= 1.86, String(h));
  }
});

test('palette stays under the bright luma cap', () => {
  const hexes = ART.match(/const C = \{[\s\S]*?\n\};/)[0].match(/0x[0-9a-f]{6}/g);
  for (const h of hexes) assert.ok(luma(parseInt(h, 16)) <= 0.85, h);
});

test('wired into indoor mesh dispatch', () => {
  assert.match(IN, /KNIT_PICK_IDS\.includes\(id\)\) \{\n\s*g\.add\(buildKnitPick\(id\)\)/);
});

test('art is baked smooth, nothing glows, no lights, no comments, no sims imports', () => {
  assert.match(ART, /bakeGroup/);
  assert.match(ART, /flatShading: false/);
  assert.doesNotMatch(ART, /flatShading: true|PointLight|SpotLight|emissive|MeshBasicMaterial|userData\.flicker|sims\//);
  assert.doesNotMatch(ART, /^\s*\/\/|\/\*/m);
});

test('built meshes match the heights above', async () => {
  const { register } = await import('node:module');
  const threeUrl = new URL('../vendor/three/three.module.js', import.meta.url).href;
  register(`data:text/javascript,export const resolve = (s, c, n) => s === 'three' ? { url: '${threeUrl}', shortCircuit: true } : n(s, c);`);
  const THREE = await import('three');
  const { build } = await import('../js/decor-drops/art-knit-pick.js');
  for (const id of INDOOR) {
    const g = build(id), box = new THREE.Box3().setFromObject(g);
    assert.ok(box.max.y <= H[id] && box.min.y > -0.02, `${id} ${box.min.y} ${box.max.y}`);
    assert.equal(g.children.length, 1, id);
  }
  const rug = new THREE.Box3().setFromObject(build('kn_patch_rug'));
  assert.ok(rug.max.x - rug.min.x > 1.3 && rug.max.y < 0.05);
});
