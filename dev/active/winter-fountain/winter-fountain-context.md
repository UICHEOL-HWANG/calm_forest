# winter-fountain context
Last Updated: 2026-11-16 (KST)

## 핵심 파일
- js/plaza/winter.js 런타임, js/plaza/winter-rules.js 규칙, js/plaza/seasons.js 시즌 선택
- sql/migrations/migrate_plaza_winter.sql, sql/tests/plaza_winter_selftest.sql (배포 날 적용)

## 결정
- 내 분수 진행 = 세이브 gameState.plaza.winter[season] (로그인 이관 때문)
- 서버 RPC plaza_give: 1인 상한·하루 상한·게스트 허용만, village_before 반환
- 겨울 바탕 = 수확제 완공(4, after) - 호박 + 눈 원판, 분수가 기부 지점

## 의존
- 운영 harvest-2026 은 forced 완공(stage 4)
- 배포 5곳 동시(새 꾸미기 id 2종, 새 세이브 칸)

## 2026-11-16 결정·발견
- 낮에도 켜진 등 구분(금색 갓+빛 무리), 겨울엔 수확제 가로등 숨김(사용자 "두 가지 다듬기").
- 서버 'need' 거절 시 markFull 로 세이브 재동기화(세이브가 서버보다 늦을 때 단계 고착 방지).
- 화살표 도착 반경 2.6 < 분수 칸 2.8, arrived 래치(guide_step 반복 방지). 화살표는 배너 요청한 접속에서만(최대 2번).
- 첫 방문 칸은 시즌 active·비디버그에서만.
- 광고 quiet 'coaching' 은 #tutorial-modal.show 만(전엔 모든 카드 모달이 걸려 창 안 광고가 다시 그릴 때 사라짐 — 운영에도 있음).
- 재료 채우기 광고는 실제로 모자랄 때만.
- 새 문구: lampToastGuest '🏮 등불 {0}개가 켜졌어요! 로그인하면 선물을 받아요' (사용자 확인 대기).
