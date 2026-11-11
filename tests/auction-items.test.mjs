import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from '../vendor/three/three.module.js';
import { AUCTION_ITEM_IDS, auctionItemMesh } from '../js/auction/items.js';
import { AUCTION_POOL } from '../js/data/auction.js';

const meshes = g => { let n = 0; g.traverse(o => { if (o.isMesh) n++; }); return n; };

test('item ids match the pool', () => {
  assert.deepEqual(AUCTION_ITEM_IDS, AUCTION_POOL.map(p => p.id));
});

test('each item builds a grounded, small mesh group', () => {
  for (const id of AUCTION_ITEM_IDS) {
    const g = auctionItemMesh(THREE, id);
    assert.ok(g, id);
    assert.ok(meshes(g) <= 16, `${id} ${meshes(g)}`);
    const box = new THREE.Box3().setFromObject(g);
    assert.ok(Math.abs(box.min.y) < 0.05, `${id} min.y ${box.min.y}`);
    assert.ok(box.max.y < 2.6, `${id} max.y ${box.max.y}`);
  }
  assert.equal(auctionItemMesh(THREE, 'fence'), null);
  assert.ok(auctionItemMesh(THREE, 'starvane').userData.spin);
});

test('glow parts stay under the bloom budget', () => {
  for (const id of AUCTION_ITEM_IDS) auctionItemMesh(THREE, id).traverse(o => {
    if (o.isMesh && o.material.emissive && o.material.emissive.getHex() !== 0) assert.ok(o.material.emissiveIntensity <= 0.6, id);
  });
});

test('no lights inside items', () => {
  assert.doesNotMatch(readFileSync('js/auction/items.js', 'utf8'), /PointLight|SpotLight/);
});

test('catalog lists the three hidden auction items', () => {
  const cat = readFileSync('js/data/catalog.js', 'utf8');
  for (const id of AUCTION_ITEM_IDS) assert.match(cat, new RegExp(`id: '${id}'[^\\n]*hidden: true`));
});

test('catalog descriptions follow the approved auction copy', () => {
  const cat = readFileSync('js/data/catalog.js', 'utf8');
  assert.match(cat, /id: 'moonswing'[^\n]*desc: '경매에서 산 달빛 그네'/);
  assert.match(cat, /id: 'lanternarch'[^\n]*desc: '경매에서 산 등불 아치'/);
  assert.match(cat, /id: 'starvane'[^\n]*desc: '경매에서 산 별 풍향계'/);
});
