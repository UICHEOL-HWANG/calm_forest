// =============================================================
//  🪜 천문대 기단·계단 치수 — 외관 지오메트리(exterior.js)와 발밑 높이(spaces/observatory.js)의 단일 출처
//  three 없이 불러올 수 있게 따로 둔다(node 테스트·공간 코드가 같이 쓴다).
// =============================================================
export const OBS_R = 4.2;      // 탑 벽 반지름
export const OBS_BASE = 1.2;   // 기단 높이
export const R_BASE = OBS_R;
export const STAIR_HALF_W = 1.1;
export const STAIR_STEPS = 4, STAIR_RISE = OBS_BASE / 4, STAIR_RUN = 0.45;
export const STAIR_FOOT = OBS_R + 3.15;   // 맨 아래 계단 앞 모서리(중심 R+2.9, 깊이 0.5)

/** 게이트 기준 (x, z) → 발밑 디딤판 높이(0 = 땅). 맨 위 계단 뒤는 기단 윗면. 앞에서만 오른다(양옆은 벽) */
export function stairHeight(lx, lz) {
  if (Math.abs(lx) > STAIR_HALF_W || lz > STAIR_FOOT || lz < OBS_R) return 0;
  const i = Math.min(STAIR_STEPS - 1, Math.floor((STAIR_FOOT - lz) / STAIR_RUN));
  return STAIR_RISE * (i + 1);
}
