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

/** 울타리 말뚝 [x,z] 목록 — 1.5 간격 둘레, 남쪽 가운데(|x|<1.2)는 마을 출구, 서쪽 가운데(|z|<1.2)는 📐측량소 문. 모서리 중복 제거 */
export function fencePosts(half) {
  const seen = new Set(), out = [];
  for (let i = -half; i <= half; i += 1.5) {
    for (const [x, z] of [[i, -half], [i, half], [-half, i], [half, i]]) {
      if (z === half && Math.abs(x) < 1.2) continue;      // 남쪽 — 마을로 나가는 문
      if (x === -half && Math.abs(z) < 1.2) continue;      // 서쪽 — 측량소 마당으로 나가는 문
      const key = x + ',' + z;
      if (seen.has(key)) continue;
      seen.add(key); out.push([x, z]);
    }
  }
  return out;
}

/** 둘레 나무 {x, h, z} — 24자리 중 남쪽(+z) 출구·서쪽(-x) 측량소 방향 비움. 반지름은 울타리 밖 5~17 */
export function perimeterTrees(half) {
  const out = [];
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    if (Math.abs(a - Math.PI / 2) < 0.45) continue;       // 남쪽 출구
    if (Math.abs(a - Math.PI) < 0.5) continue;             // 서쪽 측량소 마당
    const r = half + 5 + ((i * 7) % 6) * 2.4;
    const h = 2.0 + ((i * 13) % 7) * 0.3;
    out.push({ x: Math.cos(a) * r, h, z: Math.sin(a) * r });
  }
  return out;
}

// ── 📐 측량소 — 밭 서쪽 문 밖 마당(밭 로컬 좌표) ───────────────────────────
//    밭 안은 심는 공간이 제일 귀하다. 증축 창구를 울타리 밖으로 내보내 안쪽 칸을 한 칸도 쓰지 않는다.
//    울타리가 커지면 마당도 그만큼 서쪽으로 밀려난다(모든 좌표가 half 기준).
export const YARD_D = 8;      // 마당 깊이(울타리 → 서쪽)
export const YARD_HZ = 5.5;   // 마당 남북 반폭

/** 마당 사각 {x0,x1,z0,z1} — 울타리 서쪽 면에 딱 붙는다 */
export function surveyYard(half) { return { x0: -half - YARD_D, x1: -half, z0: -YARD_HZ, z1: YARD_HZ }; }
/** 측량소 건물 중심 [x,z] — 문(z 0 부근) 앞을 비우도록 남쪽으로 물러나 있다 */
export function surveyOfficePos(half) { return { x: -half - 4.4, z: -3.2 }; }
/** 제도 탁자(상호작용 지점) — 건물 동쪽 앞. 여기 서면 다음 단계 비용 프롬프트가 뜬다 */
export function surveyDeskPos(half) { return { x: -half - 1.9, z: -2.6 }; }
/** 🔧 자재 작업대 — 밭 시설을 주문하는 곳(마을 작업대는 텃밭에서 너무 멀다). 문 앞 통로 반대편 */
export function surveyBenchPos(half) { return { x: -half - 2.6, z: 2.6 }; }
