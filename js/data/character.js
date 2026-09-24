// =============================================================
//  📦 팔·도구 쥐는 자세 상수·충돌 반경
//  ------------------------------------------------------------
//  js/game.js 앞 구간에서 원문 그대로 옮겨 온 데이터 표(2026-09-24, 분리 1단계).
//  ⚠️ 여기엔 값만 둔다 — 게임 상태(let·gameState)를 읽는 코드는 넣지 않는다.
//     옮긴 방법·검증: tools/refactor/ · docs/superpowers/specs/2026-09-24-gamejs-split-phase1-design.md
// =============================================================
import * as THREE from 'three';

export const _dgUp = new THREE.Vector3(0, 1, 0), _dgQ = new THREE.Quaternion(), _dgW = new THREE.Quaternion(), _dgPQ = new THREE.Quaternion(), _dgP = new THREE.Vector3(), _dgS = new THREE.Vector3();

//   팔은 몸 반지름 R 비례(굵기 .23R·길이 .22R), 평상시엔 아래 방향벡터로 조준 고정.
export const _axX = new THREE.Vector3(1, 0, 0), _axZ = new THREE.Vector3(0, 0, 1);

//   방향은 sims/tool-visibility-sim.html 검수값 — 이전 (.44,-.85,.28)은 벌림이 좁아
//   몸 큰 곰·판다에서 도구가 몸에 파묻혔다. 좌우 대칭.
export const ARM_AIM_R = new THREE.Quaternion().setFromUnitVectors(
  new THREE.Vector3(0, -1, 0), new THREE.Vector3(.29, -.90, .32).normalize());

export const ARM_AIM_L = new THREE.Quaternion().setFromUnitVectors(
  new THREE.Vector3(0, -1, 0), new THREE.Vector3(-.29, -.90, .32).normalize());

// 옆베기: 몸을 감았다 풀며 팔이 가로로 쓸고 감 — 와인드업 63° → 반대편 86°
export const SLASH = { back: 1.10, strike: -1.50, lift: -1.20 };

export const WRIST_MAX = 0.55;   // 1.0이면 팔+도구가 한 줄 막대가 돼 어색(시뮬에서 확인)

// 도구 쥐는 자세: 팔 조준 회전을 상쇄해 자루를 세움 / 스윙 땐 팔의 연장(180°)
export const TOOL_QREST = ARM_AIM_R.clone().invert()
  .multiply(new THREE.Quaternion().setFromAxisAngle(_axX, -.12))
  .multiply(new THREE.Quaternion().setFromAxisAngle(_axZ, -.16));

export const TOOL_QSWING = new THREE.Quaternion().setFromAxisAngle(_axX, Math.PI);

// 🐤 날개-팔은 조준 회전이 팔(ARM_AIM)과 달라 쥐는 자세 상쇄값도 다르다(sims/chick-wing-sim.html 검증)
export const TOOL_QREST_WING = new THREE.Quaternion().setFromAxisAngle(_axZ, 0.20)
  .multiply(new THREE.Quaternion().setFromAxisAngle(_axX, -.12))
  .multiply(new THREE.Quaternion().setFromAxisAngle(_axZ, -.16));

// ✊ 쥐는 점 — 팔 있는 캐릭터가 도구를 든 자세(sims/tool-grip-sim.html ④ 검수값).
//   발바닥 중심에서 자루를 세우면 자루가 팔뚝 속을 뚫고 올라왔다(물조리개·씨앗은 발바닥에 박힘).
//   · 긴 도구: 자루를 발바닥 앞쪽(z)으로 옮기고 끝 혹이 주먹 아래로 나오게 내린다(y)
//   · 물조리개·씨앗: 통 윗단·주머니 목을 쥐고 몸통을 매단다(주둥이는 바깥-앞 대각선)
//   p 는 쥐는 자세 회전 뒤의 도구 로컬 오프셋. 표에 없는 것(🌊릴대·꾸미기 가구)은 기존 자세 그대로.
//   ⚠️ 휘두르는 모션은 바꾸지 않는다(사용자 결정). 옆베기 중엔 toolGripFade 로 원본 쥐는 점에 돌아간다 —
//      새 쥐는 점 그대로 원본 스윙을 하면 자루가 앞으로 나온 만큼 몸에 더 박힌다(베기 끝 관통 26%→58%).
export const TOOL_QREST_HOLD = ARM_AIM_R.clone().invert()
  .multiply(new THREE.Quaternion().setFromAxisAngle(_axX, .12))
  .multiply(new THREE.Quaternion().setFromAxisAngle(_axZ, -.05));

export const mkGrip = (x, y, z, ry = 0) => ({ p: new THREE.Vector3(x, y, z), q: new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), ry) });

export const GRIP_LONG = mkGrip(0, -0.07, 0.075);

export const TOOL_GRIP = {
  axe: GRIP_LONG, hoe: GRIP_LONG, sickle: GRIP_LONG, shovel: GRIP_LONG, hammer: GRIP_LONG, rod: GRIP_LONG, net: GRIP_LONG,
  water: mkGrip(0.08, -0.30, 0.08, -0.8),
  seed: mkGrip(0.08, -0.20, 0.08),
};

// 3단 완급(감기 ease-out → 휙 ease-in → 복귀) — 원본 도구 곡선에서 물려받은 뼈대
export function slashPhase(p, B, S) {
  if (p < .32) { const q = p / .32;        return B * (1 - (1-q)*(1-q)); }
  if (p < .58) { const q = (p - .32)/.26;  return B + (S - B) * q * q; }
  const q = (p - .58) / .42;               return S + (0 - S) * (1 - (1-q)*(1-q));
}

export const PLAYER_R = 0.42;            // 캐릭터 몸통 반경(대략)

export const NPC_R = 0.45;               // 주민·손님 몸통 반경(대화 2.6 / 서빙 2.4 사거리엔 영향 없음)
