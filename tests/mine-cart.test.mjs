import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from '../vendor/three/three.module.js';
import { MINE_CART_ID, MINE_CART_BOX, CART_COLORS, buildMineCart } from '../js/delve/cart-art.js';
import { REWARD_DECOR, isRewardDecor } from '../js/data/reward-decor.js';
import { MINER_STEPS } from '../js/data/delve.js';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const luma = h => (0.2126 * ((h >> 16) & 255) + 0.7152 * ((h >> 8) & 255) + 0.0722 * (h & 255)) / 255;

test('🛒 광산 수레 조형은 한 덩이(드로우콜 1)이고 마당에 맞는 크기다', () => {
  const g = buildMineCart(THREE);
  const meshes = []; g.traverse(o => { if (o.isMesh) meshes.push(o); });
  assert.equal(meshes.length, 1);
  assert.ok(meshes[0].material.vertexColors);
  const size = new THREE.Box3().setFromObject(g).getSize(new THREE.Vector3());
  assert.ok(size.x > 2 && size.x < 2.5, `x ${size.x}`);
  assert.ok(size.y > 0.8 && size.y < 1.4, `y ${size.y}`);
  assert.ok(size.z < 1.1, `z ${size.z}`);
  assert.ok(MINE_CART_BOX.w <= size.x && MINE_CART_BOX.d <= size.z);
  for (const [k, c] of Object.entries(CART_COLORS)) for (const v of [c].flat()) assert.ok(luma(v) < 0.85, k);
});

test('🛒 광산 수레는 작업대 비판매 야외 장식이고 서버 보상 가드 목록 밖이다', () => {
  const cat = read('../js/data/catalog.js');
  const line = cat.split('\n').find(l => l.includes(`id: '${MINE_CART_ID}'`));
  assert.ok(line);
  assert.match(line, /name: '광산 수레', ico: '🛒'/);
  assert.match(line, /hidden: true, quest: 'delve'/);
  assert.ok(!REWARD_DECOR.some(d => d.id === MINE_CART_ID) && !isRewardDecor(MINE_CART_ID));
  assert.ok(!read('../sql/migrations/migrate_referrals.sql').includes(MINE_CART_ID));
  assert.equal(MINER_STEPS.find(s => s.reward.decor)?.reward.decor, MINE_CART_ID);
});

test('🛒 grantDecor 가 수레를 🧺 야외 보관함에 넣고, 배치 메시·충돌체가 있다', () => {
  const gs = read('../js/game.js');
  assert.match(gs, /import \{ MINE_CART_ID, MINE_CART_BOX, buildMineCart \} from '\.\/delve\/cart-art\.js'/);
  const grant = gs.slice(gs.indexOf('function grantDecor(id)'), gs.indexOf('export function getGameState'));
  assert.match(grant, /OUTDOOR\.some\(d => d\.id === id && d\.quest\)/);
  assert.match(grant, /gameState\.outdoorStored = \{ \.\.\.\(gameState\.outdoorStored \|\| \{\}\), \[id\]:/);
  assert.match(grant, /else return false;/);
  const om = gs.slice(gs.indexOf('function outdoorMesh(id)'));
  assert.match(om.slice(0, 20000), /id === MINE_CART_ID\) \{\n\s*g\.add\(buildMineCart\(THREE\)\)/);
  assert.match(gs, /id === MINE_CART_ID\) \{\n\s*const \[hw, hd\] = \(ry % 2\) \? \[MINE_CART_BOX\.d \/ 2, MINE_CART_BOX\.w \/ 2\]/);
});
