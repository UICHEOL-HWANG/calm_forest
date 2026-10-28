import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from '../vendor/three/three.module.js';
import { SIGNUP_GIFT_IDS, buildSignupGift } from '../js/spaces/signup-gift-art.js';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

test('선물 꾸미기 id 3종', () => {
  assert.deepEqual([...SIGNUP_GIFT_IDS], ['giftsprout', 'giftmailbox', 'giftlantern']);
});

for (const id of ['giftsprout', 'giftmailbox', 'giftlantern']) {
  test(`${id} 는 메시 3개 이하로 합쳐진다`, () => {
    const g = buildSignupGift(THREE, id);
    const meshes = [];
    g.traverse(o => { if (o.isMesh) meshes.push(o); });
    assert.ok(meshes.length >= 1 && meshes.length <= 3, `${id} 메시 ${meshes.length}`);
    const box = new THREE.Box3().setFromObject(g);
    assert.ok(box.min.y > -0.05, `${id} 바닥 아래로 내려감 ${box.min.y}`);
    assert.ok(box.max.y < 2.2, `${id} 너무 큼 ${box.max.y}`);
  });
}

test('등불만 밤에 켜질 재질을 등록한다', () => {
  const lit = [];
  buildSignupGift(THREE, 'giftlantern', (m) => lit.push(m));
  assert.equal(lit.length, 1);
  const none = [];
  buildSignupGift(THREE, 'giftsprout', (m) => none.push(m));
  buildSignupGift(THREE, 'giftmailbox', (m) => none.push(m));
  assert.equal(none.length, 0);
});

test('모르는 id 는 null', () => {
  assert.equal(buildSignupGift(THREE, 'nope'), null);
});

test('game.js outdoorMesh 가 선물 꾸미기를 그린다', () => {
  const src = read('../js/game.js');
  assert.match(src, /import \{ SIGNUP_GIFT_IDS, buildSignupGift \} from '\.\/spaces\/signup-gift-art\.js'/);
  assert.ok(src.includes('SIGNUP_GIFT_IDS.includes(id)'));
  assert.ok(src.includes('buildSignupGift(THREE, id, (m) => houseWindows.push(m))'));
});
