// =============================================================
//  🏛️ 박물관 층 배치 — 순수 계산(THREE·DOM 의존 없음, Node 테스트)
//  ------------------------------------------------------------
//  ▶ 벽 배치(1·2층): 16×14 방, 뒷벽 최대 5 + 좌우 6/6 = 17칸. 가운데 섬이 없다.
//  ▶ 회랑 배치(3층·특별전): 20×14 방, 벽 유리장 + 가운데 **뚜껑 없는 낮은 탁자**.
//    높이 1.9m 유리장이 41° 카메라에서 뒷줄을 가리던 빽빽함(2026-10-06 사용자 지적)을 이걸로 푼다.
//  ▶ 좌표는 방 로컬(중심 0,0) · 입구는 남쪽(+z) · 계단은 북쪽 두 구석.
//  ▶ ⚠️ 한도를 넘으면 던진다 — 층에 도감이 늘어 넘치면 조용히 잘리지 않고 테스트가 먼저 터져야 한다.
// =============================================================
export const WALL_DIMS = { hw: 8, hd: 7 };
export const GALLERY_DIMS = { hw: 10, hd: 7 };
export const WALL_MAX = 17;
export const GALLERY_MAX = 35;
const GALLERY_WALL_MAX = 15, TABLE_GAP = 1.35, TABLE_ROW_MAX = 10;

export const dimsOf = (kind) => ({ ...(kind === 'gallery' ? GALLERY_DIMS : WALL_DIMS) });

/** 칸이 바라보는 방향(통로 쪽) 단위벡터 [dx, dz]. -0 이 나오지 않게 + 0. */
export const inwardOf = (ry) => [Math.round(Math.sin(ry)) + 0, Math.round(Math.cos(ry)) + 0];

/** 🪜 계단 발판 충돌 박스 — 뒷벽 구석. 벽 폭이 달라도 구석에 붙는다. */
export function stairBox(sx, { hw, hd }) {
  return { x0: sx > 0 ? hw - 3.2 : -(hw - 0.3), x1: sx > 0 ? hw - 0.3 : -(hw - 3.2), z0: -hd + 0.2, z1: -hd + 1.8 };
}
/** 계단 안내 자리(도착 지점은 z + 1.4 — 앞 빈 바닥). */
export const stairSpot = (sx, { hw, hd }) => ({ x: sx * (hw - 2.5), z: -hd + 1.2 });

/** 유리장 받침 충돌 반 크기 — 벽 쪽으로 0.6 까지 덮어 진열장 뒤 틈을 막는다. */
export const caseHalf = (s) => (Math.abs(Math.sin(s.ry)) > 0.5 ? { hx: 0.6, hz: 0.5 } : { hx: 0.5, hz: 0.6 });

function wallLayout(count) {
  if (count > WALL_MAX) throw new Error(`벽 배치는 최대 ${WALL_MAX}칸이다(받은 ${count}) — 층을 나누거나 gallery 로`);
  const dims = dimsOf('wall'), { hw, hd } = dims;
  const back = Math.min(5, count), rest = count - back, left = Math.ceil(rest / 2), right = rest - left;
  const slots = [];
  for (let i = 0; i < back; i++) slots.push({ x: (i - (back - 1) / 2) * 1.9, z: -hd + 1.2, ry: 0, kind: 'case' });
  for (let k = 0; k < left; k++) slots.push({ x: -(hw - 1.2), z: -3.0 + k * 1.6, ry: Math.PI / 2, kind: 'case' });
  for (let k = 0; k < right; k++) slots.push({ x: hw - 1.2, z: -3.0 + k * 1.6, ry: -Math.PI / 2, kind: 'case' });
  return { dims, slots, tables: [] };
}

function galleryLayout(count) {
  if (count > GALLERY_MAX) throw new Error(`회랑 배치는 최대 ${GALLERY_MAX}칸이다(받은 ${count}) — 탁자 줄을 늘려야 한다`);
  const dims = dimsOf('gallery'), { hw, hd } = dims;
  const wallN = Math.min(GALLERY_WALL_MAX, Math.ceil(count / 2)), tableN = count - wallN;
  const slots = [], back = Math.min(5, wallN);
  for (let i = 0; i < back; i++) slots.push({ x: (i - (back - 1) / 2) * 2.3, z: -hd + 1.2, ry: 0, kind: 'case' });
  for (let j = 0; j < wallN - back; j++) {
    const isRight = j % 2 === 1, k = Math.floor(j / 2);
    slots.push({ x: isRight ? hw - 1.2 : -(hw - 1.2), z: -3.2 + k * 1.9, ry: isRight ? -Math.PI / 2 : Math.PI / 2, kind: 'case' });
  }
  const tables = [];
  if (tableN > 0) {
    const rows = tableN > TABLE_ROW_MAX - 2 ? 2 : 1;   // 8칸 이하면 한 줄
    const perRow = Math.ceil(tableN / rows), zs = rows === 2 ? [-1.9, 1.9] : [-1.9];
    for (let r = 0; r < rows; r++) {
      const n = r === 0 ? perRow : tableN - perRow, ry = r === 0 ? 0 : Math.PI;
      for (let k = 0; k < n; k++) slots.push({ x: (k - (n - 1) / 2) * TABLE_GAP, z: zs[r], ry, kind: 'open' });
      tables.push({ x: 0, z: zs[r], w: n * TABLE_GAP + 0.6, d: 1.2 });
    }
  }
  return { dims, slots, tables };
}

export function museumLayout(kind, count) {
  if (kind === 'wall') return wallLayout(count);
  if (kind === 'gallery') return galleryLayout(count);
  throw new Error(`알 수 없는 박물관 배치: ${kind}`);
}
