// =============================================================
//  calm forest · 🪓 도구 등급 + 업그레이드 효과 (순수 모듈 — THREE/DOM 의존 없음)
//  ------------------------------------------------------------
//  ▶ 어떤 등급인가(tierOf) + 그 등급의 색(TIER_PALETTE) 만 정한다.
//    조형은 game.js 의 toolMesh() 가, 검수는 sims/tool-tier-sim.html 이 이 팔레트를 함께 쓴다.
//  ▶ 테스트: npm test   (dev/active/tool-tiers/)
//
//  ⚠️ 이 모듈이 생긴 이유: 업그레이드(강철 도끼·큰 물조리개·튼튼한 낚싯대·촘촘한 포충망)는
//     이미 게임에 있었는데 toolMesh 가 upgrades 를 읽지 않아 모습이 그대로였다.
//     120코인을 쓰고도 손에 든 도끼가 나무 자루 그대로였다는 뜻이다.
// =============================================================

/** 도구 id → gameState.upgrades 키. 여기 없는 도구는 아직 업그레이드가 없다(항상 0단계). */
//   🍲 pot(큰 냄비)은 요리 버프라 손에 드는 도구가 아니다 — 일부러 넣지 않는다.
export const TOOL_UPGRADE = {
  axe: 'axe', water: 'water', rod: 'rod', net: 'net',
  hoe: 'hoe', seed: 'seed', sickle: 'sickle', shovel: 'shovel', hammer: 'hammer',
};

/** ⚠️ UnrealBloomPass 임계(js/game.js 의 bloomPass) — 휘도가 이 값을 넘는 색은 후광이 번진다.
 *  넓은 면을 그 색으로 칠하면 형태가 통째로 삼켜진다(🛶나룻배 등불·말풍선 글자 사고).
 *  날 끝처럼 좁은 하이라이트는 살짝 넘어도 반짝임으로 읽혀 문제가 없었다. */
export const BLOOM_LUMA = 0.85;

/** Rec.709 휘도 — 블룸이 색을 고르는 기준과 같은 식. */
export function luma(hex) {
  return (0.2126 * ((hex >> 16) & 255) + 0.7152 * ((hex >> 8) & 255) + 0.0722 * (hex & 255)) / 255;
}

// 등급 팔레트 — wood 자루 · grip 그립 · metal 금속 몸체 · edge 날/밝은 면 · accent 포인트(밴드·장식)
//   can 물조리개 통 · pole 낚싯대 장대 (도구별 고유색)
//   2단계의 "금" 은 광택이 아니라 색이다 — metalness 0 · flatShading 을 그대로 두고 색만 바꾼다.
export const TIER_PALETTE = [
  { id: 0, name: '기본',      wood: 0x8a5a3a, grip: 0x5f3d26, metal: 0x6d757c, edge: 0xd9dfe4, accent: 0x5f3d26, can: 0x8fd0ea, pole: 0x7a4a2a },
  { id: 1, name: '업그레이드', wood: 0x6b4224, grip: 0x4a3018, metal: 0x8a939c, edge: 0xd9dfe4, accent: 0x9aa3ab, can: 0x6fb8d6, pole: 0x5e3a20 },
  { id: 2, name: '히든',      wood: 0x4a2f1c, grip: 0x3a2414, metal: 0xc9a227, edge: 0xd9bc5c, accent: 0xc9a227, can: 0x4fb8c8, pole: 0x4a2f1c },
];

/** 2단계 포인트 보석(청록) — 몸체에 묻히지 않게 앞면으로 띄워 박는다. */
export const GEM_COLOR = 0x4fb8c8;

/**
 * 지금 이 도구의 등급. 모르는 도구·빈 상태여도 0 을 돌려준다(손에 든 도구가 사라지면 안 된다).
 * @param {string} toolId TOOLS 의 도구 id
 * @param {{upgrades?:Object}} state 세이브 상태(gameState)
 * @returns {0|1|2}
 */
export function tierOf(toolId, state = {}) {
  const key = TOOL_UPGRADE[toolId];
  if (key && state.upgrades && state.upgrades[key]) return 1;
  return 0;   // 2단계(히든)는 친밀도 도면 제작이 붙을 때 여기서 갈린다
}

/** 등급 팔레트 한 벌. 범위를 벗어나면 0단계로 떨어진다. */
export function paletteOf(tier) {
  return TIER_PALETTE[tier] || TIER_PALETTE[0];
}

// ── 🔧 업그레이드 효과 ────────────────────────────────────────
//   효과는 전부 **반복 노동 완화** 다. 보상량을 늘리면(수확 +1 같은) 코인 인플레가 생기는데,
//   지금 문제는 "코인 쓸 데가 없다"(코인이 남는 것)라 정반대 방향이다.
//   수치를 game.js 에 흩어 두면 밸런스를 한눈에 볼 수 없어 여기 모은다.

/** 🌰 넉넉한 씨앗 주머니 — 기본 씨앗을 아낄 확률 */
export const SEED_SAVE = 0.30;
/** 🔨 묵직한 망치 — 건축 단계당 목재 */
export const HAMMER_BUILD_COST = 7;

/** ⛏️ 무쇠 괭이 — 광맥 hp 를 한 번에 얼마나 깎는가(🪓강철 도끼와 같은 패턴). */
export function mineHitPower(state = {}) { return state.upgrades?.hoe ? 2 : 1; }

/** 🔨 묵직한 망치 — 건축·증축에 드는 목재. 없으면 기본값 그대로. */
export function buildCostOf(state = {}, base) { return state.upgrades?.hammer ? HAMMER_BUILD_COST : base; }

/**
 * 🌰 이번에 심을 때 씨앗이 안 줄어드는가.
 * ⚠️ 고급 씨앗(🌾밀·🌽옥수수·🍇포도)은 상점에서 코인으로 사는 물건이다 —
 *    절약이 붙으면 이 기획이 늘리려는 코인 싱크를 스스로 깎는다.
 * @param {number} roll 0 이상 1 미만 난수
 * @param {boolean} adv 고급 씨앗인가
 */
export function seedSaved(state = {}, roll, adv = false) {
  return !adv && !!state.upgrades?.seed && roll < SEED_SAVE;
}

/** 🪏 넓은 삽 — 빈 밭을 한 번에 메우는가(기본은 DIG_WINDOW 안에 두 번). */
export function digIsOneShot(state = {}) { return !!state.upgrades?.shovel; }

/** 🌾 잘 드는 낫 — 수확할 때 함께 거둘 옆 칸 수. */
export function sickleReach(state = {}) { return state.upgrades?.sickle ? 1 : 0; }
