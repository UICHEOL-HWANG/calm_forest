// =============================================================
//  calm forest · 🪔 상판 올려놓기 규칙 (순수 모듈 — THREE/DOM 의존 없음)
//  ------------------------------------------------------------
//  ▶ 높이를 세이브에 넣지 않는다. "소품의 y = 그 자리를 덮는 같은 층 상판 중 가장 높은 것" 을 매번 계산한다.
//    저장 포맷이 그대로고(옛 세이브 호환), 받침을 치우면 소품이 저절로 바닥으로 내려온다.
//  ▶ 판정은 조준과 같은 규칙 — 소품 **중심이 상판 안**이면 올라간다(가장자리 걸침 허용).
//    소품이 상판보다 크면 거부한다(스툴 위 어항처럼 떠 보이는 조합 차단).
//  ▶ 원본: 커밋 e93a8a1(feat/capacitor, 미병합). 다층(f)·순수 분리·천장 규칙 테스트를 더해 이식.
//  ▶ 테스트: tests/house-surface.test.mjs · tests/decor-ceiling.test.mjs
// =============================================================

export const WALL_H = 3;        // 실내 벽 높이(js/spaces/indoor.js 방 모델의 벽 BoxGeometry 높이)
export const FLOOR_LIFT = 0.2;  // 가구 원점이 바닥 면에서 띄워진 높이(placeDecor 의 0.2)

/** 발자국·상판 크기(배율 전, [가로, 세로])의 반폭 — 90°·270° 면 가로·세로 교환 */
export function decorHalf(foot, rot, scale) {
  return [foot[rot % 2 ? 1 : 0] / 2 * scale, foot[rot % 2 ? 0 : 1] / 2 * scale];
}

/**
 * 이 자리가 상판 위인가.
 * @param {{x:number,z:number,f?:number,def:object,rot:number,hosts:object[],scale:number}} a
 *   hosts[i] = { id, x, z, rot, f, top: { y, pad } } (x,z 는 월드 좌표)
 * @returns {{y:number,hostIndex:number}|null}  y = 상판 윗면 높이 × scale (FLOOR_LIFT·층 높이 제외)
 */
export function surfaceAt({ x, z, f = 0, def, rot, hosts, scale }) {
  if (!def?.sm) return null;                                   // 올릴 수 있는 소품만
  const [mw, md] = def.foot ? decorHalf(def.foot, rot, scale) : [0, 0];
  let best = null;
  hosts.forEach((h, i) => {
    if (!h.top || (h.f || 0) !== f) return;                    // 상판이 있고 같은 층이어야 한다
    const [hw, hd] = decorHalf(h.top.pad, h.rot, scale);
    if (mw > hw || md > hd) return;                            // 상판보다 큰 소품은 못 올린다
    if (Math.abs(x - h.x) > hw || Math.abs(z - h.z) > hd) return;
    const y = h.top.y * scale;
    if (!best || y > best.y) best = { y, hostIndex: i };
  });
  return best;
}

/** 상판(topY) 위 소품(높이 h, 둘 다 배율 전)이 천장 아래에 드는가 — 루프탑(천장 없음)엔 쓰지 않는다 */
export function ceilingOk(topY, h, scale, wallH = WALL_H) {
  return FLOOR_LIFT + (topY + h) * scale < wallH;
}
