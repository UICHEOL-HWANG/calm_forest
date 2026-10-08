-- metric: l2_new_kept_back
-- definition: 복귀 = 그 주 방문자 중 신규도 유지도 아닌 나머지 전부
-- grain: week × platform|all
-- source: SL
-- caveats: SL 이력이 8/6 부터라 8월 초 신규는 과대; 표본이 작음
-- Run after _filters.sql in the same BigQuery script (see run.py).
WITH weeks AS (SELECT DISTINCT variant,platform,person,period FROM metric_days),
 first AS (SELECT variant,platform,person,MIN(period) first_period FROM weeks GROUP BY 1,2,3),
 flags AS (SELECT w.*,f.first_period=w.period is_new,p.person IS NOT NULL is_kept
 FROM weeks w JOIN first f USING(variant,platform,person)
 LEFT JOIN weeks p ON p.variant=w.variant AND p.platform=w.platform AND p.person=w.person AND p.period=DATE_SUB(w.period,INTERVAL 7 DAY)),
 counts AS (SELECT period,platform,variant,COUNTIF(is_new) new_count,COUNTIF(is_kept) kept FROM flags GROUP BY 1,2,3)
SELECT w.period,w.platform,w.variant,m.metric,CAST(m.n AS FLOAT64) AS value,m.n numerator,1 denominator
FROM metric_weekly w LEFT JOIN counts c USING(period,platform,variant)
CROSS JOIN UNNEST([STRUCT('new' AS metric,COALESCE(new_count,0) AS n),STRUCT('kept',COALESCE(kept,0)),STRUCT('back',visitors-COALESCE(new_count,0)-COALESCE(kept,0))]) m ORDER BY 1,2,3,4;
