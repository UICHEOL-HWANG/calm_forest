// =============================================================
//  calm forest · 🏗️ 밭 시설 규칙 (순수 함수 — DOM/Three 의존 없음)
//  ------------------------------------------------------------
//  스펙: docs/superpowers/specs/2026-09-12-farm-expansion-design.md §4
//  ▶ 시설은 기존 야외 장식 문법(placeOutdoor/pickOutdoor/storeOutdoor + 고스트 + ↻회전 + 🧺보관)을
//    그대로 쓴다 — OUTDOOR 카탈로그에 farm:true 로 합류하고 레코드도 gameState.outdoor 에 같이 산다.
//    (스펙 §7 은 별도 배열을 적었지만, 배치 시스템을 두 벌 두지 않는 쪽이 이득이라 하나로 뒀다)
//  ▶ 밭 칸은 2유닛 격자. 발자국 fp=[가로칸, 세로칸] — 짝수 폭이면 중심이 칸 사이(홀수 좌표)에 온다.
//  ▶ 텃밭 안에서만 · 밭 위엔 못 놓고 · 시설끼리 안 겹친다(실내 가구 v2 의 발자국 AABB 와 같은 규칙).
//  ▶ 테스트: npm test (tests/farm-building.test.mjs)
// =============================================================

export const CELL = 2;
export const HONEY_PER_HIVE = 2;    // 🐝 벌통 하나가 하루에 주는 🍯꿀
export const COMPOST_PER_DAY = 3;   // 🌱 퇴비통이 하루에 만들어 주는 비료 상한

/** 시설 표 — 스펙 §4-1. radius 는 효과 반경(밭 칸 중심 기준), cap 은 창고 용량(채별 합산) */
export const FARM_BUILDINGS = [
  { id: 'board',     name: '일꾼 게시판', ico: '📋', farm: true, fp: [1, 1], cost: { wood: 25, coins: 80 },            desc: '일꾼을 고용해요 · 하루 3명 후보' },
  { id: 'warehouse', name: '작물 창고',   ico: '🧺', farm: true, fp: [2, 2], cost: { wood: 30, stone: 10 },            desc: '일꾼이 거둔 작물 보관(60개) · 여러 채면 합산', cap: 60 },
  { id: 'trellis',   name: '포도 지지대', ico: '🍇', farm: true, fp: [1, 3], cost: { wood: 20 },                      desc: '바로 옆 밭에 🍇포도를 심을 수 있어요' },
  { id: 'well',      name: '우물',        ico: '💧', farm: true, fp: [1, 1], cost: { wood: 20, stone: 25, coins: 100 }, desc: '반경 5 밭은 흙이 40% 오래 촉촉 · 일꾼 물주기 −40%', radius: 5 },
  { id: 'compost',   name: '퇴비통',      ico: '🌱', farm: true, fp: [1, 1], cost: { wood: 25 },                      desc: '뽑은 잡초·시든 작물 → 🌱비료(하루 3)' },
  { id: 'shelter',   name: '일꾼 쉼터',   ico: '🏚️', farm: true, fp: [2, 2], cost: { wood: 40, stone: 15, coins: 150 }, desc: '반경 6 일꾼 작업 +15% · 쉬면서 회복', radius: 6 },
  { id: 'beehive',   name: '벌통',        ico: '🐝', farm: true, fp: [1, 1], cost: { wood: 30, coins: 60 },            desc: '반경 5 성장 +10% · 하루 🍯꿀 2', radius: 5 },
];

/** 회전(0~3)을 반영한 [가로칸, 세로칸] */
export function rotatedFp(fp, rot) { return ((rot || 0) % 2) ? [fp[1], fp[0]] : [fp[0], fp[1]]; }

/** 발자국 중심 스냅 — 홀수 폭은 칸 중심(짝수 좌표), 짝수 폭은 칸 사이(홀수 좌표) */
export function snapCenter(x, z, fp, rot) {
  const [w, d] = rotatedFp(fp, rot);
  const snap = (v, n) => n % 2 ? Math.round(v / CELL) * CELL : Math.round((v - 1) / CELL) * CELL + 1;
  return [snap(x, w), snap(z, d)];
}

