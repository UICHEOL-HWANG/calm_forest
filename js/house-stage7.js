// =============================================================
//  calm forest · 🏡 집 7단계 "정원 저택" — 스타일 규칙·충돌 박스·제외 반경 (순수 모듈, THREE/DOM 의존 없음)
//  ------------------------------------------------------------
//  ▶ 7단계는 **같은 ㄷ자 중정 배치에 스타일만 둘**이다 — 모던(🌸 테라스 코트) / 한옥(🏮 한옥 마당).
//    증축을 누를 때 하나를 고르고, 고른 뒤엔 바꾸지 않는다. 저장은 gameState.house.style.
//    (gameState.houseStyle 은 색 팔레트 — 이름이 비슷하니 섞지 말 것)
//  ▶ 충돌: 원 하나(r≈3.9)면 중정까지 막힌다 → 건물 3동(안채·좌·우 행랑)만 박스로 막고 중정은 연다.
//  ▶ 좌표는 집 로컬(정면 +z, 원점 바닥) — 모델(js/house/stage7-*.js)이 같은 값을 쓴다. 월드 = 집 원점 + 로컬.
//  ▶ 테스트: tests/house-stage7.test.mjs
// =============================================================
export const HOUSE_STYLES = ['modern', 'hanok'];
export const DEFAULT_HOUSE_STYLE = 'modern';

/** 7단계 풋프린트(시안 stage7-e/f) — 가로 7.4 × 세로 6.8 */
export const STAGE7 = { w: 7.4, d: 6.8 };

/** 증축 카드에 쓰는 스타일 정보(이름·아이콘·한 줄 설명). house-cost.js EXPANSIONS[7].styles 가 이걸 참조한다. */
export const STYLE_INFO = {
  modern: { ico: '🌸', name: '테라스 코트', desc: '흰 유리 집 + 계단식 옥상 정원' },
  hanok: { ico: '🏮', name: '한옥 마당', desc: '기와지붕 · 마루 · 소나무 정원' },
};

// 건물 3동 박스(로컬 x0~x1 × z0~z1). 안채(뒤) + 좌·우 행랑. 중정은 x ±1.55 · z -1.5~3.3 로 열려 있다.
const BOXES = {
  modern: [
    { x0: -3.55, x1: 3.55, z0: -3.5, z1: -1.5 },
    { x0: -3.65, x1: -1.55, z0: -1.55, z1: 3.15 },
    { x0: 1.55, x1: 3.65, z0: -1.55, z1: 3.15 },
  ],
  hanok: [
    { x0: -3.05, x1: 3.05, z0: -3.85, z1: -1.15 },
    { x0: -3.95, x1: -1.55, z0: -0.95, z1: 2.75 },
    { x0: 1.55, x1: 3.95, z0: -0.95, z1: 2.75 },
  ],
};

// 현관문(안채 정면) 로컬 좌표 — 문 프롬프트 기준점. 앞 마루에 서면 닿는다.
const DOOR = { modern: { x: -0.6, z: -1.5 }, hanok: { x: 0, z: -1.5 } };

const isStyle = (s) => HOUSE_STYLES.includes(s);

/** 저장값을 단계에 맞게 정리 — 6단계 이하는 스타일이 없다(null), 7단계인데 없거나 이상하면 모던. */
export function normalizeHouseStyle(style, stage) {
  if ((stage || 0) < 7) return null;
  return isStyle(style) ? style : DEFAULT_HOUSE_STYLE;
}

/** 월드 좌표 충돌 박스 3개(origin = HOUSE_POS). */
export function stage7Boxes(style, origin) {
  const list = BOXES[isStyle(style) ? style : DEFAULT_HOUSE_STYLE];
  return list.map((b) => ({ x0: origin.x + b.x0, x1: origin.x + b.x1, z0: origin.z + b.z0, z1: origin.z + b.z1 }));
}

/** 현관문의 월드 좌표. */
export function stage7DoorPoint(style, origin) {
  const d = DOOR[isStyle(style) ? style : DEFAULT_HOUSE_STYLE];
  return { x: origin.x + d.x, z: origin.z + d.z };
}

/** 나무·꽃·밭이 집 주변에 생기지 않게 비우는 반경 — 박스 모서리와 앞 담장(≈5.2)까지 덮는다(모든 단계 공통: 마을 장식 배치 시점엔 단계를 모른다). */
export const HOUSE_CLEAR_R = 5.8;
export function stage7ExcludeR() { return HOUSE_CLEAR_R; }

/** 집에서 나왔을 때 서는 자리 — 현관 앞(마루 위). 문 프롬프트 범위 안이라 바로 다시 들어갈 수 있다. */
export function stage7ExitPoint(style, origin) {
  const d = stage7DoorPoint(style, origin);
  return { x: d.x, z: d.z + 1.3 };
}

/** 외관 꾸미기 카메라 배율 — 7단계(7.4×6.8 + 앞마당)는 6단계(5.4)보다 훨씬 넓고 깊어서 더 물러선다(폰 세로에서 패널 위 1/3 안에 정원까지). */
export function extViewScale(stage) { return stage >= 7 ? 1.65 : 1; }
/** 외관 카메라 시선을 낮추는 계수(클수록 집이 화면 위로 올라간다) — 앞마당·정원까지 패널 위에 보이게 7단계는 크게. */
export function extViewLookK(stage) { return stage >= 7 ? 5 : 2; }

export function pointInBoxes(boxes, x, z) {
  return boxes.some((b) => x >= b.x0 && x <= b.x1 && z >= b.z0 && z <= b.z1);
}
