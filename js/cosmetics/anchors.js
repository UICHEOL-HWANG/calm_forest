// js/cosmetics/anchors.js
// =============================================================
//  calm forest · 🎀 꾸미기 앵커 계산 (순수 함수 — THREE 의존 없음)
//  ------------------------------------------------------------
//  스펙: docs/superpowers/specs/2026-09-21-cosmetics-pet-design.md §3
//
//  ⚠️ 여기서 네 번 틀렸고 원인이 전부 같았다 — **몸은 타원체인데 원으로 계산했다.**
//     ① 원형 링으로 어깨끈 → 배 앞뒤로 튀어나온 훌라후프
//     ② 방향벡터를 그대로 좌표로 → 길이가 1 미만이라 끈이 몸 속에 묻힘
//     ③ 방향벡터 × 체형 배율 → 그래도 표면 안쪽
//     ④ 정옆(z=0)에 매달기 → 끈 끝이 몸 뒤로 돌아가 가방 직전에 잘림
//     타원체 표면까지의 거리는 t = 1/‖(x/a, y/b, z/c)‖ 로 **풀어야** 한다.
//
//  ▶ 끈의 경유점과 가방 앵커를 onSurf() 하나로 잡는다. 좌표를 두 군데서 정하면 또 어긋난다.
//  ▶ 테스트: npm test (tests/cosmetics-anchors.test.mjs)
// =============================================================

/** 몸 표면보다 얼마나 밖에 띄울지 */
export const SURF = 1.06;

/** 모자 아래 테두리 높이(× HR). 🐱고양이 귀 밑동 0.46 보다 위라 귀가 빠져나온다 */
export const DOME_BOT = 0.50;

/** 가방 방향 — 왼쪽 **앞**옆구리. 정옆이면 끈 끝이 몸 뒤로 돌아가 가려진다 */
export const BAG_DIR = (() => {
  const x = -0.80, y = -0.22, z = 0.48, n = Math.hypot(x, y, z);
  return Object.freeze({ x: x / n, y: y / n, z: z / n });
})();

/** 몸(타원체) 표면 **밖**의 점. 방향만 주면 길이를 풀어 준다. bs = bodyScale [a,b,c] */
export function onSurf(bs, R, bodyY, x, y, z, out = SURF) {
  const t = 1 / Math.hypot(x / bs[0], y / bs[1], z / bs[2]);
  return { x: x * t * out * R, y: bodyY + y * t * out * R, z: z * t * out * R };
}

/** 머리 구에서 높이 h(× HR)의 둘레 반지름 — 안 쓰면 띠가 뜨거나 묻힌다 */
export function ringR(HR, h) {
  return Math.sqrt(Math.max(0.04, 1 - h * h)) * HR;
}

/** 캡의 thetaLength — 아래 테두리를 DOME_BOT·HR 에 맞춘다. rk 는 HR 배수(>1 이어야 머리가 안 뚫는다) */
export function domeTheta(HR, rk) {
  return Math.acos(Math.min(0.995, DOME_BOT / rk));
}

export function sideAnchor(bs, R, bodyY) {
  return onSurf(bs, R, bodyY, BAG_DIR.x, BAG_DIR.y, BAG_DIR.z);
}

/** 등 — 몸 **표면**. 아이템이 자기 두께의 절반만큼 바깥(−z)으로 밀어낸다 */
export function backAnchor(bs, R, bodyY) {
  return { x: 0, y: bodyY + R * 0.30, z: -R * bs[2] * 0.98 };
}

/** 머리 **중심**. 높이는 아이템이 저마다 정한다(모자는 위, 머리띠는 이마) */
export function headAnchor(HY) { return { x: 0, y: HY, z: 0 }; }

/** 🐶 목줄이 이미 쓰는 좌표 */
export function neckAnchor(HR, HY) { return { x: 0, y: HY - HR * 0.55, z: 0 }; }
export function neckR(HR) { return HR * 0.92; }
