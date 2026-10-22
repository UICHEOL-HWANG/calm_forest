import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const html = read('index.html');
const steps = html.slice(html.indexOf('const TUT_STEPS = ['), html.indexOf('let tutIdx = -1;'));

test('튜토리얼은 1장 길(집 → 꾸미기 → 다리 → 할아버지) 순서다', () => {
  const keys = [...steps.matchAll(/key: '([a-z0-9]+)'/g)].map(m => m[1]);
  assert.deepEqual(keys, ['move', 'chop', 'sell', 'mine', 'house1', 'house2', 'harvest', 'build', 'dress', 'bridge', 'curator']);
});

test('단계마다 완료 신호가 이어져 있다', () => {
  assert.match(read('js/spaces/house.js'), /if \(stage === 1 \|\| stage === 2\) ui\.act\?\.\(`house\$\{stage\}`\);/);
  assert.match(read('js/spaces/bridge.js'), /ui\.act\?\.\('bridge'\);/);
  assert.match(read('js/spaces/npc.js'), /if \(view\.npc\.id === 'curator'\) ui\.act\?\.\('curator'\);/);
  assert.match(read('js/spaces/mine.js'), /ui\.act\?\.\('mine'\);/);
});

test('이미 해 둔 단계는 건너뛰고, 옛 단계에서 이어하면 새 길의 자리로 옮긴다', () => {
  for (const k of ["sell: () => Input.hintSeen('merchantArrived')", 'mine: () => Input.houseStage() >= 2', 'harvest: () => Input.houseStage() >= 3', 'house1: () => Input.houseStage() >= 1', 'house2: () => Input.houseStage() >= 2', 'build: () => Input.houseStage() >= 3',
    'dress: () => (Input.cosOwnedCount?.() || 0) > 0', 'bridge: () => !!Input.bridgeFixed?.()']) assert.ok(html.includes(k), k);
  assert.match(html, /const key = TUT_OLD_KEYS\[fromKey\] \|\| fromKey;/);
  for (const old of ['toolpage', 'till', 'seed', 'water', 'market', 'quest', 'carve', 'dex', 'fish', 'enter']) assert.match(html, new RegExp(`${old}: '`), old);
});

test('문구에 엠대시가 없다', () => {
  for (const m of steps.matchAll(/text: [^\n]+/g)) assert.ok(!m[0].includes('—'), m[0]);
});
