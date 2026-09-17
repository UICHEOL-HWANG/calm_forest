// =============================================================
//  calm forest · 🏠 집 실내 층 규칙 (순수 모듈 — THREE/DOM 의존 없음)
//  ------------------------------------------------------------
//  ▶ 층은 **증축 단계**로 열린다. 증축이 이미 코인·자재를 받았으므로 별도 해금 조건을 두지 않는다.
//  ▶ 층 인덱스 f 는 0=1층 · 1=위층 · 2=루프탑. **f=1 의 생김새를 단계가 정한다** —
//    4단계엔 다락(half 4.5), 5단계부터 2층(half 6)으로 넓어진다.
//    위층은 넓어지기만 하므로 다락에 놓았던 가구 좌표는 2층에서도 그대로 유효하다.
//  ▶ 해금 상태를 세이브에 따로 저장하지 않는다 — houseStage 에서 계산한다(museum.js 와 같은 규칙).
//  ▶ 테스트: npm test (tests/house-floors.test.mjs)
// =============================================================

const GROUND = { f: 0, id: 'ground', name: '1층', half: 7, outdoor: false };
const ATTIC  = { f: 1, id: 'attic',  name: '다락', half: 4.5, outdoor: false };
const UPPER  = { f: 1, id: 'upper',  name: '2층',  half: 6,   outdoor: false };
const ROOF   = { f: 2, id: 'roof',   name: '루프탑', half: 5, outdoor: true };

/** 그 단계에서 열려 있는 층들 — 아래에서 위 순서. */
export function floorsFor(stage) {
  const out = [GROUND];
  if (stage >= 5) out.push(UPPER);
  else if (stage >= 4) out.push(ATTIC);
  if (stage >= 6) out.push(ROOF);
  return out;
}

/** 단계·인덱스로 층 하나. 아직 안 열렸으면 null. */
export function floorAt(stage, f) {
  return floorsFor(stage).find(fl => fl.f === f) || null;
}

/** 저장된 f 를 현재 단계에서 쓸 수 있는 값으로. 없거나 안 열린 층이면 1층으로 떨군다. */
export function normalizeFloor(f, stage) {
  const normalized = Number.isFinite(f) ? f : 0;
  return floorAt(stage, normalized) ? normalized : 0;
}

/** 가구가 상점에 풀렸는가 — stage 가 없는 정의(기존 22종)는 항상 열려 있다. */
export function decorUnlocked(def, stage) {
  return !def?.stage || stage >= def.stage;
}

/** 이 층에 놓을 수 있는가 — 실외 전용 가구는 루프탑에만. 실내 가구는 어디든. */
export function canPlaceOn(def, floor) {
  if (!floor) return false;
  return def?.outdoorOnly ? !!floor.outdoor : true;
}
