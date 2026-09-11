// =============================================================
//  calm forest · 🌾 밭 렌더링 규칙 (순수 함수 — DOM/Three 의존 없음)
//  ------------------------------------------------------------
//  밭 1칸이 흙 Box 1 + 이랑 Box 3 = 4드로우콜이었다. 121칸이면 흙만 484콜로
//  마을 전체(567콜)에 맞먹는다 → InstancedMesh 로 묶는다.
//  ▶ 여기엔 "언제 버퍼를 다시 쓸지"와 "팝 곡선"만 둔다. 그리기는 game.js.
//  ▶ 설계 docs/superpowers/specs/2026-09-12-farm-expansion-design.md §5
//  ▶ 테스트: npm test (tests/farm-render.test.mjs)
// =============================================================

/** 이랑 3줄의 z 오프셋 — 기존 createPlot 의 k*0.5 (k=-1,0,1) 그대로 */
export const RIDGE_Z = [-0.5, 0, 0.5];
export const RIDGE_PER_PLOT = RIDGE_Z.length;

/** 인스턴스 버퍼 초기 용량 — 3단계 121칸 + 마을 안 밭 여유.
 *  넘으면 칸이 안 생기는 게 아니라 game.js 가 버퍼를 재할당한다. */
export const PLOT_CAP = 160;

/**
 * 팝(톡 튀어오름) 스케일 — updatePops 의 곡선과 **같아야 한다**.
 * 다르면 밭이 생길 때의 손맛이 바뀐다.
 *   pop: 1(방금 생김) → 0(정착). 0 이하면 평상시 크기 1.
 */
export function popScale(pop) {
  if (!(pop > 0)) return 1;
  const p = 1 - pop;
  return p < 1 ? p + Math.sin(p * Math.PI) * 0.25 : 1;   // 선형을 초과하는 오버슛(곡선)
}

/**
 * 흙·이랑 인스턴스 버퍼를 다시 써야 하는지 판정하는 시그니처.
 * **흙 버퍼에 실제로 반영되는 것만** 넣는다 — 위치·젖음(색)·삽질(이랑 흐트러짐)·칸 수.
 * 성장도(growth)는 작물 메시 쪽이라 여기 넣으면 매 프레임 다시 쓰게 된다.
 */
export function plotsSignature(plots) {
  let sig = plots.length | 0;
  for (const p of plots) {
    sig = (Math.imul(sig, 31) + (p.x | 0)) | 0;
    sig = (Math.imul(sig, 31) + (p.z | 0)) | 0;
    sig = (Math.imul(sig, 31) + (p.watered ? 1 : 0)) | 0;
    sig = (Math.imul(sig, 31) + (p.digAt ? 1 : 0)) | 0;
  }
  return sig;
}

/** 지금 팝 애니메이션 중인 칸의 인덱스 — 이 칸들만 매 프레임 행렬을 갱신한다. */
export function poppingPlots(plots) {
  const out = [];
  for (let i = 0; i < plots.length; i++) if ((plots[i].pop || 0) > 0) out.push(i);
  return out;
}
