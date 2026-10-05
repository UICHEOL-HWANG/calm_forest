// =============================================================
//  🏠 플레이어 집 외관 모델 — 단계별 조형(2026-09-10 리디자인)
//  ------------------------------------------------------------
//  3 코티지 · 4 브릭 로프트 · 5 펜트하우스 · 6 루프탑 빌라 · 7 정원 저택(모던/한옥 택1)
//  각 모듈은 build(THREE, H) 로 정면 +z 인 그룹을 돌려준다(원점 바닥 y=0).
//  H 는 재질·상자 도우미. 게임(game.js)과 컨셉 뷰어(sims/house-concepts)가 같은 파일을 쓴다.
//  userData.role: 'roof'|'wall'|'door' = 색 스와치 대상(역할당 재질 1개), 'window' = 밤 점등.
//  🧩 구성품(addons.js): 코인으로 산 장식을 mountHouseAddons 로 같은 로컬 공간에 얹는다.
// =============================================================
import { build as cottage } from './cottage.js';
import { build as loft } from './loft.js';
import { build as penthouse } from './penthouse.js';
import { build as villa } from './villa.js';
import { build as stage7Modern } from './stage7-modern.js';   // 🏡 7단계 정원 저택 — 모던(🌸 테라스 코트)
import { build as stage7Hanok } from './stage7-hanok.js';     //                      — 한옥(🏮 한옥 마당)
import { mergeByMaterial } from './merge.js';
import { DEFAULT_HOUSE_STYLE } from '../house-stage7.js';
import { HOUSE_ADDONS } from './addons.js';

export const HOUSE_MODELS = { 3: cottage, 4: loft, 5: penthouse, 6: villa };
/** 7단계는 스타일별 모델 — gameState.house.style('modern'|'hanok')로 고른다 */
export const STAGE7_MODELS = { modern: stage7Modern, hanok: stage7Hanok };

export function makeHouseHelpers(THREE) {
  return {
    clay: (hex, opts = {}) => new THREE.MeshStandardMaterial({ color: hex, roughness: 0.85, metalness: 0, flatShading: true, ...opts }),
    glass: (hex = 0x7fb3d5) => new THREE.MeshStandardMaterial({ color: hex, roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.55 }),
    box: (w, h, d, mat, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; return m; },
    role: (mesh, role) => { mesh.userData.role = role; return mesh; },
  };
}

/** 단계(3~7)에 맞는 집 그룹. 없는 단계면 null. 7단계만 style 이 필요하고, 정원·건물 조각이 많아 재질별로 병합해 돌려준다(드로우콜). */
export function buildHouseModel(THREE, stage, style = DEFAULT_HOUSE_STYLE) {
  if (stage === 7) {
    const fn = STAGE7_MODELS[style] || STAGE7_MODELS[DEFAULT_HOUSE_STYLE];
    const g = fn(THREE, makeHouseHelpers(THREE));
    mergeByMaterial(THREE, g);
    return g;
  }
  const fn = HOUSE_MODELS[stage];
  return fn ? fn(THREE, makeHouseHelpers(THREE)) : null;
}

/** 🧩 산 구성품(ids)을 단계(stage)·스타일(7단계만)에 맞는 자리에 얹은 그룹(name 'addons'). 그 단계에 자리가 없는 건 건너뛴다.
 *  구성품 안 조각은 모든 단계에서 재질별로 병합한다(드로우콜) — 움직이는 구성품(userData.anim)은 안 건드린다. */
export function mountHouseAddons(THREE, stage, ids = [], style = DEFAULT_HOUSE_STYLE) {
  const H = makeHouseHelpers(THREE);
  const root = new THREE.Group(); root.name = 'addons';
  for (const id of ids) {
    const def = HOUSE_ADDONS.find(a => a.id === id); if (!def) continue;
    const g = def.build(THREE, H, stage, style); if (!g) continue;
    g.name = id;
    if (!g.userData.anim) mergeByMaterial(THREE, g);   // 구성품은 조각이 많아 모든 단계에서 재질별 병합(움직이는 연기만 제외)
    root.add(g);
  }
  return root;
}
