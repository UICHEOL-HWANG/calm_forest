import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three/three.module.js';
import { buildCosmetic } from '../js/cosmetics/art.js';
import { KP } from '../js/cosmetics/art-sprout.js';
import { sideAnchor } from '../js/cosmetics/anchors.js';

const bs = [0.9, 1.08, 0.9], R = 0.52, bodyY = R * bs[1] + 0.02;
const K = { R, HR: 0.37, HY: 1.26, bs, bodyY, side: sideAnchor(bs, R, bodyY), neckR: 0.37 * 0.92 };
const luma = h => (0.2126 * ((h >> 16) & 255) + 0.7152 * ((h >> 8) & 255) + 0.0722 * (h & 255)) / 255;

test('🌱 새싹반 3종은 메시를 만들고 병합 뒤 드로우콜이 적다', () => {
  for (const id of ['kinder_hat', 'tulip_tag', 'kinder_bag']) {
    const g = buildCosmetic(THREE, id, K);
    assert.ok(g, id);
    let n = 0; g.traverse(o => { if (o.isMesh) n++; });
    assert.ok(n >= 1 && n <= 6, `${id} ${n}`);
    assert.ok(g.children.every(c => c.isMesh), `${id}: 하위 그룹이 남으면 병합이 안 된다`);
  }
});

test('🌱 새싹반 색은 블룸 임계 0.85 아래', () => {
  for (const [k, c] of Object.entries(KP)) assert.ok(luma(c) < 0.85, `${k} ${luma(c).toFixed(3)}`);
});
