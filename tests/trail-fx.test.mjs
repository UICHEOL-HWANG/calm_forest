import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fireflyCount, hueAt, rainbowHex, spawnFirefly, spawnSpark, particleStep } from '../js/cosmetics/trail-fx.js';
import { NIGHT_MIN } from '../js/daynight.js';

test('fireflyCount — 밤엔 2개, 낮엔 30% 확률로 1개', () => {
  assert.equal(fireflyCount(NIGHT_MIN, 0.99), 2);
  assert.equal(fireflyCount(1, 0), 2);
  assert.equal(fireflyCount(0, 0.29), 1);
  assert.equal(fireflyCount(0, 0.3), 0);
});

test('hueAt — 걸음마다 1/7 씩 돌고 [0,1) 로 감긴다', () => {
  assert.equal(hueAt(0), 0);
  assert.ok(Math.abs(hueAt(1) - 1 / 7) < 1e-9);
  for (let s = 0; s < 50; s++) { const h = hueAt(s); assert.ok(h >= 0 && h < 1, `${s}: ${h}`); }
  assert.notEqual(rainbowHex(0), rainbowHex(1));
  assert.ok(rainbowHex(0) >= 0 && rainbowHex(0) <= 0xffffff);
});

test('particleStep — 위로 오르고, 입력을 바꾸지 않고, 수명이 끝나면 null', () => {
  const p = spawnFirefly({ x: 0, y: 0, z: 0 }, () => 0.5);
  const q = particleStep(p, 0.1);
  assert.ok(q.y > p.y, '떠오른다');
  assert.equal(p.age, 0, '원본 불변');
  assert.equal(particleStep({ ...p, age: p.life - 0.01 }, 0.1), null);
  const s = spawnSpark({ x: 0, y: 0, z: 0 }, 0xff0000, () => 0.5);
  assert.equal(s.kind, 'spark');
  assert.ok(s.life < 1.5);
});

test('onStamp — step 을 주면 그 걸음 색(미리보기: 자국 id 와 반짝이 색이 어긋나지 않게)', async () => {
  const { createTrailFx } = await import('../js/cosmetics/trail-fx.js');
  //  캔버스 2D 는 아무 호출이나 받아 주는 가짜 — 🦇 박쥐 아틀라스(trail-fx-sprites.js)가 경로 함수를 많이 부른다
  const ctx2d = new Proxy({}, { get: (_, k) => k === 'createRadialGradient' ? () => ({ addColorStop() {} }) : () => {}, set: () => true });
  globalThis.document ??= { createElement: () => ({ getContext: () => ctx2d }) };
  class Attr { constructor(a, n) { this.array = a; this.itemSize = n; } }
  const THREE = { BufferGeometry: class { constructor() { this.attributes = {}; } setAttribute(k, v) { this.attributes[k] = v; } setDrawRange() {} },
    BufferAttribute: Attr, PointsMaterial: class {}, ShaderMaterial: class { constructor(o) { Object.assign(this, o); } },
    Points: class { constructor(g) { this.geometry = g; } }, Group: class { constructor() { this.children = []; } add(...o) { this.children.push(...o); } },
    Vector2: class {}, CanvasTexture: class {}, Color: class { setHex() { return this; } },
    AdditiveBlending: 2, NormalBlending: 1, SRGBColorSpace: 'srgb', LinearFilter: 1006 };
  const fx = createTrailFx(THREE, { rnd: () => 0.5 });
  assert.equal(fx.onStamp('rainbow', { x: 0, y: 0, z: 0 }, { step: 5 }).tint, rainbowHex(5));
  assert.equal(fx.onStamp('rainbow', { x: 0, y: 0, z: 0 }).tint, rainbowHex(0), '없으면 내부 카운터(월드)');
  const [dots, bats] = fx.points.children;          // points 는 Group — 점 입자 Points + 🦇 박쥐 스프라이트 Points
  assert.equal(dots.geometry.attributes.color.itemSize, 4, 'RGBA');
  assert.ok(bats.geometry.attributes.aFrame, '박쥐는 아틀라스 칸을 점마다 받는다');
});
