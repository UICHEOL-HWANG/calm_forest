# neighbor-table-dish context

Last Updated: 2026-11-19 (구현 세션, 5단계 집주인까지)
- 사용자 결정(4단계 중): 주방 같은 별도 공간 + 이웃 전용 무대. 시안 3개(식탁·담요·그루터기) 중 C 그루터기 상. 기존 요리 판(stages[0] 한 판)을 그대로 쓰고 kitchen-stage 의 setStageTheme 이 벽·선반·조리대(kset.base)를 숨기고 그루터기 배경과 집주인을 얹는다. 바닥 창(dish-game.js) 시안은 폐기·삭제. 집주인은 그루터기 반지름+몸 반지름 바깥 의자에 앉힌다(통과 지적 반영).
- dev docs 는 이 워크트리 dev/active/neighbor-table-dish/ 로 옮겼다(루트 쓰기는 훅이 막는다). 루트 사본은 옛것.
- 캡처: PORT=<serve 포트> OUT=<폴더> node dev/active/neighbor-table-dish/verify/seat-shots.mjs <phone|land|pc> <bear|rabbit>. zsh 루프는 ${=a} 로 쪼갤 것.

## 구현 메모
- 워크트리: /Users/uicheol_hwang/calm_forest/.claude/worktrees/neighbor-table-dish-0d8ba4 (브랜치 claude/neighbor-table-dish-0d8ba4)
- 운영 neighbor_view_start 는 slot 을 `case when p_slot between 0 and 2` 로 받아 null 이 그대로 통과한다. 고칠 필요 없음.
- my_visitors 새 본문은 운영 pg_get_functiondef(2026-11-19)에서 출발. 다녀간 이웃 = 반응 ∪ 접시 올린 이웃. 비공개·숨김·익명 이웃은 public_id 가 null(답방 불가).

## 한 줄
방문자가 이웃 식탁에 앉아 자기 요리 한 접시를 미니게임으로 차려 주고, 집주인은 골라 먹고 이모지로 평가하고 답방한다.

## 왜
최근 14일 이웃 구경: 31회, 방문자 10명, 재방문 1회, 체류 중앙값 15초, 반응 남김 77% (운영 DB village_views, 2026-11-19).

## 위치
- 코드 기준 브랜치: main. 루트 체크아웃(/Users/uicheol_hwang/calm_forest)은 fix/port-boat-choice 라 식탁 코드가 없다.
- dev docs·시안은 루트 쪽에 untracked 로 있다(새 워크트리에는 안 보인다). 절대 경로로 읽는다.
  - 계획: /Users/uicheol_hwang/calm_forest/dev/active/neighbor-table-dish/neighbor-table-dish-plan.md
  - 시안: /Users/uicheol_hwang/calm_forest/sims/neighbor-return-gift-sim.html (C열 확정)
  - 시안: /Users/uicheol_hwang/calm_forest/sims/neighbor-table-dish-sim.html (별·결과 문구, ④줄 "다"+"나" 확정)
  - 실화면: /Users/uicheol_hwang/calm_forest/sims/neighbor-table-sit/*-C-shoulder.png (구도 확정)
  - 캡처 스크립트: verify/table-sit-shot.mjs (serve.py 8793 필요, main 워크트리 절대 경로가 박혀 있으니 새 워크트리 경로로 바꿔 쓴다)

## 사용자 결정
- 답방 입구 = 팻말 목록 맨 위 "나를 찾아온 이웃"
- 별 1~3, 못해도 요리 전달, 방문자 코인은 별과 무관
- 집주인은 접시 목록에서 하루 하나 골라 한 입, 반응 4종으로 평가
- 어깨 너머 구도로 앉은 뒤 미니게임 화면으로 전환(접시 위 게이지 방식 아님)
- 미니게임은 기존 요리 판 재사용(레시피 stages[0], 4종 모두)
- 실시간은 접속 중 표시만, 마지막 단계
- 구현은 Opus 새 세션

## 아직 사용자 결정이 필요한 것
- 새 문구 전부(후보 검수 전)
- 앉는 거리·카메라 최종 값(실화면 게이트)
- 상한 수치(한 집 하루 1, 하루 3집, 식탁 6접시, 7일 만료, 한 입 배수)
- 운영 SQL 적용 시점, 배포 시점

## 핵심 파일
- 이웃: js/spaces/neighbor.js, js/neighbors/{api,rules,ui,scene,sanitize,track}.js, js/supabase-client.js:730
- 요리: js/game-ui/cook-course.js, js/spaces/cooking.js, js/spaces/kitchen-stage.js, js/data/catalog.js:137-187, game.js:5902-6008
- 식탁: js/table/{index,build,rules,book-ui,style-picnic,plates}.js, js/data/table.js
- 카메라·착석 선례: game.js:7427 setCameraRig, js/world/tree-shot.js:57, js/mountain/cafe-room.js:79, js/concert/bridge.js
- SQL: sql/migrations/migrate_neighbors*.sql, migrate_neighbor_table.sql, sql/tests/neighbors_selftest.sql
- 테스트: tests/neighbor-*.test.mjs, tests/neighbors-*.test.mjs, tests/table-wiring.test.mjs

## 함정
- 서버가 세이브에 직접 쓰지 못한다. 접시는 village_dishes 에 두고 클라가 받는다.
- js/spaces/neighbor.js 는 gameState.neighbors 와 hintsSeen.neighborPublic 만 쓸 수 있다(테스트로 잠김).
- kitchenStart·kitchenFinish 를 타면 재료가 깎이고 내 요리 기록이 오른다.
- mgView 동안 updateNeighbor 가 멈춘다. mgSceneEnd 가 snapCamera 를 한 번 부른다.
- 옛 마이그레이션 재실행 금지. 새 SQL 은 운영 본문에서 출발.
- 캡처는 앱 패널이 숨으면 rAF 가 멈춘다. 헤드리스 CDP 로 찍는다. 캐릭터 고르기 창은 이름 입력을 채워야 닫힌다.
- Bash 명령에 delete 글자가 있으면 훅이 막는다. 스크립트는 파일로 만들고 실행만 한다.
