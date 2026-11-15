# winter-fountain context
Last Updated: 2026-11-15 (KST)

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
