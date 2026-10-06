// tests/halloween-trail.test.mjs — node 는 three 를 못 불러 소스·순수 함수만 검사한다(기존 trail-fx.test.mjs 와 같은 방식)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { FX_IDS, spawnBat, particleStep } from '../js/cosmetics/trail-fx.js';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

test('🎃 FX 등록 — 호박등·박쥐 회오리', () => {
  assert.ok(FX_IDS.includes('pumpkin_glow'));
  assert.ok(FX_IDS.includes('bat_swirl'));
  assert.ok(FX_IDS.includes('firefly') && FX_IDS.includes('rainbow'), '기존 FX 유지');
});

test('🦇 박쥐 입자 — 나선으로 오르며 수명이 다하면 null', () => {
  let n = 0; const r = () => (n = (n + 0.37) % 1);
  let p = spawnBat({ x: 0, y: 0, z: 0 }, r);
  assert.equal(p.kind, 'bat');
  const y0 = p.y;
  p = particleStep(p, 0.5);
  assert.ok(p.y > y0, '위로 오른다');
  assert.ok(Math.hypot(p.x - p.bx, p.z - p.bz) > 0, '나선으로 돈다');
  assert.equal(particleStep({ ...p, age: p.life - 0.01 }, 0.1), null);
});

test('🎃 조형 표에 두 자국이 있다 · 입자 파일은 THREE 를 인자로 받는다', () => {
  const trail = read('../js/cosmetics/trail.js');
  assert.match(trail, /pumpkin_glow:\s*\(g, s, o\)/);
  assert.match(trail, /bat_swirl:\s*\(g, s, o\)/);
  const spr = read('../js/cosmetics/trail-fx-sprites.js');
  assert.match(spr, /export function createBatSprites\(THREE/);
  assert.doesNotMatch(spr, /^import .*from 'three'/m, 'THREE 는 인자로 받는다(node 테스트)');
});

test('🎃 points 는 Group — game.js 의 scene.add(trailFx.points) 가 그대로 동작', () => {
  assert.match(read('../js/cosmetics/trail-fx.js'), /const points = new THREE\.Group\(\)/);
});