/** 발자국이 덮는 밭 칸 중심 목록 */
export function buildingCells(fp, x, z, rot) {
  const [w, d] = rotatedFp(fp, rot);
  const cells = [];
  for (let i = 0; i < w; i++) for (let j = 0; j < d; j++) cells.push([x + (i - (w - 1) / 2) * CELL, z + (j - (d - 1) / 2) * CELL]);
  return cells;
}

const sameCell = (a, b) => Math.abs(a[0] - b[0]) < 0.5 && Math.abs(a[1] - b[1]) < 0.5;

/**
 * 놓을 수 있나 — { ok, reason }. reason: notFarm | outside | plot | overlap
 *   buildings 는 farm 시설 레코드만 [{id,x,z,rot}] (호출부가 OUTDOOR 에서 farm:true 인 것만 골라 넘긴다)
 */
export function canPlaceBuilding({ def, x, z, rot, atFarm, center, half, plots, buildings, yard }) {
  if (!atFarm) return { ok: false, reason: 'notFarm' };
  const cells = buildingCells(def.fp, x, z, rot);
  const lim = half - 1;   // 울타리 안쪽 칸 중심은 ±(half-1)까지
  // 밭 안 ∪ 📐측량소 마당 — 창고·게시판처럼 반경 효과가 없는 건물은 마당에 두어 밭 칸을 아낄 수 있다
  //   (사용자 지적 2026-09-13: "논밭 너무 좁아진다" — 밭은 심는 데 쓰고 건물은 마당으로)
  const inField = c => Math.abs(c[0] - center.x) <= lim + 0.01 && Math.abs(c[1] - center.z) <= lim + 0.01;
  const inYard = c => !!yard && c[0] - center.x >= yard.x0 + 1 && c[0] - center.x <= yard.x1 - 1
    && c[1] - center.z >= yard.z0 + 1 && c[1] - center.z <= yard.z1 - 1;
  if (cells.some(c => !inField(c) && !inYard(c))) return { ok: false, reason: 'outside' };
  if (cells.some(c => plots.some(p => sameCell(c, [p.x, p.z])))) return { ok: false, reason: 'plot' };
  for (const b of buildings) {
    const bd = FARM_BUILDINGS.find(d => d.id === b.id); if (!bd) continue;
    const bc = buildingCells(bd.fp, b.x, b.z, b.rot);
    if (cells.some(c => bc.some(o => sameCell(c, o)))) return { ok: false, reason: 'overlap' };
  }
  return { ok: true, reason: null };
}

export function withinRadius(bx, bz, r, px, pz) { return Math.hypot(px - bx, pz - bz) <= r; }
/** 시설 효과 배율·품목 목록 — game.js 에 숫자를 박아 두면 위 표를 고쳐도 동작이 안 따라온다(코드 리뷰 2026-09-13) */
export const WELL_WET_MUL = 1.4;      // 💧 우물 반경: 흙이 촉촉한 시간
export const HIVE_GROWTH_MUL = 1.1;   // 🐝 벌통 반경: 물 한 번당 성장량
export const STORAGE_KEYS = ['crop', 'wheat', 'corn', 'grape', 'honey'];   // 🧺 창고·더미에 담기는 품목(한 곳에서만 센다)
export function buildingRadius(id) { return FARM_BUILDINGS.find(d => d.id === id)?.radius || 0; }
/** 이 좌표가 해당 시설의 효과 반경 안인가 — 반경은 표(FARM_BUILDINGS.radius)가 유일한 출처 */
export function inRadiusOf(buildings, id, x, z) {
  const r = buildingRadius(id);
  return !!r && buildings.some(b => b.id === id && withinRadius(b.x, b.z, r, x, z));
}
export function warehouseCap(buildings) { return buildings.filter(b => b.id === 'warehouse').length * (FARM_BUILDINGS.find(d => d.id === 'warehouse').cap); }
export function storageTotal(storage) { return storage ? Object.values(storage).reduce((a, v) => a + (v || 0), 0) : 0; }
/** 오늘 퇴비통이 더 만들어 줄 수 있는 비료 수 */
export function compostLeft(farm, today) { return farm?.compostDate === today ? Math.max(0, COMPOST_PER_DAY - (farm.compostN || 0)) : COMPOST_PER_DAY; }
