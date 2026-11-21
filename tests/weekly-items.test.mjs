import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MARKET_THEMES, MARKET_ITEM_IDS } from '../js/data/weekly.js';
import { WEEKLY_COPY } from '../js/weekly/copy.js';
import { hasItemArt, weeklyDecorMesh, ART_IDS } from '../js/weekly/items.js';
import { marketView } from '../js/weekly/ui.js';
import { weeklyDefault } from '../js/weekly/rules.js';
import { outdoorFootprint, postCircles } from '../js/world/outdoor-overlap.js';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const catalog = read('js/data/catalog.js');
const lineOf = (id) => catalog.split('\n').filter(l => l.includes(`id: '${id}'`));
const outdoorBlock = catalog.slice(catalog.indexOf('export const OUTDOOR'));
const decorBlock = catalog.slice(catalog.indexOf('export const DECOR'), catalog.indexOf('export const FISH_KINDS'));
const TEA = ['teadeck', 'teacups', 'bojagi'];
const FLOWER = ['flowercart', 'flowerpail', 'driedflowers'];
const SEASIDE = ['shellshade', 'glassbuoy', 'conchpot'];
const kindOf = (id) => MARKET_THEMES.flatMap(t => [t.hero, ...t.props]).find(i => i.id === id).kind;

test('every item with art is registered exactly once in the catalog and hidden', () => {
  for (const id of ART_IDS) {
    const lines = lineOf(id);
    assert.equal(lines.length, 1, id);
    assert.match(lines[0], /hidden: true/, id);
  }
});

test('items with art land in the right list: heroes outdoor, props indoor', () => {
  for (const id of ART_IDS) {
    const inOut = outdoorBlock.includes(`id: '${id}'`);
    const inDecor = decorBlock.includes(`id: '${id}'`);
    assert.equal(kindOf(id) === 'outdoor' ? inOut && !inDecor : inDecor && !inOut, true, id);
  }
});

test('the three tea items have art and catalog entries', () => {
  for (const id of TEA) {
    assert.ok(MARKET_ITEM_IDS.includes(id), id);
    assert.ok(hasItemArt(id), id);
    assert.equal(lineOf(id).length, 1, id);
  }
  assert.ok(outdoorBlock.includes("id: 'teadeck'"));
  assert.ok(decorBlock.includes("id: 'teacups'") && decorBlock.includes("id: 'bojagi'"));
});

test('the three flower items have art and catalog entries', () => {
  for (const id of FLOWER) {
    assert.ok(MARKET_ITEM_IDS.includes(id), id);
    assert.ok(hasItemArt(id), id);
    assert.equal(lineOf(id).length, 1, id);
  }
  assert.ok(outdoorBlock.includes("id: 'flowercart'"));
  assert.ok(decorBlock.includes("id: 'flowerpail'") && decorBlock.includes("id: 'driedflowers'"));
  assert.match(lineOf('flowercart')[0], /hidden: true/);
  assert.doesNotMatch(lineOf('flowercart')[0], /keep:/);
  for (const id of ['flowerpail', 'driedflowers']) assert.match(lineOf(id)[0], /hidden: true, keep: true/);
});

test('only the flower pail may sit on furniture; the wreath stands on the floor', () => {
  assert.match(lineOf('flowerpail')[0], /foot: \[0\.37, 0\.36\], sm: true, h: 0\.36/);
  assert.match(lineOf('driedflowers')[0], /foot: \[0\.58, 0\.6\]/);
  assert.doesNotMatch(lineOf('driedflowers')[0], /sm:/);
});

test('the three seaside items have art and catalog entries', () => {
  for (const id of SEASIDE) {
    assert.ok(MARKET_ITEM_IDS.includes(id), id);
    assert.ok(hasItemArt(id), id);
    assert.equal(lineOf(id).length, 1, id);
    assert.match(lineOf(id)[0], /hidden: true/, id);
  }
  assert.ok(outdoorBlock.includes("id: 'shellshade'"));
  assert.ok(decorBlock.includes("id: 'glassbuoy'") && decorBlock.includes("id: 'conchpot'"));
  assert.doesNotMatch(lineOf('shellshade')[0], /keep:/);
  for (const id of ['glassbuoy', 'conchpot']) assert.match(lineOf(id)[0], /hidden: true, keep: true/);
});

