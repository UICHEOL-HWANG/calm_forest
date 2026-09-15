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
export function nearestOutdoorAt(items, px, pz, reach, getPos = (it) => it) {
  let best = null;
  for (let i = 0; i < items.length; i++) {
    const p = getPos(items[i]);
    const d = Math.hypot(px - p.x, pz - p.z);
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

// ── 🌾 밭일 우선 / 🪵 탭 집기 사거리 ────────────────────────────
//  베타: "밭에 허수아비가 겹치면 씨앗을 심으려는데 허수아비가 잡혀요"
//  ▶ 허수아비는 원래 밭 9칸 안에 세우는 물건이라 겹침이 기본 동선이다. 그런데
//    옮기기 프롬프트가 잡히면 handleAction 맨 위에서 가로채 농사 분기까지 못 간다.
//  ▶ 규칙은 주민(NPC)과 같다 — 밭일이 먼저(farmActionFirst). 대신 장식을 **직접 탭**하면
//    조준이 명시적이므로 밭일과 상관없이 집힌다(실내 가구 tryPickDecor 와 같은 문법).

/** 근접 프롬프트 사거리(중심/가장자리 거리) */
export const OUTDOOR_MOVE_REACH = 1.0;
/**
 * 탭 집기 사거리 — 조준이 명시적이라 근접 프롬프트(1.0)보다 살짝 넉넉하다.
 * 넓히면 프롬프트·링이 안 뜨는 구간에서 탭만 집기로 동작하는 "표시 없는 사거리"가 길어진다.
 * 🪨디딤돌·💐꽃밭은 밟고 지나가는 물건이라 발밑 땅을 탭하는 습관과 정면으로 부딪힌다 — 그래서 1.4.
 */
export const OUTDOOR_TAP_REACH = 1.4;

/**
 * 근접 프롬프트에 "옮기기"를 띄울까.
 *   hasPrompt  이미 다른 프롬프트가 잡혔다(문·시설·비료…)
 *   placing    지금 뭔가 들고 배치 중
 *   nearNPC    주민이 옆에 있다
 *   outdoorZone 야외 장식을 다룰 수 있는 구역인가
 *   farmFirst  지금 이 자리에서 밭일이 우선인가(farmActionFirst)
 */
export function canPromptOutdoorMove({ hasPrompt, placing, nearNPC, outdoorZone, farmFirst, isFacility }) {
  if (hasPrompt || placing || nearNPC || !outdoorZone) return false;
  // 🧺창고 꺼내기·📋게시판 고용은 "옮기기"가 아니라 그 시설의 주 기능이라 밭일에 양보하지 않는다 —
  //   양보시키면 "창고를 비워야 옮길 수 있어요 — 옆에서 액션으로 꺼내요" 안내를 그 자리에서 따를 수 없게 된다.
  return !!isFacility || !farmFirst;
}

/**
 * 캐릭터↔야외 장식 2D 거리 — 발자국(halfW/halfD)이 있는 시설은 가장자리까지,
 * 그냥 장식은 중심까지(half 0). 근접 프롬프트와 탭 집기가 같은 잣대를 써야 한다.
 */
export function outdoorDistance(px, pz, x, z, halfW = 0, halfD = 0) {
  return Math.hypot(Math.max(0, Math.abs(px - x) - halfW), Math.max(0, Math.abs(pz - z) - halfD));
}
