// 🌓 태양 그림자 상자가 어디까지 닿는지 판정하는 순수 규칙.
//
// sunLight 의 그림자 카메라(js/game.js)는
//   · 중심: updateDayNight 에서 clamp(player.position, ±VILLAGE_CLAMP) — 마을 안에서만 따라온다
//   · 범위: 그 중심에서 ±BOX_HALF 인 40m 상자, near 1 / far 60
//
// ⚠️ 상자는 월드 축이 아니라 **광원 방향** 기준이다. 해가 낮으면 지면 투영이 BOX_HALF 보다
// 훨씬 길어지므로 ±BOX_HALF 로 판정하면 "밖"이라고 잘못 말한다(위험한 방향의 오류).
// 실측으로 진짜 최대 도달 거리를 구했다 — three 0.160, far=60, 광원 거리 18, 상자 중심 (0,18),
// 태양 각도 360 × 방위 72 스윕: **중심에서 49m**(최악 timeOfDay≈0.597 의 낮은 해).
// 여기에 여유를 얹어 60m 를 기준으로 쓴다. shadow.camera.far 나 광원 거리를 바꾸면 다시 재야 한다.
export const VILLAGE_CLAMP = 18;   // updateDayNight 의 그림자 상자 추적 클램프
export const BOX_HALF = 20;        // sunLight.shadow.camera 반폭(40m 상자)
export const SHADOW_FAR = 60;      // sunLight.shadow.camera.far — MAX_REACH 실측의 전제
export const MAX_REACH = 60;       // 실측 49m + 여유

// 이 좌표에 태양 그림자가 닿을 수 있는가. 경계는 닿는 쪽으로 본다(보수적 — 끄지 않는다).
export function shadowReaches(x, z, reach = MAX_REACH) {
  const cx = Math.max(-VILLAGE_CLAMP, Math.min(VILLAGE_CLAMP, x));   // 그 위치가 만드는 상자 중심
  const cz = Math.max(-VILLAGE_CLAMP, Math.min(VILLAGE_CLAMP, z));
  return Math.hypot(x - cx, z - cz) <= reach;
}

// ─────────────────────────────────────────────────────────────
//  섀도맵을 멈춰도 되는 공간 — 이유가 두 갈래다
// ─────────────────────────────────────────────────────────────

// ① 기하학적으로 상자 밖 (shadowReaches === false). 그림자가 물리적으로 닿지 않는다.
export const OUT_OF_REACH_FLAGS = ['atFarm', 'atMine', 'atCafe', 'atRiver', 'atMist', 'atSea'];

// ② 상자는 닿지만 실측상 보이는 그림자가 없는 공간.
// 실내(INT z=52, 상자 중심에서 34m — 하루의 절반 이상 절두체 안): 지붕이 있고 interiorLamp 로
// 조명해서 어느 태양 각도에서도 샘플링되는 그림자가 없다.
//   실측 2026-09-12 — 진입 시점(timeOfDay 0.32)에 섀도맵을 한 번 굽고 얼린 뒤 해를 옮기며 비교:
//   timeOfDay 0.25·0.40·0.50·0.60·0.70 전부에서 바뀐 픽셀 0 / 3,145,728, 드로우콜 189~210 → 57.
//   같은 절차로 마을은 92,116~447,426 픽셀(9~44%)이 틀어진다(대조군이 작동함을 확인).
//   ⚠️ 실내 조명·지붕 구조를 바꾸면 이 예외를 다시 실측할 것.
export const MEASURED_SHADOWLESS_FLAGS = ['indoor'];

// 마을 밖 인스턴스 공간의 "안에 있는가" 플래그 이름(js/game.js 의 모듈 변수와 같은 이름).
// 새 서브 공간을 추가하면 여기에 더한다 — 안 더하면 그 공간에서 보이지도 않는 마을 그림자를 계속 그린다.
export const SUBSPACE_FLAGS = [...MEASURED_SHADOWLESS_FLAGS, ...OUT_OF_REACH_FLAGS];

// 섀도맵을 갱신해야 하는가 = 그림자가 실제로 보이는 마을에 있는가.
// 서브 공간 플래그가 하나라도 켜져 있으면 멈춘다.
export function shadowActiveFor(spaces) {
  return !SUBSPACE_FLAGS.some(f => spaces[f]);
}
