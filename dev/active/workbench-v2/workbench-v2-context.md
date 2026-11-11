# 작업대 개편 v2 — 맥락
Last Updated: 2026-11-11

## 현재 구조 (조사 결과)
- 위치 BENCH (4,-5) js/data/places.js:19, 외관 js/spaces/kitchen-stage.js:21 spawnWorkbench (C 장인 수레)
- 프롬프트 doors.js:387·405 '🔧 만들기 (작업대)', game.js:7533 → ui.openCook(tab) index.html:5029, #cook-menu index.html:2921~, 탭 tool/out/gift/carve (showCookTab 6345)
- 도구 탭 renderTools(6224): UPGRADES catalog.js:211-226 → craftUpgrade cooking.js:133, 금빛 2단계 BLUEPRINTS js/tool-blueprints.js → craftTier2 cooking.js:164
- 선물 탭 renderGifts(6304): GIFTS js/data/npcs.js:8-14 → craftGift outdoor-decor.js:125, giveGift :155 (gameState.gifts, love)
- 조각 탭 renderCarve(6325): js/spaces/carving.js CARVE_DESIGNS 7종, CARVE_TIERS ×1.5/1.25/1.0/0.7, 하루 3주문, carveStart :162 / carveFinish :257, gameState.workshop
- 상점 SHOP_BUY catalog.js:199-208 가 1단계 도구 8종을 코인으로도 팖(같은 upgrades 플래그) — 이번 범위 밖
- 이벤트: craft_item, tool_tier2_craft, carve_start, carve_result/abandon, gift_give

## 참고 레퍼런스
- 결·드래그 깎기, 너그러운 판정: Carving with Care, Wood Cutting, Woodturning Art
- 단계 강화: Stardew Valley 대장장이(순서대로·재료+골드·이틀) → 우리는 밤사이·사용 가능
- 망치 리듬: CraftCraft, While the Iron's Hot (타이밍이 품질로)
- 포장·진열: 동물의 숲(포장 +1, 받은 선물 집에 진열)
