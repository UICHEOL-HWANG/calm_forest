// tests/halloween-trail.test.mjs — node 는 three 를 못 불러 소스·순수 함수만 검사한다(기존 trail-fx.test.mjs 와 같은 방식)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { FX_IDS, spawnBat, spawnHalo, particleStep } from '../js/cosmetics/trail-fx.js';
import { TRAIL_FADE } from '../js/cosmetics/trail.js';

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

test('🦇 박쥐 회오리는 시안 크기 — 발자국 곁에서 낮게 돈다(상점 미리보기 밖으로 안 나간다)', () => {
  const r = () => 0.5;
  let p = spawnBat({ x: 1, y: 0, z: 2 }, r), maxR = 0, maxY = 0;
  while (p) { maxR = Math.max(maxR, Math.hypot(p.x - 1, p.z - 2)); maxY = Math.max(maxY, p.y); p = particleStep(p, 1 / 60); }
  assert.ok(maxR <= 0.14, `반지름 ${maxR} ≤ 0.13(시안 0.05→0.13)`);
  assert.ok(maxY <= 0.5, `높이 ${maxY} ≤ 0.48(시안 0.06+0.42)`);
  assert.ok(spawnBat({ x: 0, y: 0, z: 0 }, r).size <= 0.2, '크기 0.19(시안)');
  assert.equal(spawnBat({ x: 0, y: 0, z: 0 }, r, -1).dir, -1, '걸음마다 도는 방향을 바꿀 수 있다');
});

test('🎃 호박등 온기 — 제자리에서 자국과 같이 흐려진다', () => {
  const h = spawnHalo({ x: 1, y: 0, z: 2 }, () => 0.5);
  assert.equal(h.kind, 'halo');
  assert.equal(h.life, TRAIL_FADE, '자국 페이드와 같은 수명');
  const q = particleStep(h, 0.5);
  assert.equal(q.x, h.x); assert.equal(q.z, h.z); assert.equal(q.y, h.y);
  assert.equal(particleStep({ ...h, age: h.life - 0.01 }, 0.1), null);
});

test('🎃 온기는 점 입자 Points 안에서 점마다 크기를 받는다(드로우콜·재질 종류 그대로)', () => {
  const src = read('../js/cosmetics/trail-fx.js');
  assert.match(src, /aSizeK/);
  assert.match(src, /gl_PointSize = size \* aSizeK;/);
  assert.match(read('../js/cosmetics/trail-fx-sprites.js'), /list\.slice\(-cap\)/, '넘치면 가장 새 박쥐를 남긴다');
});

test('🎃 호박등 자국만 조명 없이(unlit) 굽는다 — 다른 자국 재질은 그대로', async () => {
  const { markMaterial, TRAIL_UNLIT } = await import('../js/cosmetics/trail.js');
  class Std { constructor(o) { this.kind = 'standard'; Object.assign(this, o); } }
  class Basic { constructor(o) { this.kind = 'basic'; Object.assign(this, o); } }
  const THREE = { MeshStandardMaterial: Std, MeshBasicMaterial: Basic };
  assert.deepEqual([...TRAIL_UNLIT], ['pumpkin_glow']);
  const lit = markMaterial(THREE, 'firefly', 0.7);
  assert.equal(lit.kind, 'standard');
  assert.deepEqual({ ...lit }, { kind: 'standard', color: 0xffffff, vertexColors: true, roughness: 0.5, metalness: 0,
    transparent: true, opacity: 0.7, depthWrite: false }, '기존 자국 재질은 한 글자도 바뀌지 않는다');
  for (const id of ['paw', 'flower', 'star', 'sparkle', 'drop', 'firefly', 'rainbow', 'sprout', 'bat_swirl'])
    assert.equal(markMaterial(THREE, id, 1).kind, 'standard', `${id} 는 조명 받는 재질 그대로`);
  const un = markMaterial(THREE, 'pumpkin_glow', 0.7);
  assert.equal(un.kind, 'basic', '🎃 밤에도 등불로 읽히게 조명 없이');
  assert.equal(un.vertexColors, true); assert.equal(un.transparent, true);
  assert.equal(un.opacity, 0.7); assert.equal(un.depthWrite, false);
});
