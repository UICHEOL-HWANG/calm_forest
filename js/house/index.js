// =============================================================
//  🏠 플레이어 집 외관 모델 — 단계별 조형(2026-09-10 리디자인)
//  ------------------------------------------------------------
//  3 코티지 · 4 브릭 로프트 · 5 펜트하우스 · 6 루프탑 빌라
//  각 모듈은 build(THREE, H) 로 정면 +z 인 그룹을 돌려준다(원점 바닥 y=0).
//  H 는 재질·상자 도우미. 게임(game.js)과 컨셉 뷰어(sims/house-concepts)가 같은 파일을 쓴다.
//  userData.role: 'roof'|'wall'|'door' = 색 스와치 대상(역할당 재질 1개), 'window' = 밤 점등.
// =============================================================
import { build as cottage } from './cottage.js';
import { build as loft } from './loft.js';
import { build as penthouse } from './penthouse.js';
import { build as villa } from './villa.js';

export const HOUSE_MODELS = { 3: cottage, 4: loft, 5: penthouse, 6: villa };

export function makeHouseHelpers(THREE) {
  return {
    clay: (hex, opts = {}) => new THREE.MeshStandardMaterial({ color: hex, roughness: 0.85, metalness: 0, flatShading: true, ...opts }),
    glass: (hex = 0x7fb3d5) => new THREE.MeshStandardMaterial({ color: hex, roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.55 }),
    box: (w, h, d, mat, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; return m; },
    role: (mesh, role) => { mesh.userData.role = role; return mesh; },
  };
}

/** 단계(3~6)에 맞는 집 그룹. 없는 단계면 null */
export function buildHouseModel(THREE, stage) {
  const fn = HOUSE_MODELS[stage];
  return fn ? fn(THREE, makeHouseHelpers(THREE)) : null;
}
