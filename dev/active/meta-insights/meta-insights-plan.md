# Meta Marketing API → ads_funnel_daily (2단계)

Goal: 기록 시트 2_일별깔때기 C:G(비용·노출·도달·클릭·랜딩페이지조회)를 손 대신 DAG 가 채운다. 소재별 일별 수치는 BQ ads.meta_insights + 시트 _auto_meta_ad 탭.

## 결정
- MCP 대신 Graph API 직접 호출. 광고 계정(Variable meta_ad_account_id)은 MCP 롤아웃 대기라 막혀 있음(2026-10-25 확인).
- 인증: 비즈니스 포트폴리오 calmforest.official 의 시스템 사용자 토큰(ads_read). VM 파일 /opt/airflow/secrets/meta_ads_token. 코드·리포에 넣지 않음.
- 호출: GET /{ver}/act_{id}/insights level=ad · time_increment=1 · time_range=캠페인 시작~GA4 latest · paging.next 따라감.
- 매 실행 기간 전체를 다시 받아 ads.meta_insights 를 WRITE_TRUNCATE (어트리뷰션 늦은 갱신 흡수, 무료 티어 DML 불가와도 맞음).
- 클릭 = inline_link_clicks(링크 클릭). 랜딩페이지조회 = actions[landing_page_view].
- 토큰 없으면 extract 는 skip, publish 는 C:G 를 건드리지 않음 → 지금 DAG 동작 유지.
- 시트 C:G 는 캠페인(B열) 하루 합계. 도달은 광고 합산이라 중복 포함(근사) — 시트 메모로 남김.

## 단계
1. 순수 함수 TDD: parse_insights · daily_totals · meta_updates
2. fetch(urllib, 페이징·오류) · _extract 태스크 · BQ 적재
3. publish 에 C:G + _auto_meta_ad 탭
4. 사용자 토큰 발급 → VM 비밀 파일 → 수동 트리거 검증 → 광고 관리자 숫자 대조