test('both seaside props fit the nightstand pad and carry a height', () => {
  assert.match(lineOf('glassbuoy')[0], /foot: \[0\.48, 0\.44\], sm: true, h: 0\.34/);
  assert.match(lineOf('conchpot')[0], /foot: \[0\.5, 0\.36\], sm: true, h: 0\.34/);
  assert.match(lineOf('shellshade')[0], /cost: \{ coins: 9999 \}/);
});

const BOOKS = ['bookstall', 'globe', 'inkquill'];

test('the three book items have art and catalog entries with the approved names', () => {
  for (const id of BOOKS) {
    assert.ok(MARKET_ITEM_IDS.includes(id), id);
    assert.ok(hasItemArt(id), id);
    assert.equal(lineOf(id).length, 1, id);
    assert.match(lineOf(id)[0], /hidden: true/, id);
    assert.ok(lineOf(id)[0].includes(`name: '${WEEKLY_COPY.items[id].name}'`), id);
  }
  assert.ok(outdoorBlock.includes("id: 'bookstall'"));
  assert.ok(decorBlock.includes("id: 'globe'") && decorBlock.includes("id: 'inkquill'"));
  assert.doesNotMatch(lineOf('bookstall')[0], /keep:/);
  for (const id of ['globe', 'inkquill']) assert.match(lineOf(id)[0], /hidden: true, keep: true/);
});

test('the book props fit the nightstand pad and carry a height', () => {
  assert.match(lineOf('globe')[0], /foot: \[0\.4, 0\.31\], sm: true, h: 0\.55/);
  assert.match(lineOf('inkquill')[0], /foot: \[0\.47, 0\.3\], sm: true, h: 0\.59/);
  assert.ok(0.4 <= 0.5 && 0.31 <= 0.45 && 0.47 <= 0.5 && 0.3 <= 0.45);
});

test('the book stall box covers the trunk and the side stack and turns with the item', async () => {
  const line = lineOf('bookstall')[0];
  assert.match(line, /cost: \{ coins: 9999 \}/);
  assert.match(line, /box: \[1\.8, 1\.08\]/);
  assert.deepEqual(outdoorFootprint('bookstall', 0, 0, 0, { defBox: [1.8, 1.08] }), { x1: -0.9, z1: -0.54, x2: 0.9, z2: 0.54 });
  assert.deepEqual(outdoorFootprint('bookstall', 0, 0, 1, { defBox: [1.8, 1.08] }), { x1: -0.54, z1: -0.9, x2: 0.54, z2: 0.9 });
  const THREE = await import('../vendor/three/three.module.js');
  const g = weeklyDecorMesh(THREE, 'bookstall');
  g.updateMatrixWorld(true);
  const v = new THREE.Vector3();
  const tol = 0.01;
  for (const m of g.children.filter(c => c.isMesh)) {
    const pos = m.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld);
      assert.ok(Math.abs(v.x) <= 0.9 + tol && Math.abs(v.z) <= 0.54 + tol, `${v.x.toFixed(3)} ${v.y.toFixed(2)} ${v.z.toFixed(3)}`);
    }
  }
});

const BAKERY = ['breadcart', 'baguettes', 'jamshelf'];

test('the three bakery items have art and catalog entries with the approved names', () => {
  for (const id of BAKERY) {
    assert.ok(MARKET_ITEM_IDS.includes(id), id);
    assert.ok(hasItemArt(id), id);
    assert.equal(lineOf(id).length, 1, id);
    assert.match(lineOf(id)[0], /hidden: true/, id);
    assert.ok(lineOf(id)[0].includes(`name: '${WEEKLY_COPY.items[id].name}'`), id);
  }
  assert.ok(outdoorBlock.includes("id: 'breadcart'"));
  assert.ok(decorBlock.includes("id: 'baguettes'") && decorBlock.includes("id: 'jamshelf'"));
  assert.doesNotMatch(lineOf('breadcart')[0], /keep:/);
  for (const id of ['baguettes', 'jamshelf']) assert.match(lineOf(id)[0], /hidden: true, keep: true/);
});

