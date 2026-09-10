// =============================================================
//  calm forest · 🪵 야외 장식 옮기기 규칙 (순수 함수 — DOM/Three 의존 없음)
//  ------------------------------------------------------------
//  베타 피드백: "작업대에서 만든 울타리·허수아비를 한 번 놓으면 못 옮겨요"
//  ▶ 실내 가구(🛋️ indoor decor v2)와 같은 문법 — 옆에 서면 "옮기기" 프롬프트,
//    액션으로 들어 올려 다시 놓거나(값 없음) 🧺 보관(작업대에서 값 없이 다시 꺼냄).
//  ▶ 테스트: npm test (tests/outdoor-move.test.mjs)
// =============================================================

/**
 * 플레이어에서 가장 가까운 야외 장식 — 2D 중심 거리(모두 작은 물건이라 발자국 상자 불필요).
 *   items: [{ x, z }]  (메시 position 이나 저장 레코드 모두 됨)
 *   반환: { index, d } | null  (reach 안에 아무것도 없으면 null)
 */
export function nearestOutdoorAt(items, px, pz, reach) {
  let best = null;
  for (let i = 0; i < items.length; i++) {
    const d = Math.hypot(px - items[i].x, pz - items[i].z);
    if (d < reach && (!best || d < best.d)) best = { index: i, d };
  }
  return best;
}

/**
 * 🧺 보관함에서 하나 꺼낸 새 객체 — 없으면 null(꺼낼 게 없다). 0이 되면 키를 지운다.
 *   stored: { id: 개수 }
 */
export function takeStored(stored, id) {
  const n = (stored && stored[id]) || 0;
  if (n <= 0) return null;
  const next = { ...stored };
  if (n - 1 > 0) next[id] = n - 1; else delete next[id];
  return next;
}
