// =============================================================
//  🍲 조리 재료 3D 모형 — 요리 미니게임 무대(끓이기 국물 위·썰기 노트·굽기 석쇠)의 이모지를 대체
//  ------------------------------------------------------------
//  시안: sims/cook-ingredient-sim.html — 사용자 승인(2026-09-29 "모형 그대로 가서 교체해").
//  문법: 게임 clayMat(roughness .95, flatShading) · 높이 ≈ 0.5. 색은 게임 데이터(FRUITS·farm-crops·fishMesh).
//  ▶ 무대가 스프라이트에 하던 일(투명도·회색·탄 색·반 바퀴 회전)은 setFoodOpacity/setFoodTint/그룹 회전으로.
//  ▶ ⚡ 드로우콜: 부속(3~10개)을 재질 종류별로 합쳐 모형 하나 = 메시 1~2개. 색은 정점색으로(🏛️ 전시물과 같은 방식).
//    합친 형상은 재료마다 한 번만 굽고(BAKED) 모형끼리 공유한다 — 재질만 모형마다 새로(투명도·탄 색이 번지지 않게).
// =============================================================
import * as THREE from 'three';
import { mergeGeos } from './game.js';

const clay = (c, flat = true) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.95, metalness: 0, flatShading: flat, transparent: true });

// 🥕 당근 옆모습 [반지름, 끝에서 거리] — 썰기 동전·단면 크기도 이 굵기에서 잡는다
export const CARROT_PROFILE = [[0, 0], [0.04, 0.03], [0.075, 0.12], [0.105, 0.27], [0.12, 0.39], [0.1, 0.46], [0, 0.475]];