test('the long baguette basket sits on tables but not the nightstand; the jam shelf stands on the floor', () => {
  assert.match(lineOf('baguettes')[0], /foot: \[0\.71, 0\.38\], sm: true, h: 0\.37/);
  assert.match(lineOf('jamshelf')[0], /foot: \[0\.66, 0\.31\]/);
  assert.doesNotMatch(lineOf('jamshelf')[0], /sm:/);
  const host = (id) => catalog.split('\n').find(l => l.includes(`id: '${id}'`)).match(/top: \{ y: [\d.]+, pad: \[([\d.]+), ([\d.]+)\] \}/).slice(1).map(Number);
  const fits = ([w, d], [pw, pd]) => w / 2 <= pw / 2 && d / 2 <= pd / 2;
  assert.equal(fits([0.71, 0.38], host('table')), true);
  assert.equal(fits([0.71, 0.38], host('nightstand')), false);
  assert.equal(fits([0.71, 0.38], host('stool')), false);
});

test('the bread cart box keeps the player out of the oven and turns with the item', async () => {
  assert.match(lineOf('breadcart')[0], /cost: \{ coins: 9999 \}/);
  assert.match(lineOf('breadcart')[0], /box: \[1\.5, 1\]/);
  assert.deepEqual(outdoorFootprint('breadcart', 0, 0, 0, { defBox: [1.5, 1] }), { x1: -0.75, z1: -0.5, x2: 0.75, z2: 0.5 });
  assert.deepEqual(outdoorFootprint('breadcart', 0, 0, 1, { defBox: [1.5, 1] }), { x1: -0.5, z1: -0.75, x2: 0.5, z2: 0.75 });
  const THREE = await import('../vendor/three/three.module.js');
  const g = weeklyDecorMesh(THREE, 'breadcart');
  g.updateMatrixWorld(true);
  const v = new THREE.Vector3();
  let top = 0;
  for (const m of g.children.filter(c => c.isMesh)) {
    const pos = m.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld);
      top = Math.max(top, v.y);
      if (v.y >= 1.0) assert.ok(Math.abs(v.x) <= 0.75 && Math.abs(v.z) <= 0.5, `${v.x.toFixed(2)} ${v.y.toFixed(2)} ${v.z.toFixed(2)}`);
    }
  }
  assert.ok(top > 1.8);
  assert.equal(g.children.some(c => c.isMesh && c.name === 'lamp'), true);
});

const BUSKER = ['buskerstage', 'guitarstand', 'gramophone'];

test('the three busker items have art and catalog entries with the approved names', () => {
  for (const id of BUSKER) {
    assert.ok(MARKET_ITEM_IDS.includes(id), id);
    assert.ok(hasItemArt(id), id);
    assert.equal(lineOf(id).length, 1, id);
    assert.match(lineOf(id)[0], /hidden: true/, id);
    assert.ok(lineOf(id)[0].includes(`name: '${WEEKLY_COPY.items[id].name}'`), id);
  }
  assert.ok(outdoorBlock.includes("id: 'buskerstage'"));
  assert.ok(decorBlock.includes("id: 'guitarstand'") && decorBlock.includes("id: 'gramophone'"));
  assert.doesNotMatch(lineOf('buskerstage')[0], /keep:/);
  for (const id of ['guitarstand', 'gramophone']) assert.match(lineOf(id)[0], /hidden: true, keep: true/);
});

test('the gramophone fits the nightstand pad; the guitar stand stays on the floor under the ceiling', () => {
  assert.match(lineOf('gramophone')[0], /foot: \[0\.43, 0\.4\], sm: true, h: 0\.62/);
  assert.match(lineOf('guitarstand')[0], /foot: \[0\.48, 0\.54\]/);
  assert.doesNotMatch(lineOf('guitarstand')[0], /sm:/);
  assert.ok(0.43 / 2 <= 0.5 / 2 && 0.4 / 2 <= 0.45 / 2);
});

