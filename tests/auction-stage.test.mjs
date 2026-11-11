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

test('night level fades cone and pool and tension keeps the base', () => {
  const s = buildAuctionStage(THREE);
  s.setNight(0);
  assert.equal(s.cone.visible, false);
  assert.equal(s.pool.visible, false);
  s.setNight(1);
  assert.ok(s.cone.visible && s.pool.visible);
  const full = s.cone.material.opacity;
  s.setTension(false, 3);
  assert.equal(s.cone.material.opacity, full);
  s.setTension(true, 0.1);
  assert.ok(s.cone.material.opacity > 0 && s.cone.material.opacity <= full * 1.6);
  s.setTension(false, 3);
  s.setNight(0.5);
  assert.ok(Math.abs(s.cone.material.opacity - full / 2) < 1e-9);
  assert.ok(Math.abs(s.pool.material.opacity - 0.09) < 1e-9);
});

test('setItem disposes the previous item resources', () => {
  const s = buildAuctionStage(THREE);
  s.setItem('starvane');
  const geos = new Set(), mats = new Set();
  s.pedestal.traverse(o => {
    if (o.geometry) geos.add(o.geometry);
    for (const m of [].concat(o.material || [])) mats.add(m);
  });
  assert.ok(geos.size > 0 && mats.size > 0);
  const hits = new Map();
  for (const r of [...geos, ...mats]) {
    const orig = r.dispose.bind(r);
    r.dispose = () => { hits.set(r, (hits.get(r) || 0) + 1); orig(); };
  }
  s.setItem('moonswing');
  for (const r of [...geos, ...mats]) assert.equal(hits.get(r), 1);
});

test('large wood and gold batches keep casting shadows', () => {
  const s = buildAuctionStage(THREE);
  const big = [0x6d4a2e, 0xe0b04a].map(c => {
    const list = s.group.children.filter(o => o.isMesh && o.material.color && o.material.color.getHex() === c && o.geometry.getAttribute('position').count > 200);
    return list;
  });
  for (const list of big) assert.ok(list.some(m => m.castShadow));
});
