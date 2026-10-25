import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from '../vendor/three/three.module.js';
import { buildTreeArt, LIMBS } from '../js/world/tree-art.js';
import { shotFrame } from '../js/world/tree-shot.js';

const drawables = (g) => { const out = []; g.traverse(o => { if (o.isMesh || o.isPoints || o.isSprite) out.push(o); }); return out; };
const BR = (leaves, bloom = 0) => Object.fromEntries(Object.keys(LIMBS).map(id => [id, { leaves, bloom }]));

test('조형 모듈은 three 를 직접 import 하지 않는다(테스트·순환 안전)', () => {
  assert.doesNotMatch(readFileSync(new URL('../js/world/tree-art.js', import.meta.url), 'utf8'), /from 'three'/);
});

test('드로우콜 ≤ 13 · 라이트 0 · 가지 잎 메시는 판 가지 5개와 1:1', () => {
  const art = buildTreeArt(THREE);
  const d = drawables(art.group);
  assert.ok(d.length <= 13, `draw calls ${d.length}`);
  let lights = 0; art.group.traverse(o => { if (o.isLight) lights++; });
  assert.equal(lights, 0);
  assert.deepEqual(Object.keys(art.clusters).sort(), ['farm', 'forest', 'kitchen', 'mine', 'water']);
});

test('시든 나무: 잎·우듬지·빛 알갱이 숨김, 마지막 잎만 / 다 살면 반대', () => {
  const art = buildTreeArt(THREE);
  art.setState({ life: 0, branches: BR(0) }, 0);
  for (const c of Object.values(art.clusters)) assert.equal(c.mesh.visible, false);
  const pts = drawables(art.group).find(o => o.isPoints), sprite = drawables(art.group).find(o => o.isSprite);
  assert.equal(pts.visible, false); assert.equal(sprite.visible, true);
  art.setState({ life: 1, branches: BR(1, 1) }, 1);
  for (const c of Object.values(art.clusters)) assert.equal(c.mesh.visible, true);
  assert.equal(pts.visible, true); assert.equal(sprite.visible, false);
});

test('잎은 안쪽부터 돋는다 — 서식지만(0.4)이면 일부 조각만 다 자란다', () => {
  const art = buildTreeArt(THREE);
  art.setState({ life: 0.2, branches: { ...BR(0), water: { leaves: 0.4, bloom: 0 } } }, 0);
  const leaf = art.clusters.water.pieces.filter(p => p.kind === 'leaf');
  const grown = leaf.filter(p => p.cur > 0.3).length;
  assert.ok(grown > 0 && grown < leaf.length, `${grown}/${leaf.length}`);
  assert.ok(art.clusters.water.pieces.filter(p => p.kind === 'bloom').every(p => p.cur === 0));
});

test('다 자란 상자가 조망샷 구도 안에 든다(가로·폰 세로) — 우듬지가 넓고 높이가 있다', () => {
  const art = buildTreeArt(THREE);
  const b = art.fullBox(), size = b.getSize(new THREE.Vector3()), c = b.getCenter(new THREE.Vector3());
  assert.ok(size.x > 14 && size.y > 9, JSON.stringify(size));
  const box = { cx: c.x, cy: c.y, cz: c.z, hx: size.x / 2, hy: size.y / 2, hz: size.z / 2 };
  for (const aspect of [1280 / 720, 390 / 844]) {
    const f = shotFrame(box, aspect);
    const cam = new THREE.PerspectiveCamera(42, aspect, 0.1, 200);
    cam.position.set(f.pos.x, f.pos.y, f.pos.z); cam.lookAt(f.look.x, f.look.y, f.look.z); cam.updateMatrixWorld();
    for (const x of [b.min.x, b.max.x]) for (const y of [b.min.y, b.max.y]) for (const z of [b.min.z, b.max.z]) {
      const p = new THREE.Vector3(x, y, z).project(cam);
      assert.ok(Math.abs(p.x) <= 1.02 && Math.abs(p.y) <= 1.02, `aspect ${aspect.toFixed(2)} corner ${[x, y, z]} → ${p.x.toFixed(2)},${p.y.toFixed(2)}`);
    }
  }
});

test('마지막 잎: 잎자루가 💧 가지 끝가지 끝에 붙어 있고(흔들려도 그 자리), 반짝이는 잎과 함께 나타나고 진다', () => {
  const art = buildTreeArt(THREE);
  art.setState({ life: 0, branches: BR(0) }, 0);
  const p0 = art.lastLeaf.position.clone();
  art.setState({ life: 0, branches: BR(0) }, 2.7);
  assert.ok(art.lastLeaf.position.distanceTo(p0) < 1e-9, '흔들림은 붙은 자리를 축으로 돈다');
  assert.ok(!art.lastLeaf.quaternion.equals(new THREE.Quaternion()), '살랑거린다');
  // 잎 메시 정점 중 하나는 원점(붙는 자리) 바로 곁에 있다
  const mesh = art.lastLeaf.children[0], pa = mesh.geometry.attributes.position;
  let near = Infinity; for (let i = 0; i < pa.count; i++) near = Math.min(near, Math.hypot(pa.getX(i), pa.getY(i), pa.getZ(i)));
  assert.ok(near < 0.03, `잎자루 시작 ${near}`);
  assert.equal(art.leafSparkles.visible, true);
  art.setState({ life: 1, branches: BR(1, 1) }, 3);
  assert.equal(art.leafSparkles.visible, false);
});
