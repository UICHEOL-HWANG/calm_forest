// js/shop/reveal-pose.js
// =============================================================
//  calm forest · 💎 획득 연출의 시간축·문구 — 순수(THREE 없음, node 테스트 대상)
//  ------------------------------------------------------------
//  스펙: docs/superpowers/specs/2026-10-01-premium-trails-design.md §4·§8 · 시안 sims/premium-reveal-sim.html (A)
// =============================================================

export const REVEAL_COPY = Object.freeze({
  firefly: Object.freeze({ name: '반딧불 자국', desc: '밤이 되면 발자국마다 반딧불이 떠올라요' }),
  rainbow: Object.freeze({ name: '무지개 자국', desc: '걸음마다 일곱 빛깔이 차례로 남아요' }),
});

const clamp01 = (x) => Math.max(0, Math.min(1, x));
const easeOutBack = (t) => { const c = 1.7; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };

/** 경과 t 초의 모습 — 0~0.25 어두워짐 · 0.25~0.95 커짐(오버슈트) · 1.1 카드 */
export function revealPose(t) {
  const k = clamp01((t - 0.25) / 0.7);
  return { dim: clamp01(t / 0.25), scale: k === 0 ? 0 : easeOutBack(k), rays: k, card: t >= 1.1 };
}
