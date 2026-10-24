import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from '../vendor/three/three.module.js';
import { SLED_IDS, SLED_LINEUP } from '../js/mountain/sled-lineup.js';
import { SLED_DECK_TOP, buildSledGeometry, buildSledMesh, deckTopOf, setSledSkin } from '../js/mountain/sled-art.js';
import { SLED_LIFT, sledSeat } from '../js/mountain/sled-view.js';

const colours = geo => {
  const c = geo.getAttribute('color'), out = new Set(), col = new THREE.Color();
  for (let i = 0; i < c.count; i++) out.add(col.setRGB(c.getX(i), c.getY(i), c.getZ(i)).getHex());
  return out;
};

const firstColour = id => Object.values(SLED_LINEUP[id].palette).find(v => typeof v === 'number');

test('every lineup sled builds one coloured geometry under the vertex budget', () => {
  for (const id of SLED_IDS) {
    const g = buildSledGeometry(THREE, id);
    assert.ok(g.getAttribute('color'), id);
    assert.ok(g.getAttribute('position').count <= 6000, id);
    assert.ok(g.getAttribute('position').count > 300, id);
  }
});

test('models differ in silhouette length', () => {
  const len = id => { const g = buildSledGeometry(THREE, id); g.computeBoundingBox(); return g.boundingBox.max.z - g.boundingBox.min.z; };
  assert.ok(len('skiff') > len('acorn'));
});

test('geometry keeps position, normal and colour only, non-indexed', () => {
  for (const id of SLED_IDS) {
    const g = buildSledGeometry(THREE, id);
    assert.deepEqual(Object.keys(g.attributes).sort(), ['color', 'normal', 'position'], id);
    assert.equal(g.index, null, id);
  }
});

test('each sled paints its own palette and unknown ids fall back to basic', () => {
  for (const id of SLED_IDS) assert.ok(colours(buildSledGeometry(THREE, id)).has(firstColour(id)), id);
  const basicWood = SLED_LINEUP.basic.palette.wood;
  for (const id of ['sky', 'forest', 'starry']) assert.ok(!colours(buildSledGeometry(THREE, id)).has(basicWood), id);
  const n = id => buildSledGeometry(THREE, id).getAttribute('position').count;
  assert.equal(n('nope'), n('basic'));
  assert.equal(n(), n('basic'));
});

test('stripes and acorn eyes use the two-tone cream and dark', () => {
  for (const id of ['toboggan', 'acorn', 'skiff']) assert.ok(colours(buildSledGeometry(THREE, id)).has(0xfff6ea), id);
  assert.ok(colours(buildSledGeometry(THREE, 'acorn')).has(SLED_LINEUP.acorn.palette.dark));
});

test('the starry sled adds star studs, the other davos skins share one shape', () => {
  const n = id => buildSledGeometry(THREE, id).getAttribute('position').count;
  assert.equal(n('sky'), n('basic'));
  assert.equal(n('forest'), n('basic'));
  assert.ok(n('starry') > n('basic'));
});

test('sleds sit on the ground', () => {
  for (const id of SLED_IDS) {
    const g = buildSledGeometry(THREE, id);
    g.computeBoundingBox();
    assert.ok(Math.abs(g.boundingBox.min.y) < 0.04, `${id} min y ${g.boundingBox.min.y}`);
    assert.ok(g.boundingBox.max.y < 1, id);
  }
});

test('deck tops are per model, inside the hull, and drive the seat height', () => {
  for (const id of SLED_IDS) {
    const g = buildSledGeometry(THREE, id);
    g.computeBoundingBox();
    const top = deckTopOf(id);
    assert.ok(top > 0.1 && top < g.boundingBox.max.y, `${id} deck ${top}`);
    assert.equal(sledSeat(id), SLED_LIFT + top);
  }
  assert.equal(deckTopOf('nope'), deckTopOf('basic'));
  assert.equal(SLED_DECK_TOP, deckTopOf('basic'));
  assert.ok(deckTopOf('acorn') > deckTopOf('basic'));
  assert.ok(deckTopOf('toboggan') < deckTopOf('skiff'));
});

test('setSledSkin swaps geometry in place', () => {
  const m = buildSledMesh(THREE);
  const old = m.geometry;
  setSledSkin(m, THREE, 'acorn');
  assert.notEqual(m.geometry, old);
  assert.ok(colours(m.geometry).has(SLED_LINEUP.acorn.palette.nut));
});

test('the ride sled is painted from the saved colour when a run starts', () => {
  const src = readFileSync(new URL('../js/spaces/mountain.js', import.meta.url), 'utf8');
  const start = src.slice(src.indexOf('function startSled'), src.indexOf('\n}', src.indexOf('function startSled')));
  assert.match(start, /run\.sledId = sledSkin\(\)/);
  assert.ok(start.indexOf('run.sledId = ') < start.indexOf('createSled('));
  assert.equal(start.match(/sledSkin\(\)/g).length, 1);
  assert.match(start, /createSled\([^\n]*physOf\(run\.sledId\)(, \{[^\n]*\})?\)/);
  assert.match(start, /setSledSkin\(\$w\.mountainGroup\.userData\.sled, THREE, run\.sledId\)/);
  assert.match(start, /run\.seat = sledSeat\(run\.sledId\)/);
  assert.ok(start.indexOf('run.seat') < start.indexOf('rideSlope('));
  assert.match(src, /sledSkin: run\.sledId \?\? sledSkin\(\)/);
});
