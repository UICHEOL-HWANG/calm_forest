-- metric: revenue_lead
-- definition: 코인 사용 기기 / 경제 활동 기기
-- grain: week × platform|all
-- source: EC
-- caveats: 기기 단위; 공통 필터 적용; 정답지의 EC 필터 누락은 질문 문서 참조
-- Run after _filters.sql in the same BigQuery script (see run.py).
WITH ec AS (SELECT DATE_TRUNC(d,WEEK(MONDAY)) period,scope platform,population_variant variant,COUNT(DISTINCT client_id) devices,COUNT(DISTINCT IF(amount<0,client_id,NULL)) spenders
FROM metric_economy CROSS JOIN UNNEST([COALESCE(platform,'(none)'),'all']) scope WHERE d BETWEEN @start_date AND @end_date GROUP BY 1,2,3)
SELECT w.period,w.platform,w.variant,SAFE_DIVIDE(COALESCE(spenders,0),COALESCE(devices,0)) AS value,COALESCE(spenders,0) AS numerator,COALESCE(devices,0) denominator FROM metric_weekly w LEFT JOIN ec USING(period,platform,variant) ORDER BY 1,2,3;
