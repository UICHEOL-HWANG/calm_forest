-- metric: l2_habit_gap
-- definition: 주 4일 이상 방문 유저 / W · 연속 방문일 사이 일수
-- grain: week × platform|all
-- source: SL
-- caveats: 한 번만 온 사람은 간격이 없다 (생존 편향); 중앙값 numerator는 중앙값이고 denominator는 간격 표본 수
-- Run after _filters.sql in the same BigQuery script (see run.py).
WITH per AS (SELECT variant,platform,period,person,COUNT(*) days FROM metric_days WHERE d BETWEEN @start_date AND @end_date GROUP BY 1,2,3,4),
 habit AS (SELECT variant,platform,period,COUNTIF(days>=4) n FROM per GROUP BY 1,2,3),
 gaps AS (SELECT variant,platform,period,DATE_DIFF(d,LAG(d) OVER(PARTITION BY variant,platform,person ORDER BY d),DAY) gap
 FROM metric_days WHERE d BETWEEN @start_date AND @end_date),
 gap_summary AS (SELECT variant,platform,period,COUNT(gap) AS n,COUNTIF(gap=1) next_day,
 ANY_VALUE(median) median FROM (SELECT *,PERCENTILE_CONT(gap,0.5) OVER(PARTITION BY variant,platform,period) median FROM gaps) GROUP BY 1,2,3)
SELECT w.period,w.platform,w.variant,m.metric,m.value,m.numerator,m.denominator
FROM metric_weekly w LEFT JOIN habit h USING(variant,platform,period) LEFT JOIN gap_summary g USING(variant,platform,period)
CROSS JOIN UNNEST([
 STRUCT('habit_share' AS metric,SAFE_DIVIDE(COALESCE(h.n,0),visitors) AS value,CAST(COALESCE(h.n,0) AS FLOAT64) AS numerator,CAST(visitors AS FLOAT64) AS denominator),
 STRUCT('visit_gap_median_days',g.median,g.median,CAST(g.n AS FLOAT64)),
 STRUCT('next_day_share',SAFE_DIVIDE(g.next_day,g.n),CAST(g.next_day AS FLOAT64),CAST(g.n AS FLOAT64))]) m ORDER BY 1,2,3,4;
