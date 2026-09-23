// 🐾 털린 밭 조형 — js/duel/raid-art.js (밭 위 흔적 · 대결 무대 공용)
//   회귀 둘(2026-09-24 제보): ① 흔적이 흙(y≈0.2)에 묻혀 안 보였다 ② 흙무더기가 캐릭터를 뚫고 솟았다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeRaidScar } from '../js/duel/raid-art.js';

// 최소 가짜 THREE — 위치·회전·크기만 기록한다
const v3 = () => ({ x: 0, y: 0, z: 0, set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; } });
class Obj { constructor() { this.position = v3(); this.rotation = v3(); this.scale = v3().set(1, 1, 1); this.children = []; }
  add(c) { this.children.push(c); return this; }
  traverse(f) { f(this); this.children.forEach(c => c.traverse(f)); } }
class Mesh extends Obj { constructor(geo) { super(); this.isMesh = true; this.geo = geo; } }
const THREE = {
  Group: Obj, Mesh,
  MeshStandardMaterial: class {},
  CircleGeometry: function () { return { kind: 'circle', rotateX() { return this; } }; },
  IcosahedronGeometry: function () { return { kind: 'ico', rotateX() { return this; } }; },
  CylinderGeometry: function () { return { kind: 'cyl', rotateX() { return this; } }; },
};

const meshes = (g) => { const out = []; g.traverse(o => o.isMesh && out.push(o)); return out; };
const onPlot = (m) => Math.abs(m.position.x) < 0.98 && Math.abs(m.position.z) < 0.98;

test('같은 시드면 같은 모양 — 새로고침·대결 진입 때 흔적이 바뀌지 않는다', () => {
  const a = meshes(makeRaidScar(THREE, { animal: 'boar', seed: 203, away: [1, 0] })).map(m => [m.position.x, m.position.y, m.position.z]);
  const b = meshes(makeRaidScar(THREE, { animal: 'boar', seed: 203, away: [1, 0] })).map(m => [m.position.x, m.position.y, m.position.z]);
  assert.deepEqual(a, b);
});

test('밭 칸 안의 조각은 흙 윗면(plotY) 위에 놓인다 — 묻히지 않는다', () => {
  for (const animal of ['boar', 'raccoon']) {
    for (const away of [[1, 0], [0, -1], [Math.SQRT1_2, Math.SQRT1_2]]) {   // 대각선이면 첫 발자국이 밭 안이다
      const ms = meshes(makeRaidScar(THREE, { animal, seed: 77, away, plotY: 0.2 })).filter(onPlot);
      assert.ok(ms.length > 10, `${animal}: 밭 위 조각이 있어야 한다`);
      for (const m of ms) assert.ok(m.position.y >= 0.2, `${animal} ${away}: y=${m.position.y} 가 흙(0.2) 아래`);
    }
  }
});

test('캐릭터를 뚫고 솟는 조각이 없다 — 전부 바닥에 깔린다', () => {
  for (const animal of ['boar', 'raccoon']) {
    for (const m of meshes(makeRaidScar(THREE, { animal, seed: 5, away: [0, 1] }))) {
      const base = onPlot(m) ? 0.2 : 0;
      assert.ok(m.position.y - base <= 0.2, `${animal}: 바닥에서 ${(m.position.y - base).toFixed(2)} 솟음`);
    }
  }
});

test('발자국 — 멧돼지는 갈라진 발굽(두 쪽), 너구리는 발가락 셋', () => {
  const paws = (animal) => meshes(makeRaidScar(THREE, { animal, seed: 9, away: [0, 1] })).filter(m => m.position.z > 1.0 && m.geo.kind === 'circle');
  assert.equal(paws('boar').length, 5 * 2);
  assert.equal(paws('raccoon').length, 5 * 3);
});
