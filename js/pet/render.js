// js/pet/render.js
// =============================================================
//  calm forest · 🐾 펫 렌더 — 따라다니기·이동
//  ------------------------------------------------------------
//  ▶ 이 파일은 **움직임만** 안다. 조형은 js/pet/art.js 가 준다 —
//    종이 바뀌어도 여기는 안 바뀐다.
//  ▶ 계획서는 Task 12 전까지 자리표시 구(球)를 돌려주라고 했지만,
//    Task 12 가 먼저 끝나 js/pet/art.js 가 이미 있다 — 계획서 Task 12 Step 4 대로
//    buildPet 을 그대로 돌려준다(죽은 자리표시 코드를 두지 않는다).
// =============================================================

import { buildPet } from './art.js';

const FOLLOW_DIST = 1.3, FOLLOW_SPD = 3.2, WALK_SPD = 3.6, ARRIVE = 0.35;
const CATCH_UP = 0.9;   // 뒤처진 거리 1칸당 따라붙는 속도 가산(최대 3배)
//  🚪 공간을 옮기면 플레이어는 지도 반대편으로 순간이동한다(마을 z≈0 ↔ 텃밭 z≈84).
//     그때 걸어서 따라오게 두면 1분 넘게 울타리·건물을 뚫고 건너온다 — 그 거리는 그냥 붙는다.
const SNAP_DIST = 10;

/** 종·단계에 맞는 조형 Group. 모르는 종이면 null(art.js 의 계약 그대로) */
export function spawnPet(THREE, kind, stage) {
  return buildPet(THREE, kind, stage);
}

/** 너무 멀면(= 공간 이동) 걷지 않고 발밑으로 붙인다. 붙였으면 true */
export function snapIfFar(pet3d, target) {
  if (Math.hypot(target.x - pet3d.position.x, target.z - pet3d.position.z) <= SNAP_DIST) return false;
  pet3d.position.set(target.x, 0, target.z);
  return true;
}

export function followPlayer(pet3d, target, dt) {
  const dx = target.x - pet3d.position.x, dz = target.z - pet3d.position.z;
  const d = Math.hypot(dx, dz);
  if (d <= FOLLOW_DIST) return;
  //  ⚠️ 플레이어는 6 u/s 로 걷는다(js/game.js updatePlayer 의 speed). 계획서의 3.2 로만 달리면
  //     영영 못 따라잡아 화면 밖으로 처지다가 SNAP_DIST 에서 발밑으로 튄다 —
  //     멀어질수록 빨라지게(최대 3배 = 9.6 u/s) 해서 2.3칸쯤 뒤를 따라 붙게 한다.
  const spd = FOLLOW_SPD * (1 + Math.min(2, (d - FOLLOW_DIST) * CATCH_UP));
  const k = Math.min(1, (spd * dt) / d);
  pet3d.position.x += dx * k; pet3d.position.z += dz * k;
  pet3d.rotation.y = Math.atan2(dx, dz);
}

/** 도착하면 true */
export function walkTo(pet3d, x, z, dt) {
  const dx = x - pet3d.position.x, dz = z - pet3d.position.z;
  const d = Math.hypot(dx, dz);
  if (d <= ARRIVE) return true;
  const k = Math.min(1, (WALK_SPD * dt) / d);
  pet3d.position.x += dx * k; pet3d.position.z += dz * k;
  pet3d.rotation.y = Math.atan2(dx, dz);
  return false;
}
