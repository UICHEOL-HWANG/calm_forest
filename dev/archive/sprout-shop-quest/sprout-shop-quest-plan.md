# 🌱 새싹반 꾸미기 3종 + 🎀 꾸미기 가게 구경하기 의뢰

## Context
메타 광고 유입자가 튜토리얼 뒤 **꾸미기 가게 → 첫 구매 → 💎 프리미엄 줄 노출**까지 가게 만드는 연결 퀘스트.
지금은 가게 최저가가 600🪙(신규 유저 보유 수십~150🪙)이고 미니맵에도 가게가 없어 도달이 어렵다.
사용자 확정: B안(싼 기본템 코너) · 유치원 컨셉 3종 · 시안 조형 그대로(sims/kinder-cosmetics-sim.html, 2026-10-20).

## 범위
1. **아이템 3종** (코인 · group 'sprout')
   - `kinder_hat` 🟡 새싹반 모자 50🪙 head · earSafe 'dome'
   - `tulip_tag` 🌷 튤립 이름표 70🪙 neck
   - `kinder_bag` 🎒 새싹반 가방 100🪙 back · anchor 'side'
2. **가게 첫 탭 "🌱 새싹반"**: 3종 + 아래 💎 프리미엄 미리보기 1줄. 가게 열면 기본 탭.
3. **자동 의뢰 🎀 꾸미기 가게 구경하기**: 과수원 의뢰 패턴 복제. offered → visited(가게 열기) → done(첫 구매+착용).
4. **안내**: 미니맵/전체 지도에 🎀 꾸미기 가게 상시 등록 + 의뢰 중 미니맵 아이콘 맥동 · 가게 문 위 🎀 이모지 말풍선(의뢰 중에만) · 글자 안내는 힌트 배너/프롬프트 줄.
5. **트래킹** + 광고 계획서 갱신.

## 구현 (워크트리 `feat/sprout-shop-quest`, main 기준)

### A. 세이브 보호 (먼저)
- `js/cosmetics/equip.js:62` `sanitize`: 모르는 id 를 지우지 말고 `owned` 에 보존(장착만 null). 옛 클라 유실 재발 방지(가구 사고와 같은 패턴).
- 이미 깔린 옛 앱은 여전히 지우므로 **웹·토스·Android·iOS 동시 배포**.

### B. 아이템
- `js/cosmetics/art.js` HEAD/NECK/BACK 에 시안 조형 이식. 기존 헬퍼(`strapOf`·`strapLoop`·`put`·`clay`) 재사용, 색은 PALETTE 에 추가(블룸 0.85 검산).
- `js/cosmetics/catalog.js` RAW 3줄(`group:'sprout'`), `js/shop/price-ids.js` 3키 null.
- `js/i18n-en.js:2190` 영어 이름 + 탭·의뢰 문구.
- `sims/cosmetic-sim.html` SLOTS 에 3종 추가(검수 소스 단일화). kinder 시안은 art.js import 로 정리.

### C. 가게 탭
- `js/spaces/cafe.js:835` `COS_TABS` 맨 앞 `['sprout','🌱 새싹반']`, 기본 탭 sprout(3종 다 사면 기존 첫 탭).
- `:1038/1043/1070` `itemsOf(cosTab)` → 탭 소스 함수(sprout = group 필터 + 프리미엄 1줄).

### D. 의뢰
- 새 순수 모듈 `js/cos-onboard.js` (orchard-onboard.js 모양: `shouldOffer`·`afterVisit`·`afterBuy`·`onboardView`·`restoreStage`·`LINES`).
- 게이트: 튜토리얼 끝(완료·스킵 모두) && `cosmetics.owned` 비어 있음 && 미오퍼. 기존 유저도 꾸미기 0개면 받음.
- 트리거: `index.html:4137` endCoach 끝, 과수원 다음(배너 FIFO, attention 소리 한 번).
- 진행: `game.js:6649` 가게 열기 → visited · `cafe.js:1101` 코인 구매 + `onGranted`(:989) → done(소량 🪙 보상).
- 패널: `js/spaces/npc.js:786` 배열에 `cosOnboardView`. 저장 `progress.cosQuest`, 복원 `game.js:2493` 옆(꾸미기 이미 있으면 done).

### E. 안내
- `game.js:5444` VILLAGE_PLACES 에 `{ico:'🎀', name:'꾸미기 가게', x:SHOP_POS.x, z:SHOP_POS.z, pri:1}`.
- 미니맵 맥동: `index.html:~3739` 에서 의뢰 대상 장소만 사인파 크기/알파.
- 문 위 말풍선: `js/bubble-fx.js` + visitors.js `lookTexture` 패턴, `SHOP_DOOR` 위.

### F. 트래킹
- GA4 `cos_quest {step: offered|visited|done, via}` + 기존 `cosmetic_buy`(item_id) · `premium_row_view`(sprout 탭 mode). 파라미터 ≤5, 기존 키 재사용.

### G. 문서
- `dev/archive/sprout-shop-quest/` plan·context·tasks.
- 광고 계획서 `parts/02-goals-hypotheses.md` P2 를 "안내 의뢰가 있을 때 상점 진입률"로 개정, `04-funnel-measurement.md` 에 cos_quest.

## 문구 후보 (구현 전 검수 · 엠대시 금지)
- 의뢰 제목: 🎀 꾸미기 가게 구경하기 / 설명: 마을 서쪽 꾸미기 가게에 들러 보세요.
- 단계: 가게 들르기 · 첫 꾸미기 달기
- 배너: 🎀 새싹반 꾸미기가 들어왔어요 / 미니맵의 🎀 를 따라가요
- 탭 안내: 🌱 새싹반 · 처음 오신 분을 위한 기본 꾸미기예요
- 완료: 🎉 첫 꾸미기 완성!

## 검증
- TDD: `tests/cos-onboard.test.mjs`(게이트·전이·복원·기존 유저), sanitize 보존 테스트, 카탈로그 테스트 갱신(총 38·head 8·neck 4·back 6·dome 5·최저가 600 규칙에 sprout 예외), `cash.test.mjs` PRICE_IDS 42, `halloween-catalog.test.mjs` back 순서. `npm test` 전체 통과.
- cosmetic-sim 동물 7종 캡처로 시안과 동일 확인.
- 실게임 preview: 새 게스트 → 튜토리얼 스킵 → 카드·배너·미니맵 🎀 맥동 → 가게 → 새싹반 탭 → 50🪙 구매·착용·의뢰 완료. PC + 가로 폰 캡처, 콘솔 에러 0.
- 꾸미기 보유 세이브 주입 → 의뢰 안 뜸.
- code-reviewer → 키 스캔 → 커밋. 배포는 지시 시 4곳 동시.
