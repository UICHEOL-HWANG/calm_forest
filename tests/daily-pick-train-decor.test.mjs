import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ceilingOk } from '../js/house/surface.js';
import { postCircles } from '../js/world/outdoor-overlap.js';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const CAT = read('../js/data/catalog.js'), IN = read('../js/spaces/indoor.js'), GAME = read('../js/game.js'), ART = read('../js/decor-drops/art-train-pick.js');
const listOf = (src, name) => JSON.parse(src.match(new RegExp(`export const ${name} = (\\[[^\\]]*\\])`))[1].replace(/'/g, '"'));
const block = (name) => { const s = CAT.indexOf(`export const ${name} = [`); return CAT.slice(s, CAT.indexOf('\n];', s)); };
const lineOf = (src, id) => src.split('\n').find(l => l.includes(`id: '${id}'`));
const luma = h => (0.2126 * ((h >> 16) & 255) + 0.7152 * ((h >> 8) & 255) + 0.0722 * (h & 255)) / 255;
const INDOOR = ['tr_station_bench', 'tr_trunk', 'tr_mini_train'];
const YARD = ['tr_station_clock'];
const H = { tr_station_bench: 1.0, tr_trunk: 0.51, tr_mini_train: 0.38 };
const CLOCK_POSTS = [[0, 0, 0.2]];
const TALLEST_YARD = 2.63;

test('art ids match the train trip pick', () => {
  assert.deepEqual(listOf(ART, 'IDS'), INDOOR);
  assert.deepEqual(listOf(ART, 'YARD_IDS'), YARD);
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

test('station clock is a hidden quest yard item with its box and one post', () => {
  const l = lineOf(block('OUTDOOR'), 'tr_station_clock');
  assert.ok(l);
  assert.match(l, /cost: \{ coins: 9999 \}/);
  assert.match(l, /hidden: true, quest: true/);
  assert.match(l, /desc: '[^']+요'/);
  assert.doesNotMatch(l, /—|놀/);
  assert.ok(l.includes(`box: [0.6, 0.6], posts: ${JSON.stringify(CLOCK_POSTS).replace(/,/g, ', ')} }`));
  for (const ry of [0, 1, 2, 3]) for (const c of postCircles(CLOCK_POSTS, 0, 0, ry)) assert.ok(Math.abs(c.x) + c.r <= 0.3 && Math.abs(c.z) + c.r <= 0.3, `ry ${ry}`);
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

test('wired into indoor and yard mesh dispatch', () => {
  assert.match(IN, /TRAIN_PICK_IDS\.includes\(id\)\) \{\n\s*g\.add\(buildTrainPick\(id\)\)/);
  assert.match(GAME, /TRAIN_PICK_YARD_IDS\.includes\(id\)\) \{\n\s*g\.add\(buildTrainPick\(id\)\)/);
});

test('art is baked smooth, nothing glows, no lights, no comments, no sims imports', () => {
  assert.match(ART, /bakeGroup/);
  assert.match(ART, /flatShading: false/);
  assert.doesNotMatch(ART, /flatShading: true|PointLight|SpotLight|emissive|MeshBasicMaterial|userData\.flicker|sims\//);
  assert.doesNotMatch(ART, /^\s*\/\/|\/\*/m);
});

test('built meshes match the heights above and the clock is no taller than the tallest yard pick', async () => {
  const { register } = await import('node:module');
  const threeUrl = new URL('../vendor/three/three.module.js', import.meta.url).href;
  register(`data:text/javascript,export const resolve = (s, c, n) => s === 'three' ? { url: '${threeUrl}', shortCircuit: true } : n(s, c);`);
  const THREE = await import('three');
  const { build } = await import('../js/decor-drops/art-train-pick.js');
  for (const id of INDOOR) {
    const g = build(id), box = new THREE.Box3().setFromObject(g);
    assert.ok(box.max.y <= H[id] && box.min.y > -0.02, `${id} ${box.min.y} ${box.max.y}`);
    assert.equal(g.children.length, 1, id);
  }
  const clock = new THREE.Box3().setFromObject(build('tr_station_clock'));
  assert.ok(clock.max.y <= TALLEST_YARD && clock.max.y > 2.5, String(clock.max.y));
  assert.ok(clock.max.x <= 0.31 && clock.max.z <= 0.31, `${clock.max.x} ${clock.max.z}`);
  const { build: arch } = await import('../js/decor-drops/art-night-pick.js');
  assert.ok(new THREE.Box3().setFromObject(arch('ns_starlight_arch')).max.y >= TALLEST_YARD - 0.01);
});
