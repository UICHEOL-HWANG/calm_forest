-- metric: guardrails
-- definition: 1 − Q · (획득 − 사용) / 경제 활동 기기 · 실패 후 같은 세션에서 복구되지 않은 세션 수
-- grain: week × platform|all
-- source: SL|EC|GA4
-- caveats: save_load_failed는 9/14 배포부터 존재: 이전은 NULL; sid 없는 사건은 연결 불가; EC 기기 단위
-- Run after _filters.sql in the same BigQuery script (see run.py).
WITH ec AS (SELECT DATE_TRUNC(d,WEEK(MONDAY)) period,scope platform,population_variant variant,SUM(amount) net,COUNT(DISTINCT client_id) devices FROM metric_economy CROSS JOIN UNNEST([COALESCE(platform,'(none)'),'all']) scope WHERE d BETWEEN @start_date AND @end_date GROUP BY 1,2,3),
 recovery_context AS (SELECT user_pseudo_id,sid,LOGICAL_OR(event_name='save_load_recovered') recovered
 FROM ga_events WHERE sid IS NOT NULL AND user_pseudo_id IS NOT NULL GROUP BY 1,2),
 sessions AS (SELECT population_variant variant,user_pseudo_id,sid,
 MIN(d) d,ARRAY_AGG(platform ORDER BY event_at LIMIT 1)[OFFSET(0)] platform,
 LOGICAL_OR(event_name='save_load_failed') failed,LOGICAL_OR(COALESCE(r.recovered,FALSE)) recovered
 FROM metric_ga LEFT JOIN recovery_context r USING(user_pseudo_id,sid) WHERE sid IS NOT NULL AND user_pseudo_id IS NOT NULL GROUP BY 1,2,3),
 failures AS (SELECT DATE_TRUNC(d,WEEK(MONDAY)) period,scope platform,variant,COUNTIF(failed AND NOT recovered) n
 FROM sessions CROSS JOIN UNNEST([platform,'all']) scope WHERE d BETWEEN @start_date AND @end_date GROUP BY 1,2,3)
SELECT w.period,w.platform,w.variant,m.metric,m.value,m.numerator,m.denominator
FROM metric_weekly w LEFT JOIN ec USING(period,platform,variant) LEFT JOIN failures f USING(period,platform,variant)
CROSS JOIN UNNEST([
 STRUCT('empty_share' AS metric,SAFE_DIVIDE(empty_days,visit_days) AS value,CAST(empty_days AS FLOAT64) AS numerator,CAST(visit_days AS FLOAT64) AS denominator),
 STRUCT('net_coins_per_device',SAFE_DIVIDE(net,devices),CAST(net AS FLOAT64),CAST(devices AS FLOAT64)),
 STRUCT('unrecovered_save_sessions',IF(w.period<DATE '2026-09-14',NULL,CAST(COALESCE(f.n,0) AS FLOAT64)),IF(w.period<DATE '2026-09-14',NULL,CAST(COALESCE(f.n,0) AS FLOAT64)),1.0)]) m ORDER BY 1,2,3,4;