function buildModel(id) {
  const g = new THREE.Group();
  const add = (geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, s) => {
    const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); if (s) m.scale.set(...s); g.add(m); return m; };
  const leaf = clay(0x6fb06a), stem = clay(0x8a6a4a);
  const fruit = (col, sx = 1, sy = 1, r = 0.2) => { add(new THREE.IcosahedronGeometry(r, 1), clay(col), 0, r * sy, 0, 0, 0, 0, [sx, sy, sx]);
    add(new THREE.CylinderGeometry(0.015, 0.02, 0.08, 5), stem, 0, r * sy * 2 + 0.02, 0);
    add(new THREE.ConeGeometry(0.05, 0.1, 5), leaf, 0.05, r * sy * 2 + 0.03, 0, 0, 0, -1.1, [1, 1, 0.5]); };
  switch (id) {
    case 'fish': {                                   // game.js fishMesh(보통) 그대로
      const m = clay(0x9fb4c8, false);
      add(new THREE.SphereGeometry(0.26, 8, 6), m, 0, 0.2, 0, 0, 0, 0, [1.6, 0.9, 0.7]);
      add(new THREE.ConeGeometry(0.16, 0.3, 6), m, -0.52, 0.2, 0, 0, 0, Math.PI / 2);
      const eye = new THREE.MeshStandardMaterial({ color: 0x2a2624, roughness: 0.5 });
      [0.14, -0.14].forEach(z => add(new THREE.SphereGeometry(0.045, 6, 6), eye, 0.3, 0.27, z));
      g.scale.setScalar(0.75); break;
    }
    case 'crop':                                     // 🥕 당근 A — 어깨 둥글고 끝이 뭉툭(원뿔은 "너무 날카롭다", 시안 sims/cook-chop-sim.html)
      add(new THREE.LatheGeometry(CARROT_PROFILE.map(([r, y]) => new THREE.Vector2(r, y)), 8), clay(0xf08a3a));
      for (const r of [-0.4, 0, 0.4]) add(new THREE.ConeGeometry(0.045, 0.22, 4), leaf, Math.sin(r) * 0.07, 0.56, 0, 0, 0, r, [1, 1, 0.55]);
      g.rotation.z = 1.1; g.position.y = 0.1; break;
    case 'forage':                                   // 🍄 버섯 — 반구 갓 + 흰 점 + 대
      add(new THREE.CylinderGeometry(0.06, 0.08, 0.2, 7), clay(0xf3ead8), 0, 0.1, 0);
      add(new THREE.SphereGeometry(0.2, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), clay(0xd0563f), 0, 0.2, 0, 0, 0, 0, [1, 0.8, 1]);
      for (const [x, z] of [[0.08, 0.05], [-0.07, 0.08], [0, -0.1]]) add(new THREE.SphereGeometry(0.03, 5, 4), clay(0xfbf3dc), x, 0.33, z);
      break;
    case 'egg':  add(new THREE.SphereGeometry(0.17, 12, 10), clay(0xf6ecd8, false), 0, 0.2, 0, 0, 0, 0, [0.85, 1.15, 0.85]); break;
    case 'flour':                                    // 🌾 밀가루 — 묶은 자루 + 밀 이삭 문양
      add(new THREE.SphereGeometry(0.2, 8, 6), clay(0xf1e6cf), 0, 0.18, 0, 0, 0, 0, [1, 1.05, 0.85]);
      add(new THREE.CylinderGeometry(0.05, 0.09, 0.1, 6), clay(0xe0d2b4), 0, 0.4, 0);
      add(new THREE.ConeGeometry(0.035, 0.14, 4), clay(0xe9c85c), 0, 0.2, 0.17); break;
    case 'wheat':                                    // 🌾 밀 이삭 다발 — 줄기 + 끈
      for (const r of [-0.25, 0, 0.25]) {
        add(new THREE.CylinderGeometry(0.012, 0.012, 0.4, 4), clay(0xd9b95a), Math.sin(r) * 0.12, 0.2, 0, 0, 0, r);
        add(new THREE.ConeGeometry(0.045, 0.16, 5), clay(0xe9c85c), Math.sin(r) * 0.22, 0.44, 0, 0, 0, r);
      }
      add(new THREE.TorusGeometry(0.04, 0.012, 4, 8), clay(0xb07a44), 0, 0.14, 0, Math.PI / 2); break;
    case 'corn':                                     // 🌽 옥수수 — 알갱이 기둥 + 껍질 잎 두 장
      add(new THREE.CylinderGeometry(0.07, 0.065, 0.36, 8), clay(0xf5d340), 0, 0.22, 0);   // 윗면을 머리 구(0.08) 안으로 — 적도와 겹치면 깜빡인다
      add(new THREE.SphereGeometry(0.08, 8, 6), clay(0xf5d340), 0, 0.4, 0);
      for (const s of [-1, 1]) add(new THREE.ConeGeometry(0.07, 0.34, 4), clay(0x74b85c), s * 0.07, 0.18, 0, 0, 0, s * 0.25, [1, 1, 0.4]);
      g.rotation.z = 0.9; g.position.y = 0.06; break;
    case 'grape':                                    // 🍇 포도 송이 — 알 피라미드 + 줄기
      for (const [x, y, z] of [[0, 0.1, 0], [-0.08, 0.18, 0.02], [0.08, 0.18, 0], [0, 0.18, 0.08], [0, 0.26, 0], [-0.07, 0.27, -0.05], [0.07, 0.27, 0.05], [0, 0.34, 0]])
        add(new THREE.SphereGeometry(0.06, 7, 5), clay(0x7d4fb5), x, y, z);
      add(new THREE.CylinderGeometry(0.012, 0.012, 0.1, 4), stem, 0, 0.42, 0);
      add(new THREE.ConeGeometry(0.06, 0.12, 5), leaf, 0.06, 0.42, 0, 0, 0, -1.2, [1, 1, 0.4]); break;
    case 'honey':                                    // 🍯 꿀단지 — 도자기 단지 + 흘러내린 꿀
      add(new THREE.SphereGeometry(0.19, 10, 8), clay(0xe0b04a), 0, 0.19, 0, 0, 0, 0, [1, 0.9, 1]);
      add(new THREE.CylinderGeometry(0.11, 0.13, 0.08, 10), clay(0xf6e6b8), 0, 0.37, 0);
      add(new THREE.SphereGeometry(0.035, 6, 4), clay(0xf0b429), 0.12, 0.28, 0.09, 0, 0, 0, [0.7, 1.6, 0.7]); break;
    case 'apple':     fruit(0xd64a42, 1, 0.95); break;
    case 'pear':      fruit(0xd9cf7a, 0.85, 1.25, 0.18); break;
    case 'peach':     fruit(0xef9aad, 1, 1); add(new THREE.CylinderGeometry(0.006, 0.006, 0.22, 3), clay(0xd07a90), 0, 0.22, 0.185);   // 골 — 몸 안에서만 보이게 짧게 break;
    case 'persimmon': fruit(0xe08a30, 1.05, 0.8); add(new THREE.CylinderGeometry(0.1, 0.1, 0.02, 4), leaf, 0, 0.33, 0, 0, Math.PI / 4, 0); break;
    case 'chestnut':                                 // 🌰 밤 — 윗부분 뾰족 + 밝은 밑동
      add(new THREE.SphereGeometry(0.17, 8, 6), clay(0x7a5433), 0, 0.17, 0, 0, 0, 0, [1, 1.05, 0.8]);
      add(new THREE.ConeGeometry(0.06, 0.1, 5), clay(0x7a5433), 0, 0.37, 0);
      add(new THREE.SphereGeometry(0.13, 8, 4, 0, Math.PI * 2, Math.PI * 0.6, Math.PI * 0.4), clay(0xd8b98a), 0, 0.17, 0, 0, 0, 0, [1.25, 1.1, 1]); break;
    case 'juice':                                    // 🍷 포도즙 — 병 + 코르크 + 라벨
      add(new THREE.CylinderGeometry(0.12, 0.12, 0.3, 10), new THREE.MeshStandardMaterial({ color: 0x6b3f8a, roughness: 0.25, metalness: 0.1 }), 0, 0.15, 0);
      add(new THREE.CylinderGeometry(0.045, 0.09, 0.12, 8), new THREE.MeshStandardMaterial({ color: 0x6b3f8a, roughness: 0.25 }), 0, 0.36, 0);
      add(new THREE.CylinderGeometry(0.045, 0.045, 0.06, 6), clay(0xb07a44), 0, 0.45, 0);
      add(new THREE.CylinderGeometry(0.13, 0.13, 0.1, 10), clay(0xf1e6cf), 0, 0.15, 0); break;   // 라벨 — 병(0.12)과 0.01 띄운다(붙이면 줄무늬)
    case 'yam':                                      // 🍠 고구마 — 길쭉한 자주 몸 + 노란 단면
      add(new THREE.SphereGeometry(0.16, 9, 7), clay(0xa24a6a), 0, 0.14, 0, 0, 0, 0, [1.8, 0.9, 0.9]);
      add(new THREE.CircleGeometry(0.12, 9), clay(0xf2c55a), 0.285, 0.14, 0, 0, Math.PI / 2, 0, [0.8, 1, 1]); break;
    case 'bread':                                    // 🥐 빵 반죽 — 둥근 반죽 + 칼집
      add(new THREE.SphereGeometry(0.2, 10, 8), clay(0xf0d7a8), 0, 0.12, 0, 0, 0, 0, [1.25, 0.65, 1]);
      for (const x of [-0.07, 0.07]) add(new THREE.BoxGeometry(0.02, 0.02, 0.2), clay(0xd6a86a), x, 0.25, 0, 0, 0, 0.4); break;
  }
  return g;
}

