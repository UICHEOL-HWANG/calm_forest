import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SPROUT_IDS, SPROUT_PREMIUM_PICK, sproutOpen, shopRows, defaultCosTab } from '../js/cosmetics/sprout.js';
import { findItem } from '../js/cosmetics/catalog.js';

const cos = (owned = []) => ({ owned, equipped: {} });

test('새싹반 3종 id', () => {
  assert.deepEqual(SPROUT_IDS, ['kinder_hat', 'tulip_tag', 'kinder_bag']);
  assert.ok(findItem(SPROUT_PREMIUM_PICK).premium);
});

test('새싹반 탭 줄 = 3종 + 💎 미리보기 1줄', () => {
  assert.deepEqual(shopRows('sprout').map(i => i.id), [...SPROUT_IDS, SPROUT_PREMIUM_PICK]);
});

test('머리·목·가방 탭에는 새싹반이 겹쳐 나오지 않고 오두막 전용도 빠진다', () => {
  for (const slot of ['head', 'neck', 'back']) {
    const ids = shopRows(slot).map(i => i.id);
    assert.ok(SPROUT_IDS.every(id => !ids.includes(id)), slot);
    assert.ok(shopRows(slot).every(i => !i.shop), slot);
  }
});

test('셋 중 하나라도 안 샀으면 새싹반 탭이 열려 있고 기본 탭이 된다', () => {
  assert.equal(sproutOpen(cos()), true);
  assert.equal(defaultCosTab(cos()), 'sprout');
  assert.equal(sproutOpen(cos(['kinder_hat', 'tulip_tag'])), true);
  assert.equal(sproutOpen(cos(SPROUT_IDS)), false);
  assert.equal(defaultCosTab(cos(SPROUT_IDS)), 'head');
});

test('가게는 새싹반 탭을 맨 앞에 두고 shopRows 로 줄을 만든다', () => {
  const src = readFileSync(new URL('../js/spaces/cafe.js', import.meta.url), 'utf8');
  assert.match(src, /export const COS_TABS = \[\['sprout', '🌱 새싹반'\]/);
  const draw = src.slice(src.indexOf('export function drawCosMenu'));
  assert.match(draw, /const rowsOf = shopRows;/);
});
