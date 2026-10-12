// =============================================================
//  🏠 이웃 집 실내 규칙 — 순수(three·game.js 없음, Node 테스트)
//  스펙: docs/superpowers/specs/2026-10-11-neighbor-indoor-design.md §3·§5
//  가구 정의(DECOR)는 catalog.js 가 three 를 끌어와 여기서 import 할 수 없다 → defOf 로 주입.
// =============================================================
import { hostSpot } from './rules.js';
import { FLOOR_LIFT, decorHalf, planSeats } from '../house/surface.js';

export const TAG_R = 1.6;       // 가구 이름표가 뜨는 거리
export const HOST_SIDE = 1.5;   // 집주인이 문 앞에서 비켜 서는 거리(문 프롬프트·말풍선 겹침 방지)
export const DOOR_R = 1.8;      // 마당 집 문 프롬프트 반경

export const canEnterIndoor = (view) => !!view && view.houseStage >= 3 && Array.isArray(view.room);
export const doorSpot = (view, origin) => hostSpot(view.houseStage, view.style, origin);
export const hostStand = (spot) => ({ x: spot.x + HOST_SIDE, z: spot.z });

/** room(INT 상대좌표) → 월드 배치. 높이는 내 집 placeDecor·reseatDecor 와 같은 규칙(층 높이 + FLOOR_LIFT + 상판) */
export function layoutRoom(room, { origin, defOf, scale, roofY, elevated }) {
  const items = [];
  for (const r of room) {
    const def = defOf(r.id); if (!def) continue;
    items.push({ id: r.id, f: r.f || 0, rot: r.rot || 0, x: origin.x + r.x, z: origin.z + r.z, def });
  }
  const plan = planSeats({ items, scale });
  return items.map((it, i) => {
    let box = null;
    if (it.def.foot && !plan[i].onSurface) {
      const [hw, hd] = decorHalf(it.def.foot, it.rot, scale);
      box = [it.x - hw, it.z - hd, it.x + hw, it.z + hd];
    }
    return { id: it.id, f: it.f, x: it.x, z: it.z, y: (elevated(it.f) ? roofY : 0) + FLOOR_LIFT + plan[i].y, ry: it.rot * Math.PI / 2, box };
  });
}

/** 같은 층에서 r 안의 가장 가까운 가구 */
export function nearestTag(items, f, px, pz, r = TAG_R) {
  let best = null, bd = r;
  for (const it of items) {
    if (it.f !== f) continue;
    const d = Math.hypot(it.x - px, it.z - pz);
    if (d <= bd) { bd = d; best = it; }
  }
  return best;
}
