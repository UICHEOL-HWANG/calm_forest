import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { outdoorFootprint } from '../js/world/outdoor-overlap.js';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

test('꾸미기 2종: 작업대에선 숨기고 보관함으로만 꺼낸다', () => {
  const src = read('js/data/catalog.js');
  assert.match(src, /id: 'winterfountain', +name: '꼬마 분수', +ico: '⛲', cost: \{ coins: 9999 \}, desc: '겨울 분수를 다 지은 선물', hidden: true, box: \[1\.5, 1\.5\] \}/);
  assert.match(src, /id: 'winterlamp', +name: '겨울 등불', +ico: '🏮', cost: \{ coins: 9999 \}, desc: '마을 등불 선물\. 밤에 빛나요', hidden: true \}/);
});

test('겨울 등불은 작은 기물로 막힌다, 꼬마 분수는 box 로', () => {
  const line = read('js/game.js').split('\n').find(l => l.includes("} else solid = ['fence'"));
  assert.equal((line.match(/'winterlamp'/g) || []).length, 2);
  assert.deepEqual(outdoorFootprint('winterlamp', 1, 2, 0), { x: 1, z: 2, r: 0.22 });
});

test('광장 장식 메시가 겨울 2종을 안다', () => {
  const src = read('js/plaza/decor.js');
  assert.ok(src.includes('winterfountain: yardFountainMesh'));
  assert.ok(src.includes('winterlamp: yardLampMesh'));
});
