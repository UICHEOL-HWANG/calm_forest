# 이웃 식탁 한 접시 · 답방 (neighbor-table-dish)

## Context

이웃 구경은 최근 14일간 구경 31회·방문자 10명·재방문 1회·체류 중앙값 15초였다(운영 DB `village_views`, 2026-11-19 조회). 들어온 사람의 77%는 반응을 남기지만, 구경 말고 할 일이 없고 다녀간 흔적이 집주인에게 창 한 번으로 끝난다.
그래서 이웃끼리 주고받는 고리를 만든다. 방문자가 이웃 식탁에 **앉아서** 자기 요리 한 접시를 미니게임으로 차려 주고, 집주인은 쌓인 접시 중 하나를 골라 먹고 이모지로 평가하고, 답방한다.

사용자 확정 사항(2026-11-19 대화):
- 답방 입구는 팻말 목록(오늘의 이웃) 맨 위 "나를 찾아온 이웃" 구획 (시안 C, `/Users/uicheol_hwang/calm_forest/sims/neighbor-return-gift-sim.html`)
- 한 접시 올리기: 별 1~3, 못해도 요리는 전달, 방문자 코인은 별과 무관 (`/Users/uicheol_hwang/calm_forest/sims/neighbor-table-dish-sim.html`)
- 집주인은 접시 목록에서 하나 골라 한 입, 먹은 뒤 기존 반응 4종으로 평가 (같은 시안 ④줄의 "다" + "나")
- 앉는 구도는 어깨 너머(`/Users/uicheol_hwang/calm_forest/sims/neighbor-table-sit/phone-C-shoulder.png`, `pc-C-shoulder.png`). 앉은 장면 → 미니게임 화면으로 전환 → 다시 앉은 장면. 게이지를 접시 위에 띄우는 방식이 아니다
- 미니게임은 기존 요리 판을 재사용. 레시피의 첫 판(`stages[0]`: pot·season·grill·chop)이 그대로 정해진다
- 실시간은 "지금 접속 중" 표시만, 맨 마지막 단계

작업 위치: `main` 에서 새 브랜치 `feat/neighbor-table-dish`. 루트 체크아웃(`/Users/uicheol_hwang/calm_forest`)은 다른 브랜치라 식탁 코드가 없다. **로컬 커밋까지만. 푸시·병합·배포·운영 SQL 적용은 사용자 지시가 있을 때만.**

## 조사로 확인된 제약

1. 서버는 남의 세이브(`game_saves.state`)에 쓰지 못한다(클라가 전체를 덮어씀). 접시는 별도 테이블에 쌓고 집주인 클라가 받아 간다. 가장 가까운 선례는 오라 주문 받기(`functions/api/aura-order.js:40-53`, `js/aura/workshop-ui.js:155-170`).
2. 줄 수 있는 요리는 `gameState.pantry [{id, score}]`(최대 6, `js/spaces/cooking.js:33`)뿐이다. 자유 냄비(`free:`)는 이웃 화면에서 걸러지므로 줄 수 없다(`js/neighbors/sanitize.js:96`).
3. `tests/neighbor-space.test.mjs:24-27` 이 `js/spaces/neighbor.js` 의 세이브 쓰기를 `gameState.neighbors`·`hintsSeen.neighborPublic` 로 제한한다. 찬장 차감·버프 적용은 `js/spaces/cooking.js` 의 함수로 한다.
4. `my_visitors` 는 방문자의 `public_id` 를 돌려주지 않는다. 차단하면 `public_id` 가 바뀐다(`sql/migrations/migrate_neighbors_block_rotate.sql`).
5. 이웃 마당의 식탁은 충돌·프롬프트·행동이 없다(`js/neighbors/scene.js:161-166`, `tests/neighbor-table.test.mjs:72`). `neighborAction` 은 이웃 행동 5종 외를 삼킨다.
6. 요리 판 실행기 `startCookCourse(st)` (`js/game-ui/cook-course.js:268`) 는 `st` 출처를 가리지 않지만, `endCourse`(:342 부근)·`closeResult`(:417) 가 cafe/kitchen 두 길만 안다. `kitchenStart`(재료 차감, `game.js:5909`)·`kitchenFinish`(내 기록·보상·DDA, `game.js:5936`)를 타면 안 된다.
7. `mgView` 동안 `updateNeighbor`·`updateCamera` 가 멈추고(`game.js:6673`), `mgSceneEnd` 가 `snapCamera()` 를 한 번 부른다.
8. 캐릭터 몸 반지름이 동물마다 달라(토끼 0.46 ~ 곰 0.63, `ANIMALS` `game.js:1758`) 그루터기 거리 1.18 에 그대로 앉히면 식탁 상판(반지름 0.85, 높이 0.75)과 겹친다. 캡처에서는 곰을 1.30 에 앉혔고 배가 상판에 살짝 걸쳤다.
9. 옛 마이그레이션 파일을 다시 돌리면 함수 본문이 옛것으로 돌아간다. 새 마이그레이션은 운영의 현재 본문(`pg_get_functiondef`)에서 출발하고, `tests/neighbors-sync.test.mjs` 가 요구하는 파일 간 동기화를 지킨다. 최신 정의 위치: `neighbor_react`·`my_visitors` 는 `migrate_neighbors_report_block.sql`, `neighbor_view_start`·`_nb_candidates` 는 `_report_block_2.sql`, `neighbor_showcase` 는 `migrate_neighbor_table.sql`, `neighbor_block` 은 `_block_rotate.sql`.
10. 새 RPC 는 `js/supabase-client.js:730` `NEIGHBOR_RPCS` 허용 목록에 넣어야 한다(`tests/neighbors-report-block.test.mjs:104`). 새 한국어 문구는 `js/i18n-en.js` 에 영어 항목이 있어야 한다(`tests/neighbors-i18n.test.mjs`).
11. `sql/tests/neighbors_selftest.sql:302` 에 실제 관리자 uid·이메일이 하드코딩돼 있다. 건드리지 않는다.

