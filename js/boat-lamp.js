// =============================================================
//  calm forest · 🏮 뱃머리 등불 배치 규칙 (순수 함수 — Three 의존 없음)
//  ------------------------------------------------------------
//  베타 피드백: "등불 단 게 더 안 보여요 — 등불이 앞에 바위를 가려서".
//  등불(⭐10+🪙100)은 밤을 밝히는 업그레이드인데, 구(球)가 1인칭 시선 바로
//  아래 화면 한가운데(y 0.95 · x 0)에 박혀 있어 8~15m 앞 장애물이 뜨는 띠를
//  메시 + 블룸 후광으로 덮었다. 업그레이드가 하향이 되는 상태였다.
//
//  ▶ 규칙: 등불 머리는 ① 시선보다 **위**, ② 화면 중앙에서 옆으로 비켜 단다.
//    장애물은 늘 시선 **아래**(물 위)에 뜨므로, 위로 올리면 겹치지 않는다.
//  ▶ 여기엔 "어디에 달아야 안 가리는가"만 둔다. 메시·조명 생성은 game.js.
//  ▶ 테스트: npm test (tests/boat-lamp.test.mjs)
// =============================================================

/** game.js 의 카메라 세로 화각 — PerspectiveCamera(42, ...) 와 **같아야 한다**. */
export const BOAT_FOV = 42;

/**
 * 1인칭 카메라 위치·시선 (배 로컬 좌표, updateBoatCamera 와 같은 값).
 *
 * ⚠️ 함정: z 는 **고정값이 아니다**. updateBoatCamera 는 카메라를 목표점으로 lerp 하는데
 *    계수가 프레임당 0.14 라, 달리는 동안 카메라가 목표점보다 뒤로 밀린 채 따라온다
 *    (정지 0.55 → 기본 속도 ≈1.5 → 스퍼트 ≈2.8). "카메라 뒤(z>0.55)에 두면 안 보이겠지"
 *    하고 돛대를 세웠다가 화면 왼쪽에 통나무처럼 잡혔다. 배 위 물건은 **전 구간**에서 검사할 것.
 */
export const BOAT_EYE = { y: 1.5, z: 0.55 };
export const EYE_Z_RANGE = [0.55, 2.8];        // [정지, 스퍼트] — 이 사이 어디든 카메라가 있을 수 있다
export const BOAT_LOOK = { y: 1.05, z: -14 };

/** 🏮 등불 머리(구)와 그걸 매단 기둥. makeBoatRideable 이 이 값으로 배치한다. */
export const BOAT_LAMP = { x: -0.36, y: 2.06, z: -1.7, r: 0.125 };
/** 뱃전 왼쪽에 세운 가는 기둥 — 등불을 시선 위로 들어 올리는 역할만 한다(얇고 어두울 것). */
export const BOAT_LAMP_POST = { x: -0.36, z: -1.7, bottom: 0.45, top: 1.98, r: 0.021 };

/** 물 위 장애물이 가장 높이 솟는 높이 — 🪧 다리 기둥(Box 2.6, y 0.35) 꼭대기. */
export const OBSTACLE_TOP = 1.65;

const rad = (d) => (d * Math.PI) / 180;

/** 시선(눈→바라보는 점) 기준 정규직교 기저 — 앞(f)과 위(u). 좌우 회전은 없다(x축 그대로). */
function basis() {
  const dy = BOAT_LOOK.y - BOAT_EYE.y, dz = BOAT_LOOK.z - BOAT_EYE.z;
  const len = Math.hypot(dy, dz);
  const f = { y: dy / len, z: dz / len };
  return { f, u: { y: -f.z, z: f.y } };     // f 를 90° 돌린 것(위쪽)
}

/**
 * 점 하나의 화면 세로 위치. **화면 반높이를 1** 로 본 값.
 *   +1 = 화면 맨 위 · 0 = 시선 정중앙 · -1 = 화면 맨 아래.
 * 화면 가로는 aspect 에 따라 달라지지만 세로는 기기와 무관하다 — 그래서 세로로 판정한다.
 */
export function screenY(pt, eyeZ = BOAT_EYE.z, fov = BOAT_FOV) {
  const { f, u } = basis();
  const vy = pt.y - BOAT_EYE.y, vz = pt.z - eyeZ;
  const depth = vy * f.y + vz * f.z;         // 시선 방향 깊이
  if (depth <= 0) return NaN;                // 등 뒤 — 화면에 없다
  return (vy * u.y + vz * u.z) / (depth * Math.tan(rad(fov / 2)));
}

/** 화면 가로 위치(반너비를 1 로). aspect = 가로/세로 — 세로 화면(폰)은 1 보다 작다. */
export function screenX(pt, aspect, eyeZ = BOAT_EYE.z, fov = BOAT_FOV) {
  const { f } = basis();
  const depth = (pt.y - BOAT_EYE.y) * f.y + (pt.z - eyeZ) * f.z;
  if (depth <= 0) return NaN;
  return pt.x / (depth * Math.tan(rad(fov / 2)) * aspect);
}

/** **카메라에서** dist m 앞, 높이 h 인 장애물의 꼭대기가 화면 어디에 뜨는가(screenY 와 같은 단위). */
export function obstacleScreenY(dist, h = OBSTACLE_TOP, eyeZ = BOAT_EYE.z) {
  return screenY({ x: 0, y: h, z: eyeZ - dist }, eyeZ);
}

/**
 * 등불이 장애물 띠를 침범하지 않는가 — 등불 **아랫변**이 모든 장애물 위에 있어야 한다.
 * near..far 는 "피할지 말지 판단하는 거리" 구간(스폰 70m ~ 코앞 4m).
 */
export function lampClearsObstacles(lamp = BOAT_LAMP, near = 4, far = 70) {
  for (const eyeZ of [EYE_Z_RANGE[0], (EYE_Z_RANGE[0] + EYE_Z_RANGE[1]) / 2, EYE_Z_RANGE[1]]) {
    const bottom = screenY({ x: lamp.x, y: lamp.y - lamp.r, z: lamp.z }, eyeZ);
    if (!(bottom > 0)) return false;                                   // 등불이 시선 아래로 내려오면 끝
    for (let d = near; d <= far; d += 0.5) if (obstacleScreenY(d, OBSTACLE_TOP, eyeZ) >= bottom) return false;
  }
  return true;
}
