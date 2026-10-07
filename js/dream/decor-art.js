// =============================================================
//  🌙 꿈 장식 4종 조형 — 집 꾸미기 가구(js/spaces/indoor.js decorMesh 가 부른다)
//  ------------------------------------------------------------
//  스펙 §8 · 값·발자국·높이는 js/data/catalog.js DECOR(pay: 'shard')
//  ▶ 원점 = 바닥 중심, 단위 = 배율 전(decorMesh 가 DECOR_SCALE 을 곱한다)
//  ▶ 메시 ≤2: 무광 몸체는 정점색 한 덩이, 발광은 한 덩이(js/dream/art.js bakeGroup)
//  ▶ 높이: 소품(sm)은 catalog 의 h 이하 — tests/decor-ceiling.test.mjs 가 상판 위 천장 규칙을 본다
// =============================================================
import * as THREE from 'three';
import { bakeGroup, cloudBedParts, part } from './art.js';

export const DREAM_DECOR_IDS = ['moonLamp', 'crystalPot', 'starMobile', 'cloudBed'];

// 바깥 원(R)에서 위로 off 만큼 옮긴 안쪽 원(r)을 뺀 초승달 — js/dream/art.js makeMoonCarriage 와 같은 작도
function crescent(parent, color, R, r, off, depth, y) {
  const ty = (R * R - r * r + off * off) / (2 * off), tx = Math.sqrt(Math.max(0, R * R - ty * ty));
  const aO = Math.atan2(ty, tx), aI = Math.atan2(ty - off, tx), N = 20, sh = new THREE.Shape();
  for (let i = 0; i <= N; i++) {
    const a = Math.PI - aO + (Math.PI + 2 * aO) * (i / N);
    if (i) sh.lineTo(R * Math.cos(a), R * Math.sin(a)); else sh.moveTo(R * Math.cos(a), R * Math.sin(a));
  }
  for (let i = 0; i <= N; i++) { const a = 2 * Math.PI + aI - (Math.PI + 2 * aI) * (i / N); sh.lineTo(r * Math.cos(a), off + r * Math.sin(a)); }
  const geo = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: false, curveSegments: 12 });
  geo.translate(0, 0, -depth / 2);
  const m = part(parent, geo, color, 0, y, 0);
  m.rotation.z = -0.5;   // 기울어 걸린 달
  return m;
}

const BUILD = {
  // 🌙 달 램프 — 높이 ≤0.55 · 폭 ≤0.3: 둥근 받침 + 기둥 + 기울어진 초승달 + 끝에 매달린 별
  moonLamp(solid, glow) {
    part(solid, new THREE.CylinderGeometry(0.13, 0.15, 0.06, 12), 0x8f7ad6, 0, 0.03, 0);
    part(solid, new THREE.CylinderGeometry(0.018, 0.018, 0.2, 6), 0xf0e2ff, 0, 0.16, 0);
    crescent(glow, 0xffe9a0, 0.16, 0.14, 0.07, 0.06, 0.36);
    part(glow, new THREE.OctahedronGeometry(0.035, 0), 0xfff6c8, 0.1, 0.5, 0);
  },
  // 💎 수정 화분 — 높이 ≤0.7 · 폭 ≤0.32: 라벤더 화분 + 크기 다른 수정 셋
  crystalPot(solid, glow) {
    part(solid, new THREE.CylinderGeometry(0.15, 0.11, 0.22, 10), 0xb98fd6, 0, 0.11, 0);
    part(solid, new THREE.CylinderGeometry(0.155, 0.155, 0.03, 10), 0xd9ccff, 0, 0.22, 0);
    const c1 = part(glow, new THREE.OctahedronGeometry(0.11, 0), 0xff9ee0, 0, 0.42, 0); c1.scale.y = 2.0;
    const c2 = part(glow, new THREE.OctahedronGeometry(0.07, 0), 0x9ee8ff, -0.08, 0.33, 0.04); c2.scale.y = 1.8; c2.rotation.z = 0.35;
    const c3 = part(glow, new THREE.OctahedronGeometry(0.06, 0), 0xb59eff, 0.08, 0.32, -0.03); c3.scale.y = 1.7; c3.rotation.z = -0.4;
  },
  // ⭐ 별 모빌 — 높이 ≤1.3 · 발자국 0.5: 받침 + 기둥 + 가로대 둘 + 실에 매달린 별 넷
  starMobile(solid, glow) {
    part(solid, new THREE.CylinderGeometry(0.2, 0.24, 0.06, 12), 0xb98fd6, 0, 0.03, 0);
    part(solid, new THREE.CylinderGeometry(0.025, 0.03, 1.25, 6), 0xf0e2ff, 0, 0.66, 0);
    part(solid, new THREE.BoxGeometry(0.62, 0.025, 0.025), 0xffd27a, 0, 1.26, 0);
    part(solid, new THREE.BoxGeometry(0.025, 0.025, 0.5), 0xffd27a, 0, 1.18, 0);
    [[-0.3, 0, 0.25, 0xfff09e], [0.3, 0, 0.32, 0xff9ee0], [0, -0.24, 0.2, 0x9ee8ff], [0, 0.24, 0.28, 0xb59eff]].forEach(([x, z, len, col]) => {
      const top = x !== 0 ? 1.26 : 1.18;   // 가로대(x축)는 1.26, 세로대(z축)는 1.18 높이
      part(solid, new THREE.CylinderGeometry(0.004, 0.004, len, 3), 0xf6f0ff, x, top - len / 2, z);
      const s = part(glow, new THREE.OctahedronGeometry(0.065, 0), col, x, top - len - 0.05, z); s.scale.set(1, 1.2, 0.5);
    });
  },
  // ☁️ 구름 침대 — 꿈의 숲 구름 침대와 같은 부품(발자국 1.5 × 2.2, 머리 -z)
  cloudBed(solid, glow) { cloudBedParts(solid, glow); },
};

/** 꿈 장식 하나 — Group(몸체 + 발광). 모르는 id 면 throw(카탈로그와 어긋난 걸 조용히 넘기지 않는다) */
export function buildDreamDecor(id) {
  const build = BUILD[id];
  if (!build) throw new Error(`unknown dream decor: ${id}`);
  const solid = new THREE.Group(), glow = new THREE.Group();
  build(solid, glow);
  const out = new THREE.Group();
  const body = new THREE.Mesh(bakeGroup(solid), new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.85 }));
  body.castShadow = true; body.receiveShadow = true;
  out.add(body);
  if (glow.children.length) out.add(new THREE.Mesh(bakeGroup(glow), new THREE.MeshBasicMaterial({ vertexColors: true })));
  return out;
}
