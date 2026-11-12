import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from '../vendor/three/three.module.js';
import { buildPromoGift, PROMO_SUITCASE_BOX } from '../js/spaces/promo-gift-art.js';
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

test('가방 더미는 놓는 지점 기준 가운데 정렬이고 충돌 상자가 몸통 안쪽에 맞는다', () => {
  const box = new THREE.Box3().setFromObject(buildPromoGift(THREE, 'promosuitcase'));
  assert.ok(Math.abs((box.min.x + box.max.x) / 2) < 0.03, `x 중심 ${(box.min.x + box.max.x) / 2}`);
  assert.ok(Math.abs((box.min.z + box.max.z) / 2) < 0.03, `z 중심 ${(box.min.z + box.max.z) / 2}`);
  const w = box.max.x - box.min.x, d = box.max.z - box.min.z;
  assert.ok(PROMO_SUITCASE_BOX.w <= w && PROMO_SUITCASE_BOX.w >= w - 0.15, `w ${PROMO_SUITCASE_BOX.w} vs ${w}`);
  assert.ok(PROMO_SUITCASE_BOX.d <= d && PROMO_SUITCASE_BOX.d >= d - 0.15, `d ${PROMO_SUITCASE_BOX.d} vs ${d}`);
});

test('열기구는 땅에 닿는 말뚝만 정원등 크기(0.22) 안에 있다', () => {
  const pos = buildPromoGift(THREE, 'promoballoon').children[0].geometry.attributes.position;
  const v = new THREE.Vector3();
  let r = 0;
  for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i); if (v.y < 1.2) r = Math.max(r, Math.hypot(v.x, v.z)); }
  assert.ok(r <= 0.22, `말뚝 반지름 ${r}`);
});

test('game.js 가 가방 더미는 회전에 맞춘 상자, 열기구는 작은 원으로 막는다', () => {
  const src = readFileSync(new URL('../js/game.js', import.meta.url), 'utf8');
  assert.match(src, /import \{ buildPromoGift, PROMO_SUITCASE_BOX \} from '\.\/spaces\/promo-gift-art\.js';/);
  assert.match(src, /\} else if \(id === 'promosuitcase'\) \{\n\s*const \[hw, hd\] = \(ry % 2\) \? \[PROMO_SUITCASE_BOX\.d \/ 2, PROMO_SUITCASE_BOX\.w \/ 2\] : \[PROMO_SUITCASE_BOX\.w \/ 2, PROMO_SUITCASE_BOX\.d \/ 2\];\n\s*solid = solidBox\(wx - hw, wz - hd, wx \+ hw, wz \+ hd\);/);
  const list = src.match(/\} else solid = \[([^\]]*)\]\.includes\(id\) \? solidCircle\(wx, wz, \[([^\]]*)\]\.includes\(id\) \? 0\.22 : 0\.5\)/);
  assert.ok(list, 'solid 목록 줄을 못 찾음');
  assert.ok(list[1].includes("'promoballoon'"), '막는 목록에 열기구 없음');
  assert.ok(list[2].includes("'promoballoon'"), '작은 원 목록에 열기구 없음');
  assert.match(src, /suitcaseBox: PROMO_SUITCASE_BOX/);
});

test('game.js outdoorMesh 가 링크 선물 꾸미기를 그린다', () => {
  const src = readFileSync(new URL('../js/game.js', import.meta.url), 'utf8');
  assert.match(src, /import \{ PROMO_DECOR_IDS \} from '\.\/promo-gift\/rules\.js';/);
  assert.match(src, /\} else if \(PROMO_DECOR_IDS\.includes\(id\)\) \{\n\s*g\.add\(buildPromoGift\(THREE, id\)\);/);
});
