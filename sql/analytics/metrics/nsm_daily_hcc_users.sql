-- metric: nsm_daily_hcc_users
-- definition: 지난 7일 동안 "획득한 하루"를 보낸 (유저 × 날)의 수 ÷ 7
-- grain: week × platform|all
-- source: SL
-- caveats: SL은 60초 미만 방문 누락; 키 통합으로 과거 값 재계산; 결과 이벤트 실패 미구분 (§8)
-- Run after _filters.sql in the same BigQuery script (see run.py).
SELECT period,platform,variant,acquired_days/7.0 AS value,acquired_days numerator,7 denominator FROM metric_weekly ORDER BY 1,2,3;
