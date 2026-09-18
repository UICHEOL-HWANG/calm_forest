# Tasks — farm-stage

- [x] 1. `js/farm-stage.js` + `tests/farm-stage.test.mjs` (TDD, 5건)
- [x] 2. `FARM_HALF` → `farmHalf()` · `rebuildFarm(silent)` · `gameState.farm.stage` · applySave · makeSignpost solid 보관
- [x] 3. 측량 말뚝 근접/디스패치/`farmStakeInteract` · GA4·원장 · i18n-en · DEV_PARAMS(farmstage, farmmax)
- [x] 4. 브라우저 검증 — 1→2→3(울타리 12/18/22 · 말뚝 31/47/57 · 재료 차감 · 토스트) · 부족 토스트 · 최대 · Supabase 세이브 farm.stage=3 · 영어 · 옛 문 자리 통과
- [x] 5. 드로우콜 — 125칸 심은 상태 79콜(빈 밭 76) ≤150 ✅ (팝 애니메이션 중엔 2,000+ 일시 상승 — 기존 현상, 정상 상태 아님)
- [x] 6. docs/analysis/GA4_GUIDE.md 에 farm_expand·enter_farm{stage} 기록
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

# 5~7단계 — 일꾼 · 나머지 시설 · 드로우콜 (2026-09-13/14)
- [x] `js/farm-worker.js` + `tests/farm-worker.test.mjs`(12건) — 직군·등급·기술 해금·월급·우선순위·오프라인 스텝
- [x] game.js 배선 — 상태/세이브 복원 · 3D(몸 병합 + 등급 모자 + 도구는 일할 때만) · 밭 안 FSM(idle→walk→work) · 밭 밖 60초 스텝 · 로그인 catch-up + 요약 모달 · 월급 KST 1회
- [x] 📋 고용 창(index.html #hire-modal) — 오늘 3명 · 상한 · 등급/기술/누적/승급까지 · 내보내기 2단 확인
- [x] 6단계 나머지 시설 효과 연결 — 💧우물(촉촉 ×1.4) · 🐝벌통(성장 ×1.1 + 하루 꿀) · 🌱퇴비통(잡초→비료) · 🏚️쉼터(작업 ÷1.15) · 🧺창고(용량=수확 상한) · 📋게시판(고용 해금)
- [x] 조형 — 사용자 레퍼런스(빨간 헛간)로 7종 + 측량소 재작업, 측량소는 폭 4.2 → 2.6 축소
- [x] 배치 UX — 실내 가구처럼 바닥 탭/클릭 조준(사거리 7) · 발자국 크기 링 · 놓을 수 없으면 빨강 + 이유
- [x] 마당에도 시설 배치 허용(밭 칸 아끼기) · canPlaceBuilding yard 인자 + 테스트
- [x] 증축 체감 — 밀착 줌 → 조망샷 + 네 모서리 색종이 + "칸 25→81 · 일꾼 2→4" 모달
- [x] 7단계 드로우콜 — ?farmmax=1(121칸 심음) + 일꾼 6 + 시설 4, 입구 시점 **155콜**(목표 150, 3% 초과) · 실제 플레이 시점 71~79콜
- [ ] 이름 풀·새 문구 한국어 검수([[ui-copy-review-first]]) → 배포 판단

## 검증 중 발견·수정(코드 리뷰 반영 포함)
- **CRITICAL**: 시설 메시 분기가 `toolMesh` 안에 있어 시설이 **투명하게** 놓였다(비용·콜라이더만 생김) → `outdoorMesh` 로 이동.
- **HIGH**: 밭↔마당 이동 제한이 "x 가 울타리 밖이면 마당" 이라 울타리를 따라 밀면 z 가 3~5유닛 순간이동 → `clampFarmPos`(문을 지나야 전환) 순수 함수 + 테스트.
- 밭 칸 좌표: half 가 홀수(9·11)면 `-H+2` 부터 세다가 **홀수 격자**가 나와 플레이어 밭(짝수)과 어긋났다 → `farmCellMax` 로 통일(`__farmMax` 포함).
- i18n: 창고 인출 토스트가 품목 조합이라 번역 불가 → 개수 한 줄로. (`t()` 는 " · " 를 못 쪼갠다)
- 드로우콜 측정 함정 ②: **마을 시점은 667콜**이다 — 밭에 들어갔는지(`__dbg.pz>70`·`shadowAuto:false`) 확인하고 재야 한다.
- 검수 함정 ③: 브라우저 pane 이 숨겨지면 rAF 가 초당 1프레임 → 8초 작업이 실시간 2분 넘게 걸린다. 일꾼 로직은 `window.__workSteps(n)`(오프라인 스텝 강제)으로 확인할 것.
