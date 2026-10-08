-- metric: l2_quality_detail
-- definition: 획득한 날 중 그 분야 행동이 있는 비율 · 획득 0 인 방문일의 last_place
-- grain: week × platform|all
-- source: SL
-- caveats: 하루에 여러 분야 가능 (합 > 100%); last_place는 마지막 60초 주기 스냅샷
-- Run after _filters.sql in the same BigQuery script (see run.py).
SELECT w.period,w.platform,w.variant,m.metric,SAFE_DIVIDE(m.n,w.acquired_days) AS value,m.n numerator,w.acquired_days denominator
FROM metric_weekly w LEFT JOIN (SELECT period,platform,variant,COUNTIF(acquired AND farm) farm,COUNTIF(acquired AND catch) catch,COUNTIF(acquired AND make) make,COUNTIF(acquired AND village) village FROM metric_days WHERE d BETWEEN @start_date AND @end_date GROUP BY 1,2,3) c USING(period,platform,variant)
CROSS JOIN UNNEST([STRUCT('farm' AS metric,COALESCE(farm,0) AS n),STRUCT('catch',COALESCE(catch,0)),STRUCT('make',COALESCE(make,0)),STRUCT('village',COALESCE(village,0))]) m
UNION ALL
SELECT d.period,d.platform,d.variant,CONCAT('empty_last_place:',COALESCE(d.last_place,'(none)')),SAFE_DIVIDE(COUNT(*),ANY_VALUE(w.empty_days)),COUNT(*),ANY_VALUE(w.empty_days)
FROM metric_days d JOIN metric_weekly w USING(period,platform,variant) WHERE NOT acquired AND d.d BETWEEN @start_date AND @end_date GROUP BY 1,2,3,4 ORDER BY 1,2,3,4;
