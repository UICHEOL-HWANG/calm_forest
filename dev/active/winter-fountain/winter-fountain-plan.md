계획 원문: docs/superpowers/plans/2026-11-15-winter-fountain.md

# Winter Fountain Season

**Goal:** 12/18~12/31 겨울 시즌에 수확제 광장 자리에서 각자 "내 분수"(1인 목표 95개, 4단계)를 짓고, 마을 전체 기부로 광장 둘레 등불 9개(300·800·1,500)를 켜는 시즌을 연다. 게스트도 참여한다.

**Architecture:** 클라이언트 시즌 목록(`PLAZA_SEASONS` + `pickSeason`)이 날짜로 현재 시즌을 고르고, `kind: 'winter'`이면 `js/plaza/index.js`가 모든 진입점을 새 런타임 `js/plaza/winter.js`로 넘긴다. 수확제 경로는 한 줄도 바뀌지 않는다. 내 분수 진행은 세이브(`gameState.plaza.winter[season]`)가 원본이고, 서버는 새 RPC `plaza_give`로 1인 상한·하루 상한·마을 누적만 지킨다. 규칙은 전부 순수 모듈(`seasons.js`, `winter-rules.js`, `winter-guide.js`, `winter-card.js`)로 두고 node 테스트로 잠근다.

## 스펙에서 달라진 점

1. **광장의 지금 모습은 수확제 1단계가 아니라 완공(4단계)이다.** 운영 `/api/plaza?season=harvest-2026`은 `completed: true, forced: true, stage: 4`를 돌려주고(2026-11-15 조회), `visualStage()`(js/plaza/rules.js:47)는 그걸 4로 그린다. 시안은 `buildPlaza(1, 'after')`로 그려서 스펙의 "1단계 잔재(흙바닥·더미·말뚝) 숨기기"가 나왔지만 실제로 숨길 1단계 잔재는 없다. 겨울 바탕은 `buildPlaza(4, 'after', { winter: true })` + `buildPath(4, 'after')`로 고정한다. 바뀌는 점: 호박 더미를 뺀다(분수 둘레 등불 하나가 호박 (3.0, 1.9)과 0.36 거리로 겹친다), 눈 원판은 돌바닥(높이 0.08) 위로 올라오게 두께 0.1로 깐다. 수확 나무·벤치·가로등·허수아비·볏단·명판은 남는다. Task 6 게이트에서 사용자가 본다.
2. **기부함이 없다.** 4단계·after 광장은 기부함 자리에 명판이 선다(js/plaza/build.js:69). 겨울에는 분수 자체가 기부 지점이다(반경 2.8, 프롬프트 "❄️ 내 분수에 보태기"). 명판은 모양만 남고 겨울 동안 상호작용하지 않는다.
3. **내 분수 진행은 세이브가 원본이다.** 게스트가 로그인하면 세이브는 새 계정으로 옮겨지지만(js/supabase-client.js:594 `migrateGuestSave`) 서버 기부 행은 익명 uid에 남는다. 서버 합계로 단계를 정하면 로그인한 게스트가 1단계로 되돌아간다. 그래서 `plaza_mine`·`_plaza_current_stage`(전 유저 합산)를 쓰지 않고 새 RPC `plaza_give(p_season, p_stage, p_item, p_qty)`를 둔다. 서버는 (시즌, 사용자, 단계, 재료)별 1인 상한, 하루 상한 30, 게스트 허용 여부만 지키고 단계 순서는 클라이언트가 지킨다. 어뷰징 피해는 수확제와 같이 하루 상한으로 묶인다.
4. **서버 열이 둘이다.** 스펙의 `allow_guests`에 더해 `per_user boolean`을 둔다. `plaza_give`는 `per_user` 시즌만 받고, 기존 `plaza_donate`는 `per_user` 시즌을 `season`으로 거절한다(전 유저 단계 계산이 1인 목표 시즌에 섞이지 않게). 수확제 행은 둘 다 기본값 false라 동작이 같다.
5. **등불 보상 자격은 "처음 보탤 때의 마을 누적"으로 판정한다.** `plaza_give`가 넣기 직전 마을 누적 `village_before`를 돌려주고, 클라이언트가 처음 받은 값을 세이브 `joined`에 남긴다. 단계 k의 자격은 `joined < [300, 800, 1500][k-1]`. 서버 조회가 하나도 늘지 않고 로그인 이관에도 살아남는다.
6. **새 이벤트 이름은 `plaza_fountain_stage`, `plaza_lamp_stage`다.** `tests/plaza-tracking.test.mjs`가 js/plaza/ 안의 이벤트를 전부 `plaza_` 접두사로 잠근다.
7. **올빼미 초대·🍂 단풍잎·좌판·환전은 겨울에 돌지 않는다.** 겨울 경로는 `updateInvite`·`maybeConvert`·`stageSeenPlan`을 부르지 않는다. 안내는 배너 + 금색 화살표로 대신한다.
8. **`fountain_double`은 기부 창의 마을 등불 칸에 붙는다.** 보상 알림은 토스트(팝업 큐 `kind: 'result'`)이고 `showHintModal`(index.html:5272)은 광고 버튼 자리가 없다.
9. **의뢰 줄은 "❄️ 내 분수 n/4"로 n = 지금 단계(1~3).** 시안 칩과 같다. 다 지으면 줄이 사라진다.
10. **12/31 불꽃**은 시즌 마지막 KST 날(`closesKst` 하루 전)에 마을 3단계이고 `nightLevel > 0.3`일 때 광장 위에 뜬다.
11. **트래킹은 런타임 작업(Task 8)에 합친다.** `tests/event-taxonomy.test.mjs`가 코드에서 나가는 이벤트마다 CSV 행을 요구하므로 이벤트와 행이 같은 커밋에 들어가야 한다.
12. **시즌 전환은 페이지를 열 때 한 번 정한다.** 12/18 00:00을 넘겨 켜 둔 화면은 다시 열어야 겨울이 된다.
13. **`?plazaSeason=<처음 보는 id>`(localhost 전용)**는 목록의 마지막 시즌(겨울) 정의를 그 id로 복사해 쓴다. 테스트 시즌 서버 경로 검증용이다.
14. 기존 테스트 두 곳만 고친다: `tests/plaza-rules.test.mjs`의 `restorePlaza` 왕복 기대값에 `winter: {}`를 더하고, `tests/plaza-wiring.test.mjs`의 연결 바늘 `'initPlaza()'`를 `'initPlaza(GE)'`로 바꾼다.
15. 남는 위험: 익명 계정을 계속 새로 만들면 마을 누적을 부풀릴 수 있다(계정당 하루 30). 광고 횟수 서버 검증과 같이 범위 밖으로 둔다.
