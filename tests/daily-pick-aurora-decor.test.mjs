import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ceilingOk } from '../js/house/surface.js';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const CAT = read('../js/data/catalog.js'), IN = read('../js/spaces/indoor.js'), ART = read('../js/decor-drops/art-aurora-pick.js');
const listOf = (src, name) => JSON.parse(src.match(new RegExp(`export const ${name} = (\\[[^\\]]*\\])`))[1].replace(/'/g, '"'));
const block = (name) => { const s = CAT.indexOf(`export const ${name} = [`); return CAT.slice(s, CAT.indexOf('\n];', s)); };
const lineOf = (src, id) => src.split('\n').find(l => l.includes(`id: '${id}'`));
const footOf = (id) => JSON.parse(lineOf(block('DECOR'), id).match(/foot: (\[[^\]]+\])/)[1]);
const luma = h => (0.2126 * ((h >> 16) & 255) + 0.7152 * ((h >> 8) & 255) + 0.0722 * (h & 255)) / 255;
const INDOOR = ['au_igloo_lamp', 'au_ice_chair', 'au_polar_bear_plush', 'au_aurora_window'];
const H = { au_igloo_lamp: 0.57, au_ice_chair: 1.04, au_polar_bear_plush: 0.8, au_aurora_window: 1.05 };
const GLOWS = ['au_igloo_lamp', 'au_aurora_window'];

test('art ids match the aurora village pick, no yard items', () => {
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
    assert.ok(!lineOf(block('OUTDOOR'), id), id);
  }
});

test('indoor picks stay under the ceiling and the 1.86 top limit', () => {
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
  assert.match(IN, /AURORA_PICK_IDS\.includes\(id\)\) \{\n\s*g\.add\(buildAuroraPick\(id\)\)/);
});

test('art is baked smooth, glows steady, no lights, no comments, no sims imports', () => {
  assert.match(ART, /bakeGroup/);
  assert.match(ART, /flatShading: false/);
  assert.doesNotMatch(ART, /flatShading: true|PointLight|SpotLight|emissive|userData\.flicker|sims\//);
  assert.doesNotMatch(ART, /^\s*\/\/|\/\*/m);
});

test('built meshes match the heights and footprints above, only the lamp and window glow', async () => {
  const { register } = await import('node:module');
  const threeUrl = new URL('../vendor/three/three.module.js', import.meta.url).href;
  register(`data:text/javascript,export const resolve = (s, c, n) => s === 'three' ? { url: '${threeUrl}', shortCircuit: true } : n(s, c);`);
  const THREE = await import('three');
  const { build } = await import('../js/decor-drops/art-aurora-pick.js');
  for (const id of INDOOR) {
    const g = build(id), box = new THREE.Box3().setFromObject(g);
    assert.ok(box.max.y <= H[id] && box.min.y > -0.02, `${id} ${box.min.y} ${box.max.y}`);
    const [fw, fd] = footOf(id), w = box.max.x - box.min.x, d = box.max.z - box.min.z;
    assert.ok(Math.abs(fw - w) <= 0.07 && Math.abs(fd - d) <= 0.07, `${id} foot ${fw}x${fd} vs ${w.toFixed(2)}x${d.toFixed(2)}`);
    const glow = g.children.filter(c => c.material.type === 'MeshBasicMaterial');
    assert.equal(glow.length, GLOWS.includes(id) ? 1 : 0, id);
    assert.ok(!g.children.some(c => c.userData.flicker), id);
    assert.equal(g.children[0].material.type, 'MeshStandardMaterial', id);
  }
});
