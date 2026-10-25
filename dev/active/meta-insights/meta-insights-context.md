# context — Last Updated: 2026-10-25

- 워크트리 .claude/worktrees/meta-insights (feat/meta-insights, origin/main 9ccf6c72 기준)
- DAG infra/airflow/dags/ads_funnel_daily.py · 테스트 ml/tests/test_ads_funnel_dag.py · 마트 SQL sql/analytics/ads_funnel.sql
- 시트 CF_meta_ads_webapp_202610 (Variable ads_sheet_id) · 2_일별깔때기 3행부터 날짜, C:G 메타 칸
- VM: lab.calmforest.cloud Airflow, DAG 배포 scp ([[lab-infra-setup]])
- 발견(범위 밖): 시트 10/24 앱첫실행_AOS 0 인데 install_attribution meta 8건 → 앱 열 조인 확인 필요
- 2026-10-25 검증: 10/24 C:G = 19,564원·노출 3,156·도달 2,812·링크 클릭 139·랜딩 조회 63 (API 광고 2행 합과 일치). 10/25 는 GA4 latest(10/24)까지만 써서 다음 실행에 채워짐.
- 함정: macOS `security ... -w` 대화형 입력은 128자에서 잘림 → 토큰은 `-w "$(pbpaste)"` 로 저장. 시스템 사용자 추가 전 앱이 포트폴리오에 있어야 하고, 토큰 권한 목록은 앱을 시스템 사용자 자산으로 할당해야 뜸. 광고 계정 할당이 빠지면 #200 "Ad account owner has NOT grant".
