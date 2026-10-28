# sprout-shop-quest · context

Last Updated: 2026-10-20 23:40 KST

## 왜
메타 광고 유입자가 튜토리얼 뒤 꾸미기 가게 → 첫 구매 → 💎 프리미엄 줄 노출까지 가게 만드는 연결 퀘스트.
가게 최저가 600🪙 vs 신규 보유 수십🪙 → 50~100🪙 유치원 컨셉 기본템 3종(사용자 확정: B안 · 유치원 · 레퍼런스 모자).

## 핵심 파일
- `js/cosmetics/art-sprout.js` 조형 3종(KP 팔레트, lift 로 하위 그룹 평탄화 → mergeStatics)
- `js/cosmetics/art.js` HEAD/NECK/BACK 위임 3줄, `h` 에 strapOf·strapLoop 추가
- `js/cosmetics/catalog.js` group:'sprout' 3줄 · `js/shop/price-ids.js` 3키
- `js/cosmetics/sprout.js` SPROUT_IDS · shopRows(tab) · sproutOpen · defaultCosTab
- `js/spaces/cafe.js` COS_TABS 맨 앞 sprout, rowsOf=shopRows, 안내 줄, premium_row_view tab:'sprout', noteCosQuestBuy(코인·현금)
- `js/cos-onboard.js` 순수 규칙(shouldOffer·afterVisit·afterBuy·cosOnboardView·restoreStage·COS_LINES·COS_HOW, 보상 30🪙)
- `js/spaces/cos-quest.js` 오퍼·방문·구매 + 문 위 🎀 말풍선(updateCosQuestBubble)
- `js/game.js` import·Input.cosQuestAfterTutorial·가게 열기 noteCosQuestVisit·복원·VILLAGE_PLACES 🎀·md.target·루프 훅
- `index.html` endCoach after()·환영 모달 건너뛰기에서 호출 · 미니맵 맥동 목표 · `.sh-sprout-note`
- `js/spaces/npc.js` 의뢰 패널에 cosOnboardView · `js/spaces/farm-auto.js` 기본 수확 때 오퍼(기존 유저)
- `js/cosmetics/equip.js` sanitize: 모르는 id 보존(id 모양 · 128개 상한)
- `js/i18n-en.js` 3종 이름·탭·안내 줄

## 결정
- 새싹반 3종은 머리·목·가방 탭에서 빼고 새싹반 탭에만(중복 방지). 3종 다 사면 탭 숨김.
- 오퍼 게이트: tutorialSeen && 꾸미기 0개 && 미오퍼. 트리거 = 튜토리얼 끝(완료·스킵·환영 건너뛰기) + 기본 작물 수확(기존 유저).
- 미니맵은 main 에서 장소 아이콘을 안 그림 → 의뢰 중에만 md.target 으로 맥동 🎀 하나. 전체 지도엔 🎀 꾸미기 가게 상시.
- GA4 cos_quest {step: offered|visited|done, via, item_id}.

## 검증 (2026-10-20)
- npm test 3767/3767
- 실게임(?dbg): 튜토리얼 스킵 → cosQuest visit → 문 위 🎀 → 가게 열기 buy → 50🪙 구매 → 착용·done·카드 사라짐·🪙+30
- 가로 폰: Android 740×360·iPhone SE 667×375 터치 에뮬레이션에서 창이 화면 안(캡처 sims/kinder-cosmetics/shop-*.jpg). iPhone 14 844×390 은 터치 에뮬 불가 → is-touch 규칙(mobile-hud.js 도구 막대 0 크기) 코드로 확인.

## 함정
- 스포트라이트 안내(spot)가 돌면 coachActive=true → 오퍼 막힘. 실제 순서는 spot → coach → endCoach.
- 게스트 리로드 = 새 익명 계정. 같은 세션 안에서 hintsSeen 주입으로 진행.
- 배포: 옛 클라가 모르는 꾸미기 id 를 지우므로 4곳 동시 배포.
