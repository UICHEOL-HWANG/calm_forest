// tests/halloween-skin-rules.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { skinPartVisible, sproutVisible } from '../js/cosmetics/skin-rules.js';
import { SKIN_IDS } from '../js/cosmetics/skin.js';

const empty = { equipped: { head: null, back: null } };
const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

test('머리 부위 — 머리 칸이 비었을 때만(새싹·후드 끝·마녀 모자)', () => {
  for (const part of ['sprout', 'skinhead']) {
    assert.equal(skinPartVisible(part, empty), true, part);
    assert.equal(skinPartVisible(part, { equipped: { head: 'cap' } }), false, part);
  }
});

test('등 부위 — 등 칸이 비었을 때만(별밤 망토·빗자루)', () => {
  assert.equal(skinPartVisible('skinback', empty), true);
  assert.equal(skinPartVisible('skinback', { equipped: { back: 'pack' } }), false);
});

test('그 외 부위·null 꾸미기는 늘 보인다 · sproutVisible 은 그대로', () => {
  assert.equal(skinPartVisible('belly', { equipped: { head: 'cap', back: 'cape' } }), true);
  assert.equal(skinPartVisible('skinhead', null), true);
  assert.equal(sproutVisible({ equipped: { head: 'cap' } }), false);
});

test('SKIN_IDS 4종 추가 · applySkin 이 모두 디스패치 · game.js 는 showSkinParts 를 쓴다', () => {
  const ids = ['ghost_nightcap', 'ghost_cloud', 'witch_classic', 'witch_starry'];
  for (const id of ids) assert.ok(SKIN_IDS.includes(id), id);
  const skin = read('../js/cosmetics/skin.js');
  for (const id of ids) assert.match(skin, new RegExp(`skinId === '${id}'`), id);
  assert.match(skin, /export function showSkinParts\(group, cos\)/);
  const game = read('../js/game.js');
  assert.match(game, /showSkinParts\(charGroup, cos\)/);
  assert.match(game, /showSkinParts\(built\.group, cos\)/);
});