## 설계

### 규칙 (순수 함수, `js/neighbors/dish-rules.js` 신규)
- 별: 미니게임 한 판 점수(0~100)를 `COOK_TIERS` 컷으로 환산. 88 이상 3, 65 이상 2, 그 외 1. 서버도 같은 컷으로 다시 계산한다.
- 상한: 한 집에 하루 한 접시, 하루 세 집(기존 `REWARD_CAP` 과 같은 수). 집주인 식탁에 안 먹은 접시가 6개면 `full`.
- 집주인은 하루(KST) 한 접시만 먹는다. 안 먹은 접시는 7일 뒤 목록에서 빠진다.
- 한 입 효과: 그 레시피의 버프를 `biteSeconds` 식(`js/table/rules.js`)에 별 배수(1·1.25·1.5)로 준다. 찬장에 넣지 않는다(상한 6 충돌·세이브 지급 문제 회피).
- 방문자 보상: 성공 시 🪙5(`REWARD_COINS`), 별과 무관. 서버 `rewarded` 가 true 일 때만.
- 게스트는 올릴 수 없고 로그인 안내(기존 `reactOutcome` 의 `login` 처리와 같은 길).

### 서버 (`sql/migrations/migrate_neighbor_dishes.sql` 신규)
- 테이블 `village_dishes(id, giver, host, day, recipe, score, stars, created_at, eaten_at, emoji, rated_at)`, `unique(giver, host, day)`, `check(giver<>host)`, RLS 켜고 정책 없음, 권한 전부 회수(기존 규칙 그대로).
- RPC (전부 `security definer set search_path = public`, `authenticated` 만, `jsonb {ok, reason}` 반환):
  - `neighbor_dish_leave(p_host uuid, p_recipe text, p_score int)`: 게스트·본인·비공개·숨김·차단 거절, 레시피 11종 허용 목록(`_nb_table` 과 같은 목록), 점수 0~100 절단, `pg_advisory_xact_lock`, 상한 검사, `on conflict do nothing` → `dup`. 반환 `{ok, stars, rewarded}`.
  - `my_table_dishes()`: 내 식탁의 안 먹은 접시(7일 이내, 차단 제외) `{id, recipe, stars, nick, character, public_id, at}` + `ate_today`.
  - `neighbor_dish_eat(p_id bigint)`: 내 접시만, 오늘 이미 먹었으면 `limit`, `eaten_at is null` 일 때만 갱신하고 행을 돌려준다(두 번 불러도 한 번만 성공).
  - `neighbor_dish_rate(p_id bigint, p_emoji text)`: 내가 먹은 접시만, 이모지 4종 검사, 한 번만.
- `my_visitors` 확장: 각 항목에 `public_id`, `dish`(올린 접시 별 수 또는 null) 추가. 내가 올린 접시에 달린 평가 `replies:[{nick, character, emoji, public_id}]` 도 같은 응답에 싣는다. 옛 클라는 모르는 필드를 무시한다.
- `neighbor_view_start` 의 `slot` 은 답방일 때 null 을 받는다(운영 본문의 0~2 검사 확인 후 필요하면 완화).
- 셀프테스트: `sql/tests/neighbors_selftest.sql` 정리 구간 앞에 ⑧ 구획 추가(올리기 상한·중복·차단·게스트, 먹기 하루 한 번·남의 접시 거절, 평가 한 번, `my_visitors` 새 필드). DO 블록 하나 유지.
- `tests/neighbors-sync.test.mjs`·허용 목록 테스트 갱신.

