import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { LIMBS } from '../js/world/tree-art.js';
import { BRANCH_IDS } from '../js/world/tree-board.js';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

test('세계수 판 탭은 가지 수만큼 한 줄', () => {
  assert.match(read('index.html'), new RegExp(`#tb-tabs \\{ display: grid; grid-template-columns: repeat\\(${BRANCH_IDS.length}, minmax\\(0, 1fr\\)\\)`));
});

test('탭은 상태 점 + 이모지만, 이름은 툴팁·읽기 라벨로', () => {
  const ui = read('js/world/tree-board-ui.js');
  assert.match(ui, /t\.append\(el\('i', 'tb-dot'\), el\('span', 'tb-ico', b\.ico\)\);/);
  assert.match(ui, /t\.setAttribute\('aria-label', b\.name\);/);
  assert.doesNotMatch(ui, /tb-tab-name/);
  assert.doesNotMatch(read('index.html'), /\.tb-tab > span:not\(\.tb-tab-name\) \{ display: none; \}/);
});

test('나무 가지는 판 가지와 1:1 · 처음 5갈래는 72° 그대로 · ❄️ 눈은 숲과 광산 사이', () => {
  assert.equal(BRANCH_IDS.length, 6);
  assert.deepEqual(Object.keys(LIMBS).sort(), [...BRANCH_IDS].sort());
  const deg = (id) => (Math.round(Math.atan2(LIMBS[id].dir[1], LIMBS[id].dir[0]) * 180 / Math.PI) + 360) % 360;
  const five = ['water', 'farm', 'kitchen', 'forest', 'mine'];
  const all = five.map(deg).sort((a, b) => a - b);
  for (let i = 0; i < all.length; i++) assert.equal((all[(i + 1) % all.length] - all[i] + 360) % 360, 72);
  assert.equal(deg('mine'), 270);
  assert.ok(deg('snow') > Math.min(deg('forest'), deg('mine')) && deg('snow') < Math.max(deg('forest'), deg('mine')), `${deg('forest')} ${deg('snow')} ${deg('mine')}`);
});
