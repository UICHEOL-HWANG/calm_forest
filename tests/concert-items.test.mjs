import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from '../vendor/three/three.module.js';
import { CONCERT_DECOR } from '../js/data/concert.js';
import { hasConcertArt, concertDecorMesh } from '../js/concert/items.js';

const catalog = readFileSync(new URL('../js/data/catalog.js', import.meta.url), 'utf8');
const lineOf = (id) => catalog.split('\n').filter(l => l.includes(`id: '${id}'`));
const outdoorBlock = catalog.slice(catalog.indexOf('export const OUTDOOR'));
const decorBlock = catalog.slice(catalog.indexOf('export const DECOR'), catalog.indexOf('export const FISH_KINDS'));

test('all six decor items have art and at most three meshes', () => {
  for (const { id } of CONCERT_DECOR) {
    assert.equal(hasConcertArt(id), true, id);
    const g = concertDecorMesh(THREE, id);
    let meshes = 0;
    g.traverse(o => { if (o.isMesh) meshes += 1; });
    assert.ok(meshes >= 1 && meshes <= 3, `${id} ${meshes}`);
    assert.ok(Array.isArray(g.userData.lamps), id);
  }
  assert.equal(hasConcertArt('nope'), false);
  assert.equal(concertDecorMesh(THREE, 'nope'), null);
});

test('every item is in the catalog once and hidden from the coin shop', () => {
  for (const { id, kind } of CONCERT_DECOR) {
    const lines = lineOf(id);
    assert.equal(lines.length, 1, id);
    assert.match(lines[0], /hidden: true/, id);
    if (kind === 'indoor') {
      assert.match(lines[0], /keep: true/, id);
      assert.ok(decorBlock.includes(`id: '${id}'`) && !outdoorBlock.includes(`id: '${id}'`), id);
    } else {
      assert.ok(outdoorBlock.includes(`id: '${id}'`) && !decorBlock.includes(`id: '${id}'`), id);
    }
  }
});
