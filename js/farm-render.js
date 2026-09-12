// =============================================================
//  calm forest · 🌾 밭 렌더링 규칙 (순수 함수 — DOM/Three 의존 없음)
//  ------------------------------------------------------------
//  밭 1칸이 흙 Box 1 + 이랑 Box 3 = 4드로우콜이었다 → InstancedMesh 로 묶었다.
//  이후 A안(js/farm-soil.js)에서 흙은 이어진 면 하나가 되고 이랑은 사라졌다.
//  ▶ 여기엔 이제 "팝 곡선"과 "팝 대상 추림"만 남는다. 그리기는 game.js.
//  ▶ 설계 docs/superpowers/specs/2026-09-12-farm-expansion-design.md §5
//  ▶ 테스트: npm test (tests/farm-render.test.mjs)
// =============================================================

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

/** 지금 팝 애니메이션 중인 칸의 인덱스 — 이 칸들만 매 프레임 행렬을 갱신한다. */
export function poppingPlots(plots) {
  const out = [];
  for (let i = 0; i < plots.length; i++) if ((plots[i].pop || 0) > 0) out.push(i);
  return out;
}
