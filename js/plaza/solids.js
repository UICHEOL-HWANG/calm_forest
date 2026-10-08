// js/plaza/solids.js
// =============================================================
//  🚧 광장·돌길 기물 충돌체 — 월드 [x, z, r] 목록(THREE 없음, node 테스트 대상).
//  조형(build.js)과 같은 자리 상수를 여기서 함께 쓴다 — 기물을 옮기면 충돌체도 따라간다.
//  예전엔 기부함·좌판·벤치·나무만 막아 허수아비·가로등·볏단·호박·깃발 줄 기둥을 그대로 통과했다(2026-10-09).
//  밟고 지나가는 것(돌길·바닥)은 넣지 않는다.
// =============================================================
import { PLAZA, PLAZA_R, PLAZA_BOX, PLAZA_STALL_POS, PLAZA_POLE, PLAZA_ARCH, PLAZA_ARCH_HALF, PLAZA_BUNTING_POSTS } from '../data/plaza.js';

// 광장 로컬 좌표(중심 기준) — build.js 가 같은 값으로 그린다
export const SCARECROW = { x: -3.9, z: -1.5 };                       // 허수아비(3·4단계 같은 자리)
export const LAMP_POSTS = [[-3.0, -2.6], [3.0, -2.6]];               // 가로등(2단계~)
export const HAYBALES = [[-3.3, 2.4, 0.45], [-2.6, 2.9, 0.4]];       // 볏단 [x, z, 반지름]
export const PUMPKIN_PILE = { x: 3.55, z: 1.6, r: 0.75 };            // 호박 셋(x 3.0~4.1, z 1.35~1.9)을 덮는 원

const world = (x, z, r) => [PLAZA.x + x, PLAZA.z + z, r];

/** 광장 안 기물 — stage 0~4, phase 'before'|'active'|'after' */
export function plazaPropSolids(stage, phase) {
  if (stage < 1) return [];
  const out = [[PLAZA_BOX.x, PLAZA_BOX.z, 0.6]];                     // 기부함(완공 후 명판)
  if (phase === 'active') out.push([PLAZA_STALL_POS.x, PLAZA_STALL_POS.z, 0.9]);
  if (stage === 1) {
    for (let i = 0; i < 8; i++) {                                    // 구획 말뚝
      const a = (i / 8) * Math.PI * 2;
      out.push(world(Math.cos(a) * (PLAZA_R - 0.3), Math.sin(a) * (PLAZA_R - 0.3), 0.12));
    }
    for (const x of [-3.0, -2.2, -1.4]) out.push(world(x, 1.65, 0.3));   // 목재 더미(1.8 × 0.3)
    out.push(world(2.6, 0.35, 0.5));                                 // 돌 무더기
  }
  if (stage >= 2) {
    out.push(world(-3.6, 0, 0.5), world(3.6, 0, 0.5));               // 벤치
    for (const [x, z] of LAMP_POSTS) out.push(world(x, z, 0.15));
  }
  if (stage >= 3) {
    out.push(world(SCARECROW.x, SCARECROW.z, 0.25));
    for (const [x, z, r] of HAYBALES) out.push(world(x, z, r));
    out.push(world(PUMPKIN_PILE.x, PUMPKIN_PILE.z, PUMPKIN_PILE.r));
  }
  if (stage === 4) out.push(world(0, 0, 1.0));                       // 수확 나무 둘레석
  return out;
}

/** 돌길 쪽 기물 — 아치 기둥(가운데는 지나간다)·깃대·깃발 줄 기둥 */
export function plazaPathSolids(stage, phase) {
  if (stage < 1) return [];
  const out = [-1, 1].map(s => [PLAZA_ARCH.x + s * PLAZA_ARCH_HALF, PLAZA_ARCH.z, 0.3]);
  if (phase === 'active' && stage < 4) {
    out.push([PLAZA_POLE.x, PLAZA_POLE.z, 0.3]);
    for (const [x, z] of PLAZA_BUNTING_POSTS) out.push([x, z, 0.12]);
  }
  return out;
}
