import { restaurantLocal, toRestaurantLocal } from './data.js';

const at = k => c => c.at[k];
const reached = n => c => c.stage >= n;

export function restaurantGuideSteps() {
  return [
    { id: 'walk', text: '반딧불이 계곡 아래 식당으로 가 보세요', target: at('door'), done: reached(1) },
    { id: 'start', text: '칠판을 눌러 영업을 시작해요', target: at('board'), done: reached(2) },
    { id: 'fish', text: '🐟 상자에서 생선을 꺼내요', target: at('crate'), done: reached(3) },
    { id: 'pan', text: '팬에 올려요', target: at('pan'), done: reached(4) },
    { id: 'flip', text: '막대가 초록 칸일 때 눌러 뒤집어요', target: at('pan'), done: reached(5) },
    { id: 'take', text: '다 익으면 꺼내요', target: at('pan'), done: reached(6) },
    { id: 'plate', text: '접시에 담아요', target: at('plates'), done: reached(7) },
    { id: 'serve', text: '손님에게 가져다줘요', target: at('table'), done: reached(8) },
  ];
}

export const TRASH_STEP = { id: 'trash', text: '🗑️ 쓰레기통에 버리고 다시 해요', target: at('trash'), done: () => false };

export function guideStage(c) {
  if (!c.inside) return 0;
  if (c.served > 0) return 8;
  if (!c.running) return 1;
  const h = c.held;
  if (h) {
    if (h.kind === 'grilled') return h.plated ? 7 : 6;
    return h.kind === 'fish' && !h.plated ? 3 : -1;
  }
  if (c.pan) return c.pan.flipped !== null || c.pan.done ? 5 : 4;
  return 2;
}

export function shownStep(steps, index, stage) {
  if (stage < 0) return TRASH_STEP;
  return steps[Math.min(index, stage)] ?? null;
}

const BOX = { x0: -3.8, x1: 3.8, z0: -3.2, z1: 2.8 };

function segHitsBox(a, b, box) {
  let t0 = 0, t1 = 1;
  const dx = b.x - a.x, dz = b.z - a.z;
  for (const [p, q] of [[-dx, a.x - box.x0], [dx, box.x1 - a.x], [-dz, a.z - box.z0], [dz, box.z1 - a.z]]) {
    if (p === 0) { if (q < 0) return false; continue; }
    const r = q / p;
    if (p < 0) { if (r > t1) return false; if (r > t0) t0 = r; }
    else { if (r < t0) return false; if (r < t1) t1 = r; }
  }
  return true;
}

const LANE_HALF = 1.1, APPROACH = 2.8, CORNER_Z = 2.2;

export function villageVia(me, door) {
  const m = toRestaurantLocal(me.x, me.z), d = toRestaurantLocal(door.x, door.z);
  if (Math.abs(m.x - d.x) < LANE_HALF && m.z > d.z - 0.5) return null;
  const front = { x: d.x, z: d.z + APPROACH };
  if (!segHitsBox(m, front, BOX)) return restaurantLocal(front.x, front.z);
  return restaurantLocal(m.x < d.x ? BOX.x0 - 1 : BOX.x1 + 1, BOX.z1 + CORNER_Z);
}

const WALL_X = 0.8, WALL_END_Z = 2.1, GAP = { x: 0.8, z: 2.9 };

export function hallVia(me, tgt) {
  const a = me.x - WALL_X, b = tgt.x - WALL_X;
  if (a * b >= 0) return null;
  const z = me.z + (tgt.z - me.z) * (a / (a - b));
  return z < WALL_END_Z ? GAP : null;
}
