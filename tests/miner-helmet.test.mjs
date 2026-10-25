import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three/three.module.js';
import { findItem } from '../js/cosmetics/catalog.js';
import { emptyCosmetics, canBuy, sanitize } from '../js/cosmetics/equip.js';
import { ownedIn, toggleWear, shopButton } from '../js/cosmetics/wardrobe.js';
import { premiumRowMode, gatedRow } from '../js/shop/premium-row.js';
import { buildCosmetic } from '../js/cosmetics/art.js';
import { MINER_HELMET } from '../js/cosmetics/art-miner.js';
import { sideAnchor } from '../js/cosmetics/anchors.js';

const ctx = { owned: false, platform: 'web', online: true, isGuest: false, tokenSet: true, storeOpen: true, now: Date.now() };
const granted = () => ({ ...emptyCosmetics(), owned: ['miner_lamp'] });
const luma = h => (0.2126 * ((h >> 16) & 255) + 0.7152 * ((h >> 8) & 255) + 0.0722 * (h & 255)) / 255;

test('⛏️ 광부 헬멧은 가게에서 팔지 않는다', () => {
  const it = findItem('miner_lamp');
  assert.equal(canBuy(emptyCosmetics(), 1e9, 'miner_lamp').ok, false);
  assert.equal(shopButton(it, emptyCosmetics()), null);
  assert.ok(gatedRow(it));
  assert.equal(premiumRowMode(it, ctx), 'hidden');
  assert.equal(premiumRowMode(it, { ...ctx, owned: true }), 'owned');
});

test('⛏️ 받은 사람은 옷장에서 입고 벗는다', () => {
  const c = granted();
  assert.deepEqual(ownedIn(c, 'head').map(i => i.id), ['miner_lamp']);
  const on = toggleWear(c, 'miner_lamp');
  assert.equal(on.action, 'on');
  assert.equal(on.cos.equipped.head, 'miner_lamp');
  assert.equal(toggleWear(on.cos, 'miner_lamp').action, 'off');
  assert.deepEqual(sanitize(on.cos).owned, ['miner_lamp']);
});

test('⛏️ 헬멧 조형은 병합되고 색은 블룸 임계 아래', () => {
  const bs = [0.9, 1.08, 0.9], R = 0.52, bodyY = R * bs[1] + 0.02;
  const g = buildCosmetic(THREE, 'miner_lamp', { R, HR: 0.37, HY: 1.26, bs, bodyY, side: sideAnchor(bs, R, bodyY), neckR: 0.34 });
  assert.ok(g);
  let n = 0; g.traverse(o => { if (o.isMesh) n++; });
  assert.ok(n >= 1 && n <= 6, String(n));
  assert.ok(g.children.every(c => c.isMesh));
  for (const [k, c] of Object.entries(MINER_HELMET)) assert.ok(luma(c) < 0.85, k);
});
