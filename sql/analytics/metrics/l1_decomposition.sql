-- metric: l1_decomposition
-- definition: 북극성 × 7 = 주간 방문 유저 수 × 1인당 방문일 × 방문일 중 획득 비율
-- grain: week × platform|all
-- source: SL
-- caveats: SL은 60초 미만 방문 누락; 키 통합으로 과거 값 재계산; 결과 이벤트 실패 미구분 (§8)
-- Run after _filters.sql in the same BigQuery script (see run.py).
SELECT period,platform,variant,m.metric, m.value,m.numerator,m.denominator,
 visitors * SAFE_DIVIDE(visit_days,visitors) * SAFE_DIVIDE(acquired_days,visit_days) reconstructed_acquired_days,
 acquired_days
FROM metric_weekly CROSS JOIN UNNEST([
 STRUCT('W' AS metric,CAST(visitors AS FLOAT64) AS value,CAST(visitors AS FLOAT64) AS numerator,1.0 AS denominator),
 STRUCT('F',SAFE_DIVIDE(visit_days,visitors),CAST(visit_days AS FLOAT64),CAST(visitors AS FLOAT64)),
 STRUCT('Q',SAFE_DIVIDE(acquired_days,visit_days),CAST(acquired_days AS FLOAT64),CAST(visit_days AS FLOAT64))]) m ORDER BY 1,2,3,4;