test('the busker stage is a solid circle with a box footprint that reserves the whole stage', async () => {
  const line = lineOf('buskerstage')[0];
  assert.match(line, /cost: \{ coins: 9999 \}/);
  assert.ok(line.includes('posts: [[0, 0, 1.02]]'));
  assert.ok(line.includes('box: [2.05, 2.05]'));
  assert.deepEqual(postCircles([[0, 0, 1.02]], 4, -3, 1), [{ x: 4, z: -3, r: 1.02 }]);
  assert.deepEqual(outdoorFootprint('buskerstage', 0, 0, 0, { defBox: [2.05, 2.05] }), { x1: -1.025, z1: -1.025, x2: 1.025, z2: 1.025 });
  const THREE = await import('../vendor/three/three.module.js');
  const g = weeklyDecorMesh(THREE, 'buskerstage');
  g.updateMatrixWorld(true);
  const v = new THREE.Vector3();
  let top = 0;
  for (const m of g.children.filter(c => c.isMesh)) {
    const pos = m.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld);
      top = Math.max(top, v.y);
      assert.ok(Math.hypot(v.x, v.z) <= 1.025, `${v.x.toFixed(3)} ${v.z.toFixed(3)}`);
      if (v.y > 0.3) assert.ok(Math.hypot(v.x, v.z) <= 1.02, `${v.x.toFixed(3)} ${v.y.toFixed(2)} ${v.z.toFixed(3)}`);
    }
  }
  assert.ok(top > 1.6);
});

test('every market item has a builder and a catalog entry, so no market item is without art', () => {
  assert.equal(MARKET_ITEM_IDS.length, 18);
  for (const id of MARKET_ITEM_IDS) {
    assert.ok(hasItemArt(id), id);
    assert.equal(lineOf(id).length, 1, id);
  }
  assert.deepEqual([...ART_IDS].sort(), [...MARKET_ITEM_IDS].sort());
});

const SHADE = { posts: [[-0.87, -0.61, 0.12], [0.87, -0.61, 0.12], [-0.87, 0.61, 0.12], [0.87, 0.61, 0.12]], box: [2.1, 1.6] };

test('the shade solids are posts only: the middle stays free and the catalog carries the same numbers', () => {
  const line = lineOf('shellshade')[0];
  assert.ok(line.includes('posts: [[-0.87, -0.61, 0.12], [0.87, -0.61, 0.12], [-0.87, 0.61, 0.12], [0.87, 0.61, 0.12]]'));
  assert.ok(line.includes('box: [2.1, 1.6]'));
  const c = postCircles(SHADE.posts, 10, 20, 0);
  assert.equal(c.length, 4);
  assert.ok(c.every(p => p.r === 0.12));
  assert.ok(c.every(p => Math.hypot(p.x - 10, p.z - 20) > 0.5));
  assert.deepEqual(c[0], { x: 9.13, z: 19.39, r: 0.12 });
});

test('the shade posts turn with the item through every 90 degree step', () => {
  const at = (ry) => postCircles([[2, 1, 0.1]], 0, 0, ry).map(p => [p.x, p.z]);
  assert.deepEqual(at(0), [[2, 1]]);
  assert.deepEqual(at(1), [[1, -2]]);
  assert.deepEqual(at(2), [[-2, -1]]);
  assert.deepEqual(at(3), [[-1, 2]]);
  assert.deepEqual(postCircles([[2, 1, 0.1]], 5, 7, 1), [{ x: 6, z: 5, r: 0.1 }]);
});

test('the shade still reserves its whole canopy for overlap, turned with the item', () => {
  assert.deepEqual(outdoorFootprint('shellshade', 0, 0, 0, { defBox: SHADE.box }), { x1: -1.05, z1: -0.8, x2: 1.05, z2: 0.8 });
  assert.deepEqual(outdoorFootprint('shellshade', 0, 0, 1, { defBox: SHADE.box }), { x1: -0.8, z1: -1.05, x2: 0.8, z2: 1.05 });
});

