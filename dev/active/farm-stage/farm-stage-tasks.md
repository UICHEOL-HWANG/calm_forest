# Tasks — farm-stage

- [x] 1. `js/farm-stage.js` + `tests/farm-stage.test.mjs` (TDD, 5건)
- [x] 2. `FARM_HALF` → `farmHalf()` · `rebuildFarm(silent)` · `gameState.farm.stage` · applySave · makeSignpost solid 보관
- [x] 3. 측량 말뚝 근접/디스패치/`farmStakeInteract` · GA4·원장 · i18n-en · DEV_PARAMS(farmstage, farmmax)
- [x] 4. 브라우저 검증 — 1→2→3(울타리 12/18/22 · 말뚝 31/47/57 · 재료 차감 · 토스트) · 부족 토스트 · 최대 · Supabase 세이브 farm.stage=3 · 영어 · 옛 문 자리 통과
- [x] 5. 드로우콜 — 125칸 심은 상태 79콜(빈 밭 76) ≤150 ✅ (팝 애니메이션 중엔 2,000+ 일시 상승 — 기존 현상, 정상 상태 아님)
- [x] 6. docs/GA4_GUIDE.md 에 farm_expand·enter_farm{stage} 기록
- [ ] 7. code-reviewer 리뷰 반영 → 최종 커밋 → 배포는 사용자 판단

## 검증 중 발견·수정
- `rebuildFarm` 정리에서 팻말(다중 재질 배열)의 `material.map` 이 `Array.prototype.map` → `.dispose` 예외 → 옛 울타리 잔존 + 토스트/GA4 누락. 옵셔널 체이닝 + 배열 재질 순회로 수정.
- 브라우저 검수 함정: keydown 을 document·window 양쪽에 보내면 window 리스너가 두 번 받아 액션이 2회(증축 + 괭이질). **window 에만** dispatch.
- 게스트는 새로고침마다 새 계정 — 세이브 복원 검증은 Supabase `game_saves.state->'farm'` 로 확인.

# 3단계 — 고급 작물+공정 (2026-09-13)
- [x] `js/farm-crops.js` + `tests/farm-crops.test.mjs` (9건)
- [x] CROP_TYPES 에 ADV_CROPS 합류(BASIC_CROPS 로 랜덤 심기 분리) · DEX crop +3 · SELL_PRICE/아이콘/RES_LABEL/ITEM_META/BAG_CATS · SHOP_BUY 씨앗 3종
- [x] 🌰씨앗 도구 재선택 = 종류 순환(cycleSeedSel · 슬롯 아이콘 갱신, 낫 SVG 는 innerHTML)
- [x] plantSeed/tryWater/refreshCropStage/tryHarvest/applyFert 고급 분기 · 잡초(weedTarget/pullWeed) · 해충(resolveFarmPests/pestTarget/clearPest, tryNet 첫 분기)
- [x] 배지 2종(weed=3 · pest=4) 인스턴스 메시 · 세이브 fert/weed/pest · farm.seedSel/pestDate
- [x] 브라우저: 심기→비료→물→잡초 자연 발생→뽑기→해충 세팅→포충망→물→익음→낫 수확 +2 · 도감 등록(2/61)
- [ ] 🍇 포도 심기는 4단계 지지대(trellisAdjacent · farmBuildingCellsOf) 이후 검증
