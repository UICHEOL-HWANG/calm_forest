import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from '../vendor/three/three.module.js';
import { SLED_SKINS } from '../js/mountain/sled-skins.js';
import { buildSledGeometry, buildSledMesh, setSledSkin } from '../js/mountain/sled-art.js';
import { SLED_SKIN_IDS } from '../js/mountain/save.js';

const colours = geo => {
  const c = geo.getAttribute('color'), out = new Set(), col = new THREE.Color();
  for (let i = 0; i < c.count; i++) out.add(col.setRGB(c.getX(i), c.getY(i), c.getZ(i)).getHex());
  return out;
};

test('four skins, matching the saved ids', () => {
  assert.deepEqual(Object.keys(SLED_SKINS), [...SLED_SKIN_IDS]);
});

test('each skin paints its own colours and the basic one is unchanged', () => {
  const basic = colours(buildSledGeometry(THREE));
  assert.ok(basic.has(0xb5793f) && basic.has(0xc8463c));
  for (const id of ['sky', 'forest', 'starry']) {
    const c = colours(buildSledGeometry(THREE, id));
    assert.ok(c.has(SLED_SKINS[id].wood), id);
    assert.ok(!c.has(0xb5793f), id);
  }
});

test('the starry sled adds star studs, the others keep the same vertex count', () => {
  const n = id => buildSledGeometry(THREE, id).getAttribute('position').count;
  assert.equal(n('sky'), n('basic'));
  assert.ok(n('starry') > n('basic'));
});

test('setSledSkin swaps geometry in place', () => {
  const m = buildSledMesh(THREE);
  const old = m.geometry;
  setSledSkin(m, THREE, 'forest');
  assert.notEqual(m.geometry, old);
  assert.ok(colours(m.geometry).has(SLED_SKINS.forest.wood));
});

test('the ride sled is painted from the saved colour when a run starts', () => {
  const src = readFileSync(new URL('../js/spaces/mountain.js', import.meta.url), 'utf8');
  const start = src.slice(src.indexOf('function startSled'), src.indexOf('\n}', src.indexOf('function startSled')));
  assert.match(start, /setSledSkin\(\$w\.mountainGroup\.userData\.sled, THREE, sledSkin\(\)\)/);
  assert.match(src, /sledSkin: sledSkin\(\)/);
});