// 재료마다 한 번 — 부속을 재질 종류(평면 음영·거칠기·금속감)별로 모아 정점색을 입혀 합친다
const BAKED = new Map(), MAIN = new Map();       // MAIN: 가장 큰 부속의 색 — 썰린 조각·단면 색
function baked(key) {
  if (BAKED.has(key)) return BAKED.get(key);
  const root = buildModel(key);
  root.updateMatrixWorld(true);
  const kinds = new Map();
  let biggest = 0;
  root.traverse(o => {
    if (!o.isMesh) return;
    const vc = o.geometry.attributes.position.count;
    if (vc > biggest) { biggest = vc; MAIN.set(key, o.material.color.clone()); }
    const m = o.material, id = `${m.flatShading}|${m.roughness}|${m.metalness}`;
    const geo = (o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone()).applyMatrix4(o.matrixWorld);
    const n = geo.attributes.position.count, col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) col.set([m.color.r, m.color.g, m.color.b], i * 3);
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    if (!kinds.has(id)) kinds.set(id, { flat: m.flatShading, rough: m.roughness, metal: m.metalness, geos: [] });
    kinds.get(id).geos.push(geo);
    o.geometry.dispose();
  });
  const parts = [...kinds.values()].map(k => ({ ...k, geo: mergeGeos(k.geos), grey: null }));
  BAKED.set(key, parts);
  return parts;
}

