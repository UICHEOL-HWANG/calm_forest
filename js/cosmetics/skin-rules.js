// js/cosmetics/skin-rules.js
// =============================================================
//  calm forest · 🧥 전신 스킨 규칙 (순수 — THREE/DOM 의존 없음)
//  ------------------------------------------------------------
//  스펙: docs/superpowers/specs/2026-10-01-premium-skins-design.md §2-2·§3-2
//  ▶ 정령 자취는 **자국 칸이 비었을 때만**(결정 A, sims/skin-trail-rule-sim.html).
//    산 자국이 쓸모없어지지 않고, 자국 두 겹이 겹치지 않는다.
//  ▶ 'sprout' 는 카탈로그 상품이 아니다 — js/cosmetics/trail.js 조형 표에만 있다(살 수 없음).
//  ▶ 테스트: tests/skin-rules.test.mjs
// =============================================================

export const SKIN_TRAIL = Object.freeze({ forest_spirit: 'sprout' });
export const SQUASH = 0.08;   // 🧸 걸을 때 말랑 — 발이 닿는 순간 키가 8% 눌린다(부피는 xz 로 보존)

/** 실제로 찍을 자국 id — 자국 칸이 우선, 비었으면 스킨 자취, 둘 다 없으면 null */
export function effectiveTrail(cos) {
  const eq = cos?.equipped;
  return eq?.trail || SKIN_TRAIL[eq?.skin] || null;
}

export function skinSquashes(skinId) { return skinId === 'plush_doll'; }

/** 세로 배율 — phase 는 game.js walkPhase(발 높이 = |sin|). 꺼져 있으면 1 */
export function squashOf(phase, on) {
  return on ? 1 - SQUASH * (1 - Math.abs(Math.sin(phase))) : 1;
}

/** 배 천 패치 z — 몸통 타원체가 배 구보다 앞으로 튀어나올 수 있다(곰·판다·개·병아리): 둘 중 큰 쪽 + 0.004 */
export function bellyPatchZ(R, bs) {
  const bellyFront = R * 0.55 + R * 0.62 * 0.6;
  const bodyFront = R * bs[2] * Math.sqrt(Math.max(0, 1 - (0.16 / bs[1]) ** 2));
  return Math.max(bellyFront, bodyFront) + 0.004;
}
