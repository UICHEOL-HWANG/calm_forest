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

// ① 기하학적으로 상자 밖. 그림자가 물리적으로 닿지 않는다.
// 거리는 **공간 중심이 아니라 그 공간에서 receiveShadow=true 인 메시의 실제 바운딩 박스 최근접점**
// 에서 상자 중심(clamp 된 플레이어 위치)까지 잰 값이다 — 중심만 보면 큰 배경 메시를 놓친다.
//   실측 2026-09-12 (씬 그래프 Box3): 동굴 218.5m · 안개 217.5m · 카페 290.8m · 바다 292m · 강 376m.
//   전부 MAX_REACH(60) 보다 한참 밖이라 여유가 크다.
export const OUT_OF_REACH_FLAGS = ['atMine', 'atCafe', 'atRiver', 'atMist', 'atSea'];

// ② 상자는 닿지만 실측상 보이는 그림자가 없는 공간.
// 진입 시점(timeOfDay 0.32)에 섀도맵을 한 번 굽고 얼린 뒤 해를 옮기며 live 렌더와 픽셀 비교했다
// (timeOfDay 0.25·0.40·0.50·0.60·0.70). 같은 절차로 마을은 49,868~447,426 픽셀(5~44%)이 틀어져
// 측정이 민감함을 확인했다.
//
// · 실내 indoor — 최근접 receiveShadow 27m. 바뀐 픽셀 0, 드로우콜 189~210 → 57.
//   ⚠️ **천장은 없다**(buildInterior 는 바닥 + 벽 4장 + 문틀뿐). 0 픽셀을 지탱하는 구조는
//   ㄱ) 실내 유일한 캐스터가 뒷벽 하나이고 ㄴ) 그림자 타깃이 clamp(z)=18 에 묶여 +z 를 등지며
//   ㄷ) 방을 밝히는 게 그림자를 만들지 않는 interiorLamp(PointLight) 라는 점이다.
//   이 셋 중 하나라도 바뀌면(천장 추가·램프 교체·캐스터 추가) 다시 실측할 것.
// · 텃밭 atFarm — 최근접 receiveShadow 18m. 배경 skirt 가 CircleGeometry(48) 라 마을 쪽으로
//   z=36 까지 뻗어 온다(공간 중심 66m 만 보면 놓친다). 바뀐 픽셀 0, 드로우콜 191~213 → 59.
//   ⚠️ skirt 반경·위치를 바꾸거나 마을 쪽에 그림자 받는 큰 면을 더하면 다시 실측할 것.
export const MEASURED_SHADOWLESS_FLAGS = ['indoor', 'atFarm'];

// 마을 밖 인스턴스 공간의 "안에 있는가" 플래그 이름(js/game.js 의 모듈 변수와 같은 이름).
// 새 서브 공간을 추가하면 여기에 더한다 — 안 더하면 그 공간에서 보이지도 않는 마을 그림자를 계속 그린다.
export const SUBSPACE_FLAGS = [...MEASURED_SHADOWLESS_FLAGS, ...OUT_OF_REACH_FLAGS];

// 섀도맵을 갱신해야 하는가 = 그림자가 실제로 보이는 마을에 있는가.
// 서브 공간 플래그가 하나라도 켜져 있으면 멈춘다.
export function shadowActiveFor(spaces) {
  return !SUBSPACE_FLAGS.some(f => spaces[f]);
}
