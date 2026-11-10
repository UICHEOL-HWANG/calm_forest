import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from '../vendor/three/three.module.js';
import { buildAuctionStage } from '../js/auction/stage.js';

test('stage builds with lanterns, gavel, bell and swaps the item', () => {
  const s = buildAuctionStage(THREE);
  assert.ok(s.lanterns.length >= 20);
  assert.ok(s.gavel.isGroup && s.bell.isGroup);
  s.setItem('starvane');
  assert.equal(s.pedestal.children.length, 1);
  s.setItem('moonswing');
  assert.equal(s.pedestal.children.length, 1);
});

test('night level drives lantern glow within budget', () => {
  const s = buildAuctionStage(THREE);
  s.setNight(0);
  assert.ok(s.lanterns.every(m => m.material.emissiveIntensity <= 0.15));
  s.setNight(1);
  assert.ok(s.lanterns.every(m => m.material.emissiveIntensity > 0.3 && m.material.emissiveIntensity <= 0.6));
});

test('focus moves the light pool to the ground off stage', () => {
  const s = buildAuctionStage(THREE);
  assert.ok(s.pool.position.y > 0.5);
  s.focus(0.4, 5.9);
  assert.ok(s.pool.position.y < 0.1);
  assert.ok(Math.abs(s.pool.position.x - 0.4) < 1e-9);
});

test('no real lights on the permanent stage', () => {
  assert.doesNotMatch(readFileSync('js/auction/stage.js', 'utf8'), /PointLight|SpotLight/);
});

test('mesh budget', () => {
  let n = 0;
  buildAuctionStage(THREE).group.traverse(o => { if (o.isMesh) n++; });
  assert.ok(n <= 140, String(n));
});
