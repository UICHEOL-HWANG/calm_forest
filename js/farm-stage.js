// =============================================================
//  calm forest · 🌾 밭 단계 증축 규칙 (순수 함수 — DOM/Three 의존 없음)
//  ------------------------------------------------------------
//  스펙: docs/superpowers/specs/2026-09-12-farm-expansion-design.md §1
//  ▶ 텃밭(half 6) → 넓은 밭(9) → 대농장(11). 확장은 바깥으로만, 축소 없음.
//  ▶ 노동자 상한(workers)은 5단계(노동자)에서 소비한다 — 여기선 표만 든다.
//  ▶ game.js 는 farmHalf() 로 반경을 읽고, rebuildFarm() 이 fencePosts/perimeterTrees 로 그린다.
//  ▶ 테스트: npm test (tests/farm-stage.test.mjs)
// =============================================================

/** 단계 표 — 스펙 §1. cost 는 다음 단계로 가는 비용(1단계는 처음부터 있어 null) */
export const FARM_STAGES = [
  { stage: 1, half: 6,  name: '텃밭',   ico: '🌱', cost: null,                                 workers: 2 },
  { stage: 2, half: 9,  name: '넓은 밭', ico: '🌾', cost: { wood: 40, stone: 20, coins: 150 }, workers: 4 },
  { stage: 3, half: 11, name: '대농장', ico: '🚜', cost: { wood: 90, stone: 60, coins: 450 }, workers: 6 },
];
export const MAX_FARM_STAGE = FARM_STAGES.length;

function stageOf(stage) { return FARM_STAGES.find(s => s.stage === stage) || FARM_STAGES[0]; }

/** 단계 → 울타리 반경. 세이브에 없거나 이상값이면 1단계(6) */
export function farmHalfOf(stage) { return stageOf(stage).half; }

/**
 * 다음 단계 비용 대조 — 집 증축 expandInfo() 와 같은 꼴.
 *   { maxed, cur, next, items: [{k, need, have}], affordable }
 *   라벨(RES_LABEL)은 호출부가 붙인다.
 */
export function farmStageInfo(stage, inventory = {}) {
  const cur = stageOf(stage);
  const next = FARM_STAGES.find(s => s.stage === cur.stage + 1) || null;
  if (!next) return { maxed: true, cur, next: null, items: [], affordable: false };
  const items = Object.entries(next.cost).map(([k, need]) => ({ k, need, have: inventory[k] || 0 }));
  return { maxed: false, cur, next, items, affordable: items.every(i => i.have >= i.need) };
}

/** 울타리 말뚝 [x,z] 목록 — 1.5 간격 둘레, 남쪽 가운데(|x|<1.2)는 출입구, 모서리 중복 제거 */
export function fencePosts(half) {
  const seen = new Set(), out = [];
  for (let i = -half; i <= half; i += 1.5) {
    for (const [x, z] of [[i, -half], [i, half], [-half, i], [half, i]]) {
      if (z === half && Math.abs(x) < 1.2) continue;
      const key = x + ',' + z;
      if (seen.has(key)) continue;
      seen.add(key); out.push([x, z]);
    }
  }
  return out;
}

/** 둘레 나무 {x, h, z} — 24자리 중 남쪽(+z) 출입구 ±0.45rad 비움. 반지름은 울타리 밖 5~17 */
export function perimeterTrees(half) {
  const out = [];
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    if (Math.abs(a - Math.PI / 2) < 0.45) continue;
    const r = half + 5 + ((i * 7) % 6) * 2.4;
    const h = 2.0 + ((i * 13) % 7) * 0.3;
    out.push({ x: Math.cos(a) * r, h, z: Math.sin(a) * r });
  }
  return out;
}
