# admin A/B 대시보드 갱신 (2026-11-09)

## Context
`dashboards/experiments.html` 의 실험 목록은 Supabase `cf_experiments`(사람이 관리)와 `cf_experiment_results`(매일 03:00 `ml/scripts/experiment_summary.py` 가 BigQuery 로 계산)로 그려진다. 지금 목록에는 E5(로그인 게스트 우선)·집 기초 안내 실험·가입 선물 이어가기 경로가 없고, 광고 카드는 1주차(`ads_w1`) 하나뿐이며 판정 가설(H1·H6·H7)과 실제 결과가 안 채워져 있다. 사용자 결정: E1 갱신 + 집 기초 안내 신규 등록 / `ads_w1` 삭제 후 주차별 카드로 대체 / 가설은 판정 H1·H6·H7 + 탐색 H2~H5.

## 확인된 사실
- E1("밭 앞 시작 vs 기존")은 이미 `cf_experiments`·`run_e1` 에 있음. 새로 만들 것 없음, 기록·상태 점검만.
- E5: `js/exp-e5.js` 배포됨(10/31 시작). GA4 사용자 속성 `exp_login`. 로그인 화면 본 기기 control 45 · guest_first 38. 사전등록 `dev/active/metrics-framework/login-guest-first-prereg.md`(판정 11/7, 목표 무리당 ~115대, 최소 효과 ~+15%p, 주 지표 = 로그인 화면 본 기기 중 같은 날 `login`/`nickname_step`/`tutorial_start`, 가드레일 = `login_store_click` 비율).
- 집 기초 안내(houseGuide): `js/house-guide-rules.js` arm control/guide, 이벤트 `house_guide_eligible/shown/end/arrive`(arm 파라미터) + `house_build.house_guide_arm`. 11/3부터 GA4 에 쌓임(eligible 34대). 사전 기준 문서는 구현 때 `docs/analysis/PROGRESSION_D1_SCOPE.md` 등에서 확인.
- 가입 선물 경로 이벤트(전부 GA4 에 있음): `login_nudge`(125) → `login_nudge_click`(62, 14대) → `inapp_nudge_email`/`email_login`(open·request·verify) → `signup_gift_claim`(result=new) → `signup_gift_open`.
- 광고 가설 원문: `dev/active/meta-ads-launch/parts/02-goals-hypotheses.md` (H1 1주차 CTR, H6 2주차 B군(바다터) vs 일반 11/7, H7 3주차 C군 vs 승자 11/14, 탐색 H2~H5). 1주차 실측: `ml/reports/meta_w1_20261030/` (광고비 66,037 vs 66,534원 · 웹 유입 298 vs 135 · 시작 66 vs 30 · D1 17.2% vs 4.2% · 시작당 비용 1,001 vs 2,218원).
- 판정 엔진 `dashboards/js/admin-metrics.js analyzeExperiment` 는 두 팔 비교만 지원 → 깔때기(여러 단계)는 화면에 새 패널이 필요.

## 변경 계획
1. **마이그레이션** `sql/migrations/migrate_experiments_2026_11_09.sql` (idempotent, begin/commit; 실행은 pg8000 풀러 직접)
   - `delete from cf_experiments where id='ads_w1'` (결과 행은 cascade) — 삭제는 사용자가 명시 요청.
   - 신규/갱신 행: `e5`, `hguide`(run, 11/3~), `gift_path`(kind `policy`, 무작위 아님·설명용), `ads_h1`(ext, 10/24–10/30), `ads_h6`(ext, 10/31–11/6), `ads_h7`(plan, 11/7–11/13). `ads_h*` question·prereg·metric 은 02-goals 문서 문구 그대로, `confound` 에 "메타가 지면을 고름 · 첫 화면 연출 다름(할로윈)" 명시. E1 log 에 광고·온보딩 이후 기록 추가.
2. **요약 스크립트** `ml/scripts/experiment_summary.py`
   - `run_e5`(기존 `GA4_EV`·`_one_arm`·`_ci_official` 재사용, prop=`exp_login`, 기기 부트스트랩 CI, 가드레일 store click 을 secondary) · `run_hguide`(arm 파라미터, 주 지표 = 집 1단계 완공 `house_build stage=1` 비율, 도착률 secondary) · `run_gift_path`(깔때기 단계별 기기 수, E5 무리별 분해 포함). `jobs` 에 등록.
   - 광고 카드는 BQ 가 아니라 **manual**(노출·클릭은 GA4 에 없음): 1주차는 `meta_w1_20261030` CSV 로, 노출·클릭(CTR)·2주차는 Meta Ads 에서 가져와 `cf_experiment_results(source='manual')` 로 입력. secondary 로 H2(첫 플레이율)·H3(시작당 비용)·D1·H4·H5 는 방향만.
3. **화면** `dashboards/js/admin-experiments.js`
   - `res.funnel`([{label, by:{key:n}}])이 있으면 "단계별 깔때기" 표 패널 렌더(전 단계 대비 %, 무리별 열). `kind='policy'` + funnel 만 있는 카드는 효과 그림·checks 를 건너뜀. `analyzeExperiment` 빈 arms 경로를 funnel 카드에서 `['obs','설명용']` 으로 분기(테스트 추가).
   - 규칙 박스 "E1~E3" → "E1~E3·E5" 정정.
4. **dev docs** `dev/active/admin-ab-update/{plan,context,tasks}.md` 생성(CLAUDE.md 규칙).

## 구현 중 막히면 사용자에게
- 2주차 광고 숫자: Meta MCP 는 과거 1081 오류로 막힌 이력 → 안 되면 Ads Manager 노출·클릭·광고비를 사용자가 붙여넣어야 함(사용자 몫).
- E5 판정은 사전등록상 11/7 한 번인데 표본 83대(<230). 화면은 "표본 미달/판정 불가"로 두고 결론 문구는 사용자가 정함. E6(A안 vs 바로 밭)은 이번 범위 밖.
- 세그먼트 S1~S10·결제 P1~P4 는 이번 범위 제외(합의대로).

## 검증
- `node --test tests/admin-experiments.test.mjs` (funnel 분기·기존 판정 순서 회귀)
- `ml/.venv/bin/python ml/scripts/experiment_summary.py --dry-run --only e5 hguide gift_path` 후 BQ 직접 쿼리로 교차검산(E5 로그인 화면 기기 45/38 일치 여부)
- 마이그레이션 후 `select id,status from cf_experiments order by sort` 로 `ads_w1` 부재·새 행 확인
- 대시보드를 preview 로 열어 목록·E5·hguide·gift_path·ads_h1/h6 상세와 모바일 폭 스크린샷 확인(관리자 로그인/공유 토큰 필요)
- 배포는 범위 밖(요청 시 5곳 체크리스트). 커밋·푸시 안 함.