/** 무대용 재료 모형 — size 는 예전 이모지 스프라이트 크기(0.3~0.56)와 같은 눈금 */
export function ingredientModel(key, size = 0.4) {
  const g = new THREE.Group();
  for (const p of BAKED.get(key) || baked(key)) {
    const mesh = new THREE.Mesh(p.geo, new THREE.MeshStandardMaterial({
      vertexColors: true, flatShading: p.flat, roughness: p.rough, metalness: p.metal, transparent: true }));
    mesh.userData.part = p;
    g.add(mesh);
  }
  g.scale.setScalar(size * 2.1);
  g.rotation.y = -0.4;                                  // 3/4 로 — 정면이면 납작해 보인다
  g.userData.ingredient = key;
  return g;
}

// 🔪 썰린 조각(동전) — 테두리는 재료 색, 두 단면은 밝게. 반지름 1·두께 1(축 y) → 쓰는 쪽에서 scale 로 크기
const SLICE_GEO = new Map();
export function sliceModel(key) {
  if (!BAKED.has(key)) baked(key);
  let geo = SLICE_GEO.get(key);
  if (!geo) {
    geo = new THREE.CylinderGeometry(1, 1, 1, 10).toNonIndexed();
    const main = MAIN.get(key) || new THREE.Color(0xf08a3a), face = main.clone().lerp(new THREE.Color(0xffffff), 0.45);
    const col = new Float32Array(geo.attributes.position.count * 3);
    for (const gr of geo.groups) for (let i = gr.start; i < gr.start + gr.count; i++) (gr.materialIndex === 0 ? main : face).toArray(col, i * 3);
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.clearGroups();
    SLICE_GEO.set(key, geo);
  }
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.95, metalness: 0, transparent: true }));
  const g = new THREE.Group(); g.add(m);
  return g;
}

// 무대에서 치울 때 — 재질만 반환한다(형상은 재료끼리 공유라 버리면 다음 모형이 깨진다)
export function releaseFood(g) {
  g?.parent?.remove(g);
  g?.traverse(o => { if (o.isMesh) o.material.dispose(); });
}

export function setFoodOpacity(g, a) {
  g.traverse(o => { if (o.isMesh) { o.material.opacity = a; o.material.transparent = a < 1 || o.material.transparent; } });
}

// 원래 색에 곱한다(1,1,1 = 원래 색) — 굽기는 탈수록 어둡게. 재질 색이 정점색에 곱해진다
export function setFoodTint(g, r, gg, b) {
  g.traverse(o => { if (o.isMesh) o.material.color.setRGB(r, gg, b); });
}

// 미스 — 회색 한 벌을 재료마다 한 번 만들어 형상만 바꿔 끼운다(공유 형상의 색을 건드리지 않게)
export function greyFood(g) {
  g.traverse(o => {
    const p = o.userData.part;
    if (!o.isMesh || !p) return;
    if (!p.grey) {
      p.grey = p.geo.clone();
      const c = new THREE.Color(0x8a8a8a), col = p.grey.attributes.color;
      for (let i = 0; i < col.count; i++) col.setXYZ(i, c.r, c.g, c.b);
    }
    o.geometry = p.grey;
    o.material.color.setRGB(1, 1, 1);
  });
}