### 클라이언트
| 무엇 | 어디 | 재사용 |
|---|---|---|
| API 메서드 4개 + `visitors` 응답 확장 | `js/neighbors/api.js`, `js/supabase-client.js` 허용 목록 | 기존 `{ok:false, reason}` 규약 |
| 목록 구획 "나를 찾아온 이웃" + 🍽️·평가 배지 | `js/neighbors/rules.js` `pickerRows` 확장, `js/neighbors/ui.js` `openPickerModal` | `.nb-row`, `goVisit`(목록 안에서 눌러야 함, `js/spaces/neighbor.js:58`) |
| 식탁 앉기 규칙(자리·몸 간격·카메라 자세) | `js/neighbors/seat-rules.js` 신규 | `ANIMALS` 몸 수치, `ROUND_SEAT_OUT`, 긴 식탁 통나무 z=±1.08 |
| 앉기 실행(위치 고정·도구 숨김·카메라·집주인 맞은편) | `js/neighbors/seat.js` 신규, `js/neighbors/scene.js` 가 식탁 충돌·식탁 위치·`seatHost(on)` 노출 | `setCameraRig`(`game.js:7427`), `createShotRig` 의 ease/mix(`js/world/tree-shot.js:57`), 산장 카페 `sit/clamp`(`js/mountain/cafe-room.js:79`)와 입력 차단(`game.js:6887`). `$w.sitting` 은 몸을 -0.3 내리므로 쓰지 않는다 |
| 프롬프트·행동 `🍽️ 앉기` / 일어나기 | `js/spaces/neighbor.js` `neighborPrompt`·`neighborAction` | 아이콘 정규식(`index.html:5598`)에 🍽️ 이미 있음 |
| 요리 고르기 시트 | `js/neighbors/dish-ui.js` 신규 | `pantryView()`(`js/spaces/cooking.js:78`) 에서 RECIPES 만 |
| 미니게임 한 판 | `js/game-ui/cook-course.js`: `endCourse` 에 `where==='neighbor'` 분기, `closeResult` 는 kitchen 일 때만 `cookResolve` | `courseOf`·`COOK_MG`·`stageKeys`·`grillKeyOf`(`js/cook-ingredients.js`). 난이도는 고정(`rollDifficulty` 안 씀. 난이도 probe 오염 방지) |
| 찬장 차감·한 입 버프 | `js/spaces/cooking.js` 에 `pantryGive(i)`, `neighborBite(recipeId, stars)` | `pantryTake`(`game.js:6005`), 버프 적용 경로 |
| 올린 뒤 식탁에 접시 + 별 이모지 말풍선 | `scene.js` 의 식탁 `setDishes`, 말풍선은 이모지만 | `buildTable`, `PLATE_RIM` |
| 집주인: 접시 목록 → 한 입 → 평가 → 답방 | `js/table/dish-inbox.js` 신규, 요리책 창 진입점(`js/table/book-ui.js`)과 접속 알림(`bootVisitors`, `neighbor.js:368`) | `modalQueue` kind `neighbor`, 반응 4종 줄(`js/neighbors/ui.js:190-197`) |
| 트래킹 | `js/neighbors/track.js` | 새 이벤트 4개: `neighbor_seat`, `neighbor_dish_leave`, `neighbor_dish_eat`, `neighbor_dish_rate`. 답방은 기존 이벤트에 `via:'return'`. 이벤트당 키 5개 이하 |

흐름: 식탁 고리 진입 → `🍽️ 앉기` → 남쪽 자리에 앉고 카메라가 어깨 뒤로 → 요리 고르기 → 미니게임 화면(기존 확대 무대) → 결과 → 서버 `neighbor_dish_leave` 성공 뒤에만 찬장 차감·코인·저장 → 앉은 장면으로 복귀, 접시에 별 → 일어나기.
서버 호출이 실패하면 찬장은 그대로 두고 기존 `FAIL_TOAST`.

캡처에 쓴 값(출발점): 내 자리 식탁 중심에서 남쪽 1.30, 앵커 높이 0.41, 앞으로 숙임 0.16rad, 카메라 식탁 기준 (1.7, 2.9, 4.2) → 주시점 (0, 0.95, -0.1), 세로 화면은 주시점 기준 거리 1.45배. 집주인은 북쪽 1.18.

