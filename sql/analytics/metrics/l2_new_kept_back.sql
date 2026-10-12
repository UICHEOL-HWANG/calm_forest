-- metric: l2_new_kept_back
-- definition: 복귀 = 그 주 방문자 중 신규도 유지도 아닌 나머지 전부
-- grain: week × platform|all
-- source: SL
-- caveats: SL 이력이 8/6 부터라 8월 초 신규는 과대; 표본이 작음; 플랫폼별 행도 게임 전체 이력 기준 (Q5); beta 변형은 베타 세션만이라 신규·유지 의미 약함
-- Run after _filters.sql in the same BigQuery script (see run.py).
-- Q5 (2026-10-12): platform rows use game-wide history — a person who only switched platform is not new.
WITH weeks AS (SELECT DISTINCT variant,platform,person,period FROM metric_days),
 game AS (SELECT DISTINCT variant,person,period FROM metric_days WHERE platform='all'),
 first AS (SELECT variant,person,MIN(period) first_period FROM game GROUP BY 1,2),
 flags AS (SELECT w.*,f.first_period=w.period is_new,p.person IS NOT NULL is_kept
 FROM weeks w JOIN first f USING(variant,person)
 LEFT JOIN game p ON p.variant=w.variant AND p.person=w.person AND p.period=DATE_SUB(w.period,INTERVAL 7 DAY)),
 counts AS (SELECT period,platform,variant,COUNTIF(is_new) new_count,COUNTIF(is_kept) kept FROM flags GROUP BY 1,2,3)
SELECT w.period,w.platform,w.variant,m.metric,CAST(m.n AS FLOAT64) AS value,m.n numerator,1 denominator
FROM metric_weekly w LEFT JOIN counts c USING(period,platform,variant)
CROSS JOIN UNNEST([STRUCT('new' AS metric,COALESCE(new_count,0) AS n),STRUCT('kept',COALESCE(kept,0)),STRUCT('back',visitors-COALESCE(new_count,0)-COALESCE(kept,0))]) m ORDER BY 1,2,3,4;
