// =============================================================
//  calm forest · 🐗🦝 대결 발밑 비우기 — 서 있는 자리 반경 안의 작물 인스턴스를 고른다(순수 규칙)
//  ------------------------------------------------------------
//  ▶ 밭이 꽉 차 있으면 곰·동물이 흔적 옆 칸 위에 서서 작물이 몸을 뚫고 나온다(2026-09-27 제보).
//    무대가 그 인스턴스만 잠깐 숨기고(크기 0) 끝나면 되돌린다 — js/duel/stage.js.
//  ▶ 반경은 밭 한 칸(격자 2) 안쪽 — 옆 칸 작물까지 지우면 "털린 밭"이 넓어 보인다.
//  테스트: tests/duel-clearance.test.mjs
// =============================================================

export const CLEAR_R = 0.95;

/** positions[i] 중 points 어느 하나와의 거리가 r 미만인 i 목록(오름차순, 중복 없음) */
export function nearIndices(positions, points, r = CLEAR_R) {
  const out = [];
  positions.forEach((p, i) => {
    if (points.some(q => Math.hypot(p.x - q.x, p.z - q.z) < r)) out.push(i);
  });
  return out;
}
