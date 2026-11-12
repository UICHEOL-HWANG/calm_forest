import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from '../vendor/three/three.module.js';
import { buildPromoGift } from '../js/spaces/promo-gift-art.js';
import { PROMO_DECOR_IDS } from '../js/promo-gift/rules.js';

const LIMIT = { promoballoon: { h: 4.2, w: 1.8 }, promosuitcase: { h: 1.2, w: 2.0 } };

for (const id of PROMO_DECOR_IDS) {
  test(`${id} 는 메시 1개로 합쳐지고 크기가 맞다`, () => {
    const g = buildPromoGift(THREE, id);
    const meshes = [];
    g.traverse(o => { if (o.isMesh) meshes.push(o); });
    assert.equal(meshes.length, 1, `${id} 메시 ${meshes.length}`);
    assert.ok(meshes[0].castShadow);
    const box = new THREE.Box3().setFromObject(g);
    assert.ok(box.min.y > -0.05, `${id} 바닥 아래 ${box.min.y}`);
    assert.ok(box.max.y < LIMIT[id].h, `${id} 높이 ${box.max.y}`);
    assert.ok(box.max.x - box.min.x < LIMIT[id].w && box.max.z - box.min.z < LIMIT[id].w, `${id} 너비`);
  });
}

test('모르는 id 는 null', () => {
  assert.equal(buildPromoGift(THREE, 'nope'), null);
});

test('game.js outdoorMesh 가 링크 선물 꾸미기를 그린다', () => {
  const src = readFileSync(new URL('../js/game.js', import.meta.url), 'utf8');
  assert.match(src, /import \{ buildPromoGift \} from '\.\/spaces\/promo-gift-art\.js';/);
  assert.match(src, /import \{ PROMO_DECOR_IDS \} from '\.\/promo-gift\/rules\.js';/);
  assert.match(src, /\} else if \(PROMO_DECOR_IDS\.includes\(id\)\) \{\n\s*g\.add\(buildPromoGift\(THREE, id\)\);/);
});