test('posts is used by the shade and the busker stage only and game.js turns it into circles before the box branch', () => {
  const withPosts = catalog.split('\n').filter(l => /\bposts:/.test(l) && !/id: '(noteflags|hornpost|wp_snowman|fp_deer_mailbox|xm_wreath_arch|ns_starlight_arch|ny_kite_stand)'/.test(l));
  assert.equal(withPosts.length, 2);
  assert.ok(withPosts[0].includes("id: 'buskerstage'") || withPosts[1].includes("id: 'buskerstage'"));
  assert.ok(withPosts[0].includes("id: 'shellshade'") || withPosts[1].includes("id: 'shellshade'"));
  const game = read('js/game.js');
  const iPosts = game.indexOf('else if (def.posts)');
  assert.ok(iPosts > 0 && iPosts < game.indexOf('else if (def.box)'));
  assert.match(game, /postCircles\(def\.posts, wx, wz, ry\)/);
  assert.match(game, /flatMap\(m => m\.userData\.solid \|\| \[\]\)/);
  assert.match(read('js/spaces/outdoor-decor.js'), /\[\]\.concat\(m\.userData\.solid \|\| \[\]\)\.forEach\(removeSolid\)/);
});

test('the shade has nothing between 0.05 and 1.9 high except its four posts', async () => {
  const THREE = await import('../vendor/three/three.module.js');
  const g = weeklyDecorMesh(THREE, 'shellshade');
  g.updateMatrixWorld(true);
  const v = new THREE.Vector3();
  let top = 0;
  for (const m of g.children.filter(c => c.isMesh)) {
    const pos = m.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld);
      top = Math.max(top, v.y);
      if (v.y <= 0.05 || v.y >= 1.9) continue;
      const onPost = SHADE.posts.some(([px, pz]) => Math.hypot(v.x - px, v.z - pz) <= 0.12);
      assert.equal(onPost, true, `${v.x.toFixed(2)} ${v.y.toFixed(2)} ${v.z.toFixed(2)}`);
    }
  }
  assert.ok(top > 2.2);
});

test('items without art are not in the catalog yet', () => {
  for (const id of MARKET_ITEM_IDS.filter(i => !hasItemArt(i))) assert.equal(lineOf(id).length, 0, id);
});

test('art ids are all market items and unknown ids give no mesh', () => {
  for (const id of ART_IDS) assert.ok(MARKET_ITEM_IDS.includes(id), id);
  assert.equal(weeklyDecorMesh({}, 'nope'), null);
  assert.equal(hasItemArt('nope'), false);
  assert.equal(hasItemArt('constructor'), false);
});

test('catalog names and descriptions match the approved market copy', () => {
  for (const id of ART_IDS) {
    const line = lineOf(id)[0];
    assert.ok(line.includes(`name: '${WEEKLY_COPY.items[id].name}'`), `${id} name`);
    if (kindOf(id) === 'outdoor') assert.ok(line.includes(`desc: '${WEEKLY_COPY.items[id].desc}'`), `${id} desc`);
  }
});

test('indoor items carry a footprint and a keep marker; small props carry a height', () => {
  for (const id of [...TEA, ...FLOWER, ...SEASIDE, ...BOOKS, ...BAKERY, ...BUSKER].filter(i => kindOf(i) === 'indoor')) {
    const line = lineOf(id)[0];
    assert.match(line, /foot: \[[\d.]+, [\d.]+\]/, id);
    assert.match(line, /keep: true/, id);
    if (!['driedflowers', 'jamshelf', 'guitarstand'].includes(id)) assert.match(line, /sm: true, h: [\d.]+/, id);
  }
});

test('the flower cart has a box so it is solid, and its footprint turns with it', () => {
  assert.match(lineOf('flowercart')[0], /box: \[1\.3, 1\]/);
  const fp = outdoorFootprint('flowercart', 0, 0, 0, { defBox: [1.3, 1] });
  assert.deepEqual(fp, { x1: -0.65, z1: -0.5, x2: 0.65, z2: 0.5 });
  const turned = outdoorFootprint('flowercart', 0, 0, 1, { defBox: [1.3, 1] });
  assert.deepEqual(turned, { x1: -0.5, z1: -0.65, x2: 0.5, z2: 0.65 });
});

test('the outdoor hero has a box so it is solid and cannot overlap the world', () => {
  assert.match(lineOf('teadeck')[0], /box: \[1\.64, 1\.14\]/);
  const fp = outdoorFootprint('teadeck', 0, 0, 0, { defBox: [1.64, 1.14] });
  assert.deepEqual(fp, { x1: -0.82, z1: -0.57, x2: 0.82, z2: 0.57 });
  const turned = outdoorFootprint('teadeck', 0, 0, 1, { defBox: [1.64, 1.14] });
  assert.deepEqual(turned, { x1: -0.57, z1: -0.82, x2: 0.57, z2: 0.82 });
});

