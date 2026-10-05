# 🔭 천문대 별자리 해금·도감 + star_runs 학습 데이터

## Context
천문대 미니게임은 북두칠성 1종뿐이라 한 번 깨면 다시 올 이유가 약하다. 사용자 결정(2026-10-05):
- 별자리는 **해금형 진행 + 별자리 도감** (완주하면 다음 별자리가 열리고, 뒤로 갈수록 노트가 늘어난다)
- 학습 데이터는 **GA4 + Supabase `star_runs`** (판 단위 행, 당일 조회·광고차단 유실 없음)
- DDA probe 는 이미 들어가 있다(`DIFFICULTY.star` 팔 0.7/1.0/1.4, 블록 셔플, abandon 기록). 남은 건 **별자리별 점수 정규화**·`run_id`·분석 SQL.

## 결정한 설계
1. **별자리 데이터 단일 출처** `js/observatory/constellations.js`
   `{ id, stars:[[x,y]...], order:[...], tempo, season }` 6종(노트 수가 늘어나는 순서, 초안):
   북두칠성(7) → 카시오페이아(4·빠름) → 백조자리(8) → 사자자리(9) → 오리온(10) → 전갈자리(11).
   좌표는 실제 별 배치를 단순화한 것. **목록·모양은 시안 렌더로 확인받고 확정**(아래 1단계).
2. **해금은 저장하지 않고 계산**(박물관 `museum.js` 선례): `gameState.star = { cleared:{id:date}, plays:{id:n}, best:{id:score} }`.
   n번째 별자리는 n-1번째가 `cleared` 면 열린다. `starDay`(하루 1회 보상)는 그대로.
   도감은 `DEX` 에 넣지 않는다 → `DEX_TOTAL`·박물관 층·save-migrate 점수에 번지지 않게 천문대 안 별도 페이지.
3. **rhythm.js 일반화**: `buildChart(c, ease)`, `summarize(judges, notes)` → `maxScore = notes*2`,
   성공 = `miss <= ceil(notes*0.4)`(7노트는 지금과 같은 3), `rewardFor` 는 그대로 `10 + perfect*2`
   (하루 1회 상한이 경제를 잡는다) + **첫 클리어 1회 보너스 +30🪙**(별자리마다).
   `difficulty.js:84` 를 `score/maxScore` 로. DDA 는 별자리 공통 1개, 별자리는 분석 공변량.
4. **고르기 화면**: 망원경을 보면 열린 별자리가 2개 이상일 때 렌즈 위에 선택 카드(잠긴 건 실루엣+🔒).
   **UI 시안 3안 PC+모바일 캡처 비교 → 승인 후 구현**, 문구는 후보를 먼저 검수받는다.
5. **트래킹** — 모든 이벤트에 같은 `run_id`(렌즈 열 때 `crypto.randomUUID()`)와 `constellation`, `notes`:
   - GA4: `star_start` / `star_result`(+`max_score`·`first_clear`·`attempt_n`) / `minigame_abandon` / `star_unlock` / `star_pick`
   - Supabase `star_runs`(판마다 1행, 포기도 행으로): run_id, constellation, notes, outcome(success|fail|abandon), abandon_reason,
     perfect, good, miss, max_combo, score, max_score, offsets jsonb, judges jsonb, duration_ms, coins, already_today,
     first_clear, attempt_n, unlocked_n, ease, arm, dda, probe_v + 공통(user_id, session_id, client_id, is_guest, variant, platform, run_date)
   - dev 세션(`IS_DEV_SESSION`)은 둘 다 안 쓴다(기존 게이트 재사용).

## 단계 (dev/active/observatory-constellations/ 에 plan·context·tasks 생성 후 진행)
1. **시안**: `sims/constellation-sim.html` — 6종 모양 + 고르기 카드 3안, PC·모바일 캡처 나란히 → 사용자 확인
2. **SQL**: `sql/migrations/migrate_star_runs.sql` (boat_runs 패턴: identity PK, jsonb, 인덱스, RLS `(select auth.uid())` select/insert own, platform check) → **사용자가 DDL 실행**(클라이언트 배포 전 필수 — 고정 컬럼 insert)
3. **데이터·로직 (TDD)**: constellations.js, rhythm.js 일반화, star-run.js(첫 클리어·cleared/plays/best), difficulty.js 정규화, game.js 기본값+`applySave` 복원
4. **클라이언트 기록**: `js/supabase-client.js` `sendStarRun`(sendBoatRun 복제), `js/config.js` `STAR_TABLE`
5. **UI**: render.js 가 선택된 별자리를 그리도록, 고르기 카드, 별자리 도감 페이지, 해금 토스트·copy.js·i18n-en, doors.js 안내 문구 일반화
6. **분석 SQL**: `difficulty_probe.sql` §1·§6·§7 에 star 추가 + 별자리별 섹션(score/max_score, arm×constellation)
7. **검증·배포**: 아래 검증 → code-reviewer → 4곳 배포 → 다음 날 BQ 재검증

## 재사용
- `sendBoatRun` `js/supabase-client.js:690` (dev/오프라인 폴백·에러 삼킴) · `kstDate`
- `rollDifficulty`/`settleDifficulty`/`diffParams`/`trackDiffAbandon` (game.js / difficulty.js)
- 박물관의 '계산형 해금' 패턴 `js/museum.js:8-10` · 요리 `✨NEW` 배지 CSS
- RLS 스타일 `sql/migrations/migrate_struct_01_rls_perf.sql:67`

## 바뀌는 테스트(값 고정 해제 → 별자리 파라미터화)
observatory-rhythm / playback / overlay / star-run / ui / interior 의 7노트·14점·`big_dipper` 고정, `kst-date.test.mjs` 의 `run_date: kstDate()` 개수(2→3).

## 검증
- `npm test` 전부 통과 + 새 테스트: 별자리별 차트 길이=노트 수, 정규화 DDA, 해금 계산, 세이브 왕복(cleared 유지), star_runs 행 모양(고정 컬럼 목록과 일치)
- 브라우저(127.0.0.1 게스트 탭, 사용자 탭과 분리): 북두칠성 완주 → 카시오페이아 해금 토스트 → 고르기 카드 → 2번째 별자리 완주 → 도감 표시, PC+모바일 390
- dev 세션이 아닌 게스트로 1판 → Supabase `star_runs` 행 조회(성공·포기 각 1행, run_id 가 GA4 콘솔 페이로드와 같음)
- 드로우콜·렌즈 프레임: 노트 11개(전갈) 에서도 shadowBlur·drawImage 상한 테스트 통과
