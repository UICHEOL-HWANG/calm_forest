// js/cosmetics/tool-skin-rules.js
// =============================================================
//  calm forest · 🪓☂️ 도구 테마 세트 규칙 (순수 — THREE/DOM 없음)
//  ------------------------------------------------------------
//  ▶ 카탈로그 🪓 도구 칸(tools_*)을 입으면 손에 든 도구 9종이 그 테마 외형으로 바뀐다.
//    외형만 — 성능·스윙 모션·금빛(tier2) 규칙은 그대로. 조형은 js/cosmetics/tool-skins.js.
//  ▶ 시안·확정: sims/premium-tool-umbrella-sim.html (2026-10-02)
//  ▶ 테스트: tests/tool-skins.test.mjs
// =============================================================

export const TOOL_THEMES = Object.freeze(['shroom', 'moon', 'bloom']);

/** 테마가 입히는 도구 — 손에 드는 9종(js/tool-tiers.js TOOL_UPGRADE 와 같은 집합).
 *  🌊 릴대(reel)는 바다터 장비라 넣지 않는다. 일꾼 도구도 toolMesh 기본 인자라 그대로. */
export const SKIN_TOOLS = Object.freeze(['axe', 'hoe', 'seed', 'water', 'sickle', 'shovel', 'hammer', 'rod', 'net']);

/** 카탈로그 id → 테마. 'tools_moon' → 'moon' */
export function themeOf(itemId) {
  if (typeof itemId !== 'string' || !itemId.startsWith('tools_')) return null;
  const t = itemId.slice(6);
  return TOOL_THEMES.includes(t) ? t : null;
}

/** 지금 입은 도구 테마(없으면 null) */
export function toolSkinOf(cos) {
  return themeOf(cos?.equipped?.tools ?? null);
}

/** ☂️ 우산을 펼칠까 — 세트를 입고, 비 오는 날, 바깥일 때만. 맑은 날엔 메고 다니지 않는다(등 칸 가방·망토와 겹친다) */
export function umbrellaShown(theme, weather, outdoors) {
  return !!theme && weather === 'rain' && !!outdoors;
}
