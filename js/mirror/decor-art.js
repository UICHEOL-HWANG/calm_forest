// =============================================================
//  🪞 거울 장식 4종 조형 — js/spaces/indoor.js decorMesh 가 부른다 · 원점 = 바닥 중심, 배율 전
//  확정 시안 mockups/decor.html?v=2(보색 반전) · 메시 ≤2(무광 한 덩이 + 발광 한 덩이, bakeGroup)
//  ⚠️ 소품(sm) 높이는 catalog h 이하 — tests/decor-ceiling.test.mjs
// =============================================================
import * as THREE from 'three';
import { bakeGroup } from '../dream/art.js';
export const MIRROR_DECOR_IDS = ['upsidePot', 'waterMirror', 'shadowBear', 'mirrorLamp'];
function P(parent, geo, color, x, y, z) { const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color })); m.position.set(x, y, z); parent.add(m); return m; }
const BUILD = {
  upsidePot(s, g) {   // 뒤집힌 화분이 가는 받침 위에 떠 있고 잎이 아래로 — 전체 높이 ≤ 0.7
    P(s, new THREE.CylinderGeometry(0.16, 0.21, 0.28, 10), 0x3fb8a8, 0, 0.56, 0).rotation.x = Math.PI;
    P(g, new THREE.TorusGeometry(0.21, 0.03, 6, 14), 0xff9ee0, 0, 0.44, 0).rotation.x = Math.PI / 2;
    for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; P(s, new THREE.SphereGeometry(0.09, 6, 4), 0xc85fc8, Math.cos(a) * 0.1, 0.3 - (i % 2) * 0.06, Math.sin(a) * 0.1).scale.set(0.6, 1.6, 0.4); }
    P(s, new THREE.CylinderGeometry(0.03, 0.05, 0.26, 6), 0x9a8ad0, 0, 0.13, 0);
  },
  waterMirror(s, g) {   // 바닥 스탠드 거울 — 타원 고리 + 물빛 면 + 다리
    P(s, new THREE.TorusGeometry(0.42, 0.05, 6, 28), 0x5a7ad6, 0, 1.0, 0).scale.set(0.75, 1, 1);
    P(g, new THREE.CircleGeometry(0.4, 28), 0x9ee8ff, 0, 1.0, 0.01).scale.set(0.75, 1, 1);
    P(s, new THREE.BoxGeometry(0.06, 0.6, 0.06), 0x5a7ad6, 0, 0.3, 0);
    P(s, new THREE.BoxGeometry(0.5, 0.05, 0.26), 0x5a7ad6, 0, 0.03, 0);
    P(g, new THREE.SphereGeometry(0.05, 8, 6), 0xffe08a, 0, 1.45, 0.02);
  },
  shadowBear(s, g) {
    const F = 0x5f9ac8;
    P(s, new THREE.SphereGeometry(0.32, 12, 10), F, 0, 0.3, 0).scale.set(1, 0.95, 0.9);
    P(s, new THREE.SphereGeometry(0.25, 12, 10), F, 0, 0.72, 0.02);
    for (const k of [-1, 1]) {
      P(s, new THREE.SphereGeometry(0.09, 8, 6), F, k * 0.18, 0.93, 0);
      P(s, new THREE.SphereGeometry(0.1, 8, 6), F, k * 0.3, 0.32, 0.14);
      P(s, new THREE.SphereGeometry(0.12, 8, 6), F, k * 0.17, 0.08, 0.2).scale.set(1, 0.7, 1.3);
      P(g, new THREE.SphereGeometry(0.035, 6, 4), 0x9ee8ff, k * 0.09, 0.76, 0.22);
    }
    P(s, new THREE.SphereGeometry(0.09, 8, 6), 0x2a4a7a, 0, 0.68, 0.22).scale.set(1.2, 0.8, 0.8);
  },
  mirrorLamp(s, g) {
    P(s, new THREE.CylinderGeometry(0.22, 0.28, 0.12, 10), 0x7a5ad6, 0, 0.06, 0);
    P(s, new THREE.CylinderGeometry(0.05, 0.06, 1.5, 8), 0x7a5ad6, 0, 0.8, 0);
    P(g, new THREE.OctahedronGeometry(0.22, 0), 0x9ef6d0, 0, 1.75, 0).scale.set(1, 1.4, 1);
  },
};
/** 거울 장식 하나 — Group(몸체 + 발광). 모르는 id 면 throw(카탈로그와 어긋난 걸 조용히 넘기지 않는다) */
export function buildMirrorDecor(id) {
  const b = BUILD[id]; if (!b) throw new Error(`unknown mirror decor: ${id}`);
  const solid = new THREE.Group(), glow = new THREE.Group(); b(solid, glow);
  const out = new THREE.Group();
  const body = new THREE.Mesh(bakeGroup(solid), new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.85 }));
  body.castShadow = true; body.receiveShadow = true; out.add(body);
  if (glow.children.length) out.add(new THREE.Mesh(bakeGroup(glow), new THREE.MeshBasicMaterial({ vertexColors: true })));
  return out;
}