test('game.js places box items as solid boxes and lists stored keep items', () => {
  const game = read('js/game.js');
  assert.match(game, /else if \(def\.box\)/);
  assert.match(game, /defBox: OUTDOOR\.find/);
  assert.match(game, /d\.set \|\| d\.keep/);
  assert.match(read('js/spaces/indoor.js'), /\(def\.set \|\| def\.keep\) && !fromStore/);
});

test('every shipped builder makes a few merged meshes with only the body casting shadows', async () => {
  const THREE = await import('../vendor/three/three.module.js');
  for (const id of ART_IDS) {
    const g = weeklyDecorMesh(THREE, id);
    const meshes = g.children.filter(c => c.isMesh);
    assert.ok(meshes.length >= 1 && meshes.length <= 3, id);
    for (const m of meshes) assert.equal(m.castShadow, m.name === 'body', `${id} ${m.name}`);
    assert.equal(meshes.some(m => m.name === 'lamp'), kindOf(id) === 'outdoor', id);
    assert.equal(g.userData.lamps.length, kindOf(id) === 'outdoor' ? 1 : 0, id);
  }
});

test('hidden items stay out of the regular shop lists', () => {
  const game = read('js/game.js');
  assert.match(game, /DECOR\.filter\(d => !d\.hidden\)/);
  assert.match(read('js/workbench/bench-view.js'), /\(!o\.hidden \|\| stored\[o\.id\] > 0\)/);
});

test('mesh lookups call weeklyDecorMesh at the outdoor and indoor sites', () => {
  assert.match(read('js/game.js'), /weeklyDecorMesh\(THREE, id\)/);
  assert.match(read('js/spaces/indoor.js'), /hasItemArt\(id\)/);
  assert.match(read('js/spaces/indoor.js'), /weeklyDecorMesh\(THREE, id\)/);
});

const theme = {
  id: 'synthetic',
  hero: { id: 'synth_hero', kind: 'outdoor', cost: 6 },
  props: [{ id: 'synth_a', kind: 'indoor', cost: 2 }, { id: 'synth_b', kind: 'indoor', cost: 2 }],
};
const none = () => false;
const stock = { ...weeklyDefault(), week: 2970, tickets: 15 };

test('market rows with no art are marked soon and offer no purchase', () => {
  const v = marketView(stock, theme, { open: true, isGuest: false, ownsDecor: none, hasArt: (id) => id !== 'synth_b' });
  assert.deepEqual(v.rows.map(r => r.status), ['buy', 'buy', 'soon']);
  const bare = marketView(stock, theme, { open: true, isGuest: false, ownsDecor: none, hasArt: hasItemArt });
  assert.ok(bare.rows.every(r => r.status === 'soon'));
});

test('a closed market stays closed whatever the art', () => {
  const v = marketView(stock, theme, { open: false, isGuest: false, ownsDecor: none, hasArt: none });
  assert.ok(v.rows.every(r => r.status === 'closed'));
});

test('guest sees guest status for rows with art and soon for rows without', () => {
  const v = marketView(stock, theme, { open: true, isGuest: true, ownsDecor: none, hasArt: (id) => id === 'synth_hero' });
  assert.deepEqual(v.rows.map(r => r.status), ['guest', 'soon', 'soon']);
});

test('the shipped market passes hasItemArt into the view and the dialog', () => {
  const idx = read('js/weekly/index.js');
  assert.match(idx, /hasArt: hasItemArt/);
  assert.match(read('js/weekly/ui.js'), /hasArt: args\.hasArt/);
});

test('every market theme row without art would be soon, with art buyable', () => {
  for (const t of MARKET_THEMES) {
    const v = marketView(stock, t, { open: true, isGuest: false, ownsDecor: none, hasArt: hasItemArt });
    for (const r of v.rows) assert.equal(r.status, hasItemArt(r.id) ? 'buy' : 'soon', r.id);
  }
});
