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

# 4단계 — 밭 시설 7종 + 📐측량소 이전 (2026-09-13)
- [x] `js/farm-building.js` + 테스트 — 7종 표·발자국 스냅/칸·배치 판정·반경·창고 용량·퇴비 상한
- [x] OUTDOOR 에 시설 합류(farm:true·fp) · placeOutdoor/pickOutdoor 발자국 분기 · 칸별 밭 금지 원 + 사각 콜라이더
- [x] 🧺창고 꺼내기(nearDoor 'warehouse') · 🌱퇴비통(잡초→비료) · 🐝벌통(하루 꿀 · 성장 +10%) · 💧우물(촉촉 +40%) · 🍇지지대 인접
- [x] 📐 측량 말뚝 → **측량소**(서쪽 문 밖 마당) — 밭 안 공간을 한 칸도 쓰지 않게 울타리 바깥으로. 돌 기초·판자 벽·기와 지붕·굴뚝·간판·밤에 켜지는 창·제도 탁자(상호작용)·삼각대 측량기·말뚝 다발·디딤돌
- [x] 🔧 자재 작업대(마당) — 마을 작업대는 텃밭에서 너무 멀다. 액션 = 제작 메뉴 🌷야외 탭(밭 시설은 텃밭에서만 목록에 뜬다)
- [x] 서쪽 울타리 문(|z|<1.2 말뚝 공백 + 콜라이더 ±1.6) · 이동 제한 = 밭 사각 ∪ 마당 사각
- [x] 브라우저 검증 — 문 통과/차단 · 측량소 프롬프트·증축(1→2, 재료 차감·토스트) · 재빌드 콜라이더 5개만(고아 없음) · 작업대 메뉴 7종 · 창고 배치(🪵30 🪨10 차감)·꺼내기(밀3·꿀2 → 가방) · 겹침/울타리 밖/밭 위 거절 · 영어 프롬프트
- [x] 드로우콜 — 빈 밭 88콜(측량소 +12), 시설 5동 놓고 104콜 ≤150
- [ ] code-reviewer 반영 → 배포 판단

## 검증 중 발견·수정
- 밭 시설이 **마을 작업대 목록에서만** 뜨는데 `atFarm` 필터로 숨겨져 있어 **어디서도 만들 수 없었다** → 마당에 🔧자재 작업대 신설(`ui.openCook('out')`).
- 브라우저 검수: 패널(브라우저 pane)이 숨겨지면 rAF 가 초당 1프레임으로 떨어져 걷기가 0.3유닛/프레임이 된다. 좌표 목표까지 짧게 반복 입력하는 `window.__goto(x,z)` 헬퍼로 이동할 것.
- 팻말 콜라이더는 rAF 에서 등록된다 — 재빌드 직후 `__solids()` 로 세면 아직 없다(프레임 한 번 돌린 뒤 확인).
