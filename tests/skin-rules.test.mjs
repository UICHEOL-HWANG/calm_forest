import { test } from 'node:test';
import assert from 'node:assert/strict';
import { effectiveTrail, SKIN_TRAIL, squashOf, skinSquashes, SQUASH } from '../js/cosmetics/skin-rules.js';

const cos = (trail, skin) => ({ owned: [], equipped: { head: null, neck: null, back: null, trail, skin } });

test('effectiveTrail — 자국 칸이 우선(스펙 결정 A)', () => {
  assert.equal(effectiveTrail(cos('firefly', 'forest_spirit')), 'firefly');
});
test('effectiveTrail — 자국 칸이 비었고 정령이면 새싹', () => {
  assert.equal(effectiveTrail(cos(null, 'forest_spirit')), 'sprout');
  assert.equal(SKIN_TRAIL.forest_spirit, 'sprout');
});
test('effectiveTrail — 인형은 자취가 없다 · 둘 다 없으면 null · 깨진 입력도 null', () => {
  assert.equal(effectiveTrail(cos(null, 'plush_doll')), null);
  assert.equal(effectiveTrail(cos(null, null)), null);
  assert.equal(effectiveTrail(null), null);
  assert.equal(effectiveTrail({}), null);
});
test('effectiveTrail — 자국만 있으면 그 자국', () => {
  assert.equal(effectiveTrail(cos('paw', null)), 'paw');
});
test('squashOf — 꺼져 있으면 1, 발이 닿는 순간(sin=0) 가장 눌리고 떠 있을 때(|sin|=1) 1', () => {
  assert.equal(squashOf(1.3, false), 1);
  assert.equal(squashOf(0, true), 1 - SQUASH);
  assert.equal(squashOf(Math.PI / 2, true), 1);
  const s = squashOf(0.7, true);
  assert.ok(s > 1 - SQUASH && s < 1);
});
test('skinSquashes — 플러시 인형만', () => {
  assert.equal(skinSquashes('plush_doll'), true);
  assert.equal(skinSquashes('forest_spirit'), false);
  assert.equal(skinSquashes(null), false);
});