## 단계 (각 단계 끝에서 테스트 통과 + 커밋)

0. **준비**: 워크트리·브랜치, dev docs 세 파일과 시안 읽기, `npm test` 기준선 기록.
1. **규칙 + 서버 파일**: `dish-rules.js`(테스트 먼저) → 마이그레이션·셀프테스트 SQL 작성 → sync 테스트 갱신. 운영 DB 적용은 하지 않는다. 적용·셀프테스트 실행은 사용자 승인 뒤 pg8000 풀러로 직접.
2. **답방 목록**: 문구 후보 검수 → `api`·`rules`·`ui` 확장. 서버 미적용 상태에서도 구획이 비어 보일 뿐 깨지지 않게.
3. **앉기 연출**: `seat-rules` 테스트 → `seat.js`·`scene.js` → 실화면 캡처(폰 세로·가로·PC, 곰·토끼, 둥근·긴 식탁)로 몸 간격과 카메라 값 확정. **사용자 확인 게이트**.
4. **한 접시 올리기**: 고르기 시트 → `cook-course` 분기 → 서버 호출 → 접시·별 표시. 가짜 `neighborApi` 주입 하네스(`dev/active/neighbor-indoor/verify/` 방식)로 처음부터 끝까지 확인.
5. **집주인 쪽**: 접시 목록·한 입·평가·답방, 접속 알림 연결. 내 식탁에서도 앉아서 먹는 연출은 3단계 모듈 재사용.
6. **문서·트래킹·리뷰**: 개인정보 처리방침·가이드 문구(`tests/neighbor-docs.test.mjs`), 이벤트 스키마 테스트, code-reviewer·security-reviewer(새 RPC) 실행, 지적 반영.
7. **(분리) 접속 중 표시**: Supabase Realtime presence 로 목록에 초록 점. 클라의 realtime 지원 여부부터 확인하고, 안 되면 보고만 하고 멈춘다.

## 지켜야 할 프로젝트 규칙
- 사용자와의 대화는 한국어 존댓말. 코드·커밋 메시지는 영어.
- 새 코드·CSS·테스트에 주석 없음. 새 코드는 `game.js` 가 아니라 기능 폴더에, `game.js` 연결 줄은 최소(배선 테스트의 줄 수 예산 확인).
- TDD: 순수 규칙은 테스트 먼저. 불변 갱신.
- 새 세이브 키는 `hintsSeen` 안에(`applySave` 화이트리스트). 이번 설계는 새 최상위 필드가 없다.
- 문구: 새 버튼·라벨은 후보를 먼저 검수받는다. 엠대시·"놀다" 금지, 월드 말풍선은 이모지만, 길 안내 화살표 이모지 금지. DOM 은 `textContent` 만(`tests/neighbor-ui.test.mjs:8`).
- 도구 휘두르는 모션은 건드리지 않는다. 팔 포즈는 넣지 않는다(요청 시에만).
- 디자인 판단은 실제 화면 캡처로. 캡처는 직접 열어 확인한 뒤 전달.
- 식탁은 E3 실험 스위치(`spaceLinkOn`) 뒤에 있다. 이웃 식탁 표시는 집주인 `kitchen.best` 기준이라 스위치와 무관하지만, 집주인의 접시 목록은 내 식탁이 없을 수 있으므로 접속 알림 경로를 반드시 같이 둔다.
- 배포는 5곳 동시가 원칙이고 SQL 이 먼저다. 이번 범위 밖.

## 검증
- `npm test` 전체 통과(기준선 대비 실패 0), 웹 빌드 성공.
- SQL: 사용자 승인 뒤 마이그레이션 적용 → 셀프테스트 `NEIGHBORS SELFTEST ALL PASS` → 잔여 행 0 조회.
- 실화면: 헤드리스 CDP(`tools/store-shots/cdp.mjs`, 출발 스크립트 `dev/active/neighbor-table-dish/verify/table-sit-shot.mjs`)로 (a) 답방 목록 (b) 앉기 3화면·2동물·2식탁 (c) 미니게임 4판 각각 진입·복귀 (d) 올린 뒤 접시·별 (e) 집주인 목록·한 입·평가.
- 가짜 API 로 실패 경로: 서버 실패 시 찬장 유지, `dup`·`full`·`login`·`limit` 문구.
- 완료 보고 첫 줄에 미적용 SQL·미배포·남은 사용자 결정(문구, 몸 간격, 상한 수치)을 적는다.
