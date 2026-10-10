# 관리자 대시보드 v2 — 계획

**승인** 2026-10-10 (사용자: "ㄱㄱ, 7,30,60까지") · 시안 A(리포트형) 확정 — 아티팩트 https://claude.ai/artifact/BMRKpVBoguR5RUhWpUCHCK

## 왜
1. Supabase 로그 3종(game_logs·session_logs·econ_logs)은 매일 03:00 KST 에 7일 지난 행이 지워진다
   (`ml/scripts/export_to_bq.py` prune). 지금 RPC 는 30·90일을 눌러도 7일치로 계산하고, 10/3 이전 유저를
   신규로 오인하며, D7·코호트·14일 이탈 퍼널은 분모가 틀린다.
2. 게임 분석가용 구성(북극성·첫 주 퍼널·리텐션 곡선·DAU 구성)으로 바꾼다.
3. 관리자 페이지가 흩어져 있다 → 허브. A/B 실험은 실험마다 따로 → 실험 페이지.

## 단계
1. **롤업 테이블** (`sql/migrations/migrate_admin_rollup.sql`)
   - `cf_sessions` 세션 1행: uid·user_id·is_guest·platform·variant·day(KST, 시작)·start_ts·dur_sec·play_sec·last_place·counts·acq·persona
   - `cf_heat_day` (day, map, gx, gz, hits) — map = main/dream/mirror (월드 좌표로 판정, 로컬 좌표 2칸 격자)
   - `cf_econ_day` (day, source, tx, inflow, outflow)
   - `cf_rollup(from_day, to_day)` security definer · upsert · 원본이 온전한 날만 받는다
2. **매일 롤업**: export_to_bq.py 가 prune 직전에 `cf_rollup(today-5, today)` 호출. 실패하면 prune 건너뜀
   (안 말린 원본은 절대 안 지운다). 대시보드 RPC 도 열 때 `cf_rollup(today-1, today)` 로 오늘치를 신선하게.
3. **백필**: BQ 원본(7/27~10/3 KST)을 같은 정의로 집계 → 풀러로 upsert. 10/4~ 는 Supabase 원본에서 롤업.
4. **RPC** `cf_admin_dashboard(days, token)` — 7/30/60. 북극성(7일 평균)·KPI(직전 기간 대비)·첫 주 퍼널
   (7일 관측 완료 코호트)·D0~D30 곡선(첫날 획득 여부 — look-ahead 편향 회피)·주간 코호트×D1/3/7/14/30·
   DAU 구성(신규/연속/재활성/이탈)·시간대·세션 길이·맵별 밀도·경제·진행도·유저 관찰·세그먼트.
   페르소나 제외(서버에서 이메일 접두어로 판정, 롤업 때 플래그 고정).
5. **화면** `dashboards/admin_analytics.html` 를 A안으로 재작성 + 캐릭터(`dashboards/img/chars/*.png`) + "분석 중" 로딩.
6. **허브** `dashboards/index.html` — 애널리틱스 · 실험 · 소식함/이웃 마을 · 보관(베타 관제).
7. **실험 페이지** — 별도 시안 비교 후(사용자 규칙: 디자인은 시안 3개).
8. 검증(셀프테스트 DO 블록·브라우저 실측)·리뷰·키 스캔 → main 병합 → 웹 배포(wrangler).

## 범위 밖
- 플레이어용 `dashboards/analytics.html` (게임에서 여는 개인 페이지) — 손대지 않음
- 개발자 기기 제외 — 원천(churn_events.origin)이 BQ 에만 있어 Supabase 에서 판정 불가. 메타에 한계로 표기
