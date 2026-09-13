// =============================================================
//  calm forest · 🌾 고급 작물 공정 규칙 (순수 함수 — DOM/Three 의존 없음)
//  ------------------------------------------------------------
//  스펙: docs/superpowers/specs/2026-09-12-farm-expansion-design.md §2
//  ▶ 기존 4작물(당근·토마토·블루베리·호박)은 한 글자도 안 바꾼다 — 여기 함수들은 adv 플래그가
//    없는 작물에 대해 기존 수치(0.4/0.7 · 0.4/0.8 단계 · WILT_TIME)를 그대로 돌려준다.
//  ▶ 고급 3종: 🌾밀 · 🌽옥수수 · 🍇포도 — 씨앗은 코인으로 사고(코인 싱크), 수확물은 종류별 인벤 키.
//  ▶ 공정 3가지: 🌱비료(없으면 성장 절반) · 🌿김매기(잡초면 성장 정지) · 🐛해충(수확 절반).
//    실패는 전부 부드럽게 — 죽지 않고 느려지거나 덜 나온다.
//  ▶ 테스트: npm test (tests/farm-crops.test.mjs)
// =============================================================

/** 익는 성장도 — 기존 refreshCropStage 의 0.8 그대로 */
export const MATURE = 0.8;

/**
 * 고급 작물 표 — 스펙 §2-2. price 는 기본 작물(5🪙)의 3·4·6배.
 *   stages: 그림 단계 수 · waters: 비료 준 상태에서 익는 데 필요한 물 횟수
 *   weed: 물 줄 때마다 잡초가 돋을 확률 · pestMult: 해충 확률 배율
 *   fruit/leaf: 인스턴스 색(새 메시 없이 색만 다르게 — 드로우콜 0 증가)
 */
export const ADV_CROPS = [
  { id: 'wheat', name: '밀',     ico: '🌾', adv: true, stages: 4, waters: 2, yield: 2, weed: 0.45, pestMult: 1.0, trellis: false, price: 15, seedCoin: 6,  fruit: 0xe9c85c, leaf: 0xbfc86a },
  { id: 'corn',  name: '옥수수', ico: '🌽', adv: true, stages: 4, waters: 3, yield: 2, weed: 0.25, pestMult: 1.8, trellis: false, price: 20, seedCoin: 8,  fruit: 0xf5d340, leaf: 0x74b85c },
  { id: 'grape', name: '포도',   ico: '🍇', adv: true, stages: 5, waters: 3, yield: 2, weed: 0.25, pestMult: 1.2, trellis: true,  price: 30, seedCoin: 12, fruit: 0x7d4fb5, leaf: 0x5da155 },
];

/** 🌰씨앗 도구를 다시 누르면 도는 순서 */
export const SEED_ORDER = ['basic', 'wheat', 'corn', 'grape'];
export function seedKeyOf(sel) { return sel === 'basic' ? 'seed' : 'seed_' + sel; }

export function isAdv(crop) { return !!(crop && crop.adv); }

/**
 * 물 1회 성장량.
 *   기존: 0.4 / 큰 물조리개 0.7 (그대로)
 *   고급: MATURE/waters 로 "물 waters번이면 익는다" · 비료 없으면 ×0.5 · 큰 물조리개 ×1.75(기존 비율)
 */
export function growthPerWater(crop, upgraded, fert) {
  if (!isAdv(crop)) return upgraded ? 0.7 : 0.4;
  let g = (MATURE + 1e-6) / crop.waters;
  if (upgraded) g *= 1.75;
  if (!fert) g *= 0.5;
  return g;
}

/** 성장도 → 단계 인덱스. 기존 0/1/2(0.4·0.8) · 고급은 stages 개로 잘게, 마지막 단계는 MATURE 에서만 */
export function stageIndex(crop, growth) {
  if (!isAdv(crop)) return growth >= 0.8 ? 2 : growth >= 0.4 ? 1 : 0;
  const n = crop.stages;
  if (growth >= MATURE) return n - 1;
  return Math.min(n - 2, Math.floor(growth / MATURE * (n - 1) + 1e-9));   // +1e-9: 0.6/0.8*4 = 2.9999… 부동소수 방어
}

/** 단계 인덱스 → 그림 단계(0 새싹 · 1 자람 · 2 열매). 인스턴스 메시가 3벌뿐이라 고급은 여기로 접는다 */
export function renderStage(crop, idx) {
  if (!isAdv(crop)) return idx;
  return idx <= 0 ? 0 : idx >= crop.stages - 1 ? 2 : 1;
}

/** 목마른 채 방치 → 시드는 시간. 고급은 60%(스펙 §2-3 "흙이 빨리 마른다") */
export function wiltTimeFor(crop, base) { return isAdv(crop) ? base * 0.6 : base; }

/** 물을 준 직후 잡초가 돋는지 — rnd 는 [0,1) 난수(호출부가 넣어 테스트 가능) */
export function weedRoll(crop, rnd) { return isAdv(crop) && rnd < crop.weed; }

/** 하루 정산 때 해충이 붙을 확률. 비 온 다음 날 0.5 · 평소 0.15 · 작물 배율 · 상한 0.95 */
export function pestChance(crop, rainYesterday) {
  if (!isAdv(crop)) return 0;
  return Math.min(0.95, (rainYesterday ? 0.5 : 0.15) * crop.pestMult);
}

/** 수확량. 기존은 1(+씨앗 2 는 호출부) · 고급은 yield, 해충이면 절반(최소 1) */
export function harvestYield(crop, pest) {
  if (!isAdv(crop)) return 1;
  return Math.max(1, Math.floor(crop.yield * (pest ? 0.5 : 1)));
}

/**
 * 🌰씨앗 도구를 다시 눌렀을 때 다음 선택. 보유한 씨앗만 돌고, 포도는 지지대(trellisOk)가 있어야.
 *   basic 은 항상 후보(씨앗 안전망이 채워 준다). 아무것도 없으면 basic.
 */
export function nextSeedSel(cur, inv = {}, trellisOk = false) {
  const ok = sel => sel === 'basic' || ((inv[seedKeyOf(sel)] || 0) > 0 && (!ADV_CROPS.find(c => c.id === sel)?.trellis || trellisOk));
  let i = SEED_ORDER.indexOf(cur); if (i < 0) i = 0;
  for (let k = 1; k <= SEED_ORDER.length; k++) {
    const sel = SEED_ORDER[(i + k) % SEED_ORDER.length];
    if (ok(sel)) return sel;
  }
  return 'basic';
}
