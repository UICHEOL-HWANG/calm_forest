-- Diagnostic, not a published metric: isolate definition/reference differences.
-- Run after _filters.sql. Only aggregate stage rows are returned.
WITH econ_stages AS (
 SELECT e.*,stage FROM `calm-forest.calm_forest_raw.econ_logs` e
 CROSS JOIN UNNEST(['reference','developer_only','beta_only','official']) stage
 WHERE platform IN ('web','toss') AND DATE(created_at,'Asia/Seoul') BETWEEN @start_date AND @end_date
 AND NOT EXISTS(SELECT 1 FROM UNNEST(@persona_user_ids) p WHERE p=e.user_id)
 AND (stage NOT IN ('developer_only','official') OR NOT EXISTS(SELECT 1 FROM developer_devices x WHERE x.client_id=e.client_id))
 AND (stage NOT IN ('beta_only','official') OR NOT (COALESCE(variant,'') IN ('beta_A','beta_B') AND DATE(created_at,'Asia/Seoul') BETWEEN '2026-09-09' AND '2026-09-15'))
), econ_counts AS (
 SELECT DATE_TRUNC(DATE(created_at,'Asia/Seoul'),WEEK(MONDAY)) period,stage,
 SUM(amount) net,COUNT(DISTINCT client_id) devices,COUNT(DISTINCT IF(amount<0,client_id,NULL)) spenders
 FROM econ_stages GROUP BY 1,2
), first AS (
 SELECT user_pseudo_id,MIN(d) d0 FROM ga_events WHERE event_name='first_visit' AND user_pseudo_id IS NOT NULL
 GROUP BY 1 HAVING d0 BETWEEN @cohort_start AND @cohort_end
), cohort_platform AS (
 SELECT f.user_pseudo_id,f.d0,
 COALESCE(ARRAY_AGG(e.platform_property IGNORE NULLS ORDER BY e.event_at,e.platform_property LIMIT 1)[SAFE_OFFSET(0)],'web') platform
 FROM first f JOIN ga_events e ON e.user_pseudo_id=f.user_pseudo_id AND e.d BETWEEN f.d0 AND DATE_ADD(f.d0,INTERVAL 6 DAY)
 GROUP BY 1,2
), funnel_stages AS (
 SELECT e.* EXCEPT(experiment_variant), 'reference' stage FROM ga_events e
 WHERE e.platform IN ('web','toss') AND NOT EXISTS(SELECT 1 FROM ga_excluded_devices x WHERE x.user_pseudo_id=e.user_pseudo_id)
 UNION ALL
 SELECT e.* EXCEPT(population_variant,experiment_variant),'official' stage FROM metric_ga e WHERE population_variant='official'
), per_device AS (
 SELECT f.user_pseudo_id,f.d0,f.platform,e.stage,
 LOGICAL_OR(e.user_id IS NOT NULL) entered,LOGICAL_OR(e.event_name='character_select') onboarded,
 LOGICAL_OR(e.event_name IN (SELECT action FROM metric_actions)) acquired
 FROM cohort_platform f JOIN funnel_stages e USING(user_pseudo_id)
 WHERE f.platform IN ('web','toss') AND e.d BETWEEN f.d0 AND DATE_ADD(f.d0,INTERVAL 6 DAY) GROUP BY 1,2,3,4
), funnels AS (
 SELECT stage,scope platform,COUNT(*) visits,COUNTIF(entered) entered,
 COUNTIF(entered AND onboarded) onboarded,COUNTIF(entered AND acquired) acquired
 FROM per_device CROSS JOIN UNNEST([platform,'all']) scope GROUP BY 1,2
)
SELECT period,'all' platform,stage,m.metric,m.value,m.numerator,m.denominator
FROM econ_counts CROSS JOIN UNNEST([
 STRUCT('net_coins_per_device' AS metric,SAFE_DIVIDE(net,devices) AS value,CAST(net AS FLOAT64) AS numerator,CAST(devices AS FLOAT64) AS denominator),
 STRUCT('spender_share',SAFE_DIVIDE(spenders,devices),CAST(spenders AS FLOAT64),CAST(devices AS FLOAT64))]) m
UNION ALL
SELECT @cohort_start,platform,stage,m.metric,CAST(m.n AS FLOAT64),CAST(m.n AS FLOAT64),1.0
FROM funnels CROSS JOIN UNNEST([
 STRUCT('visits' AS metric,visits AS n),STRUCT('entered',entered),STRUCT('onboarded',onboarded),STRUCT('acquired',acquired)]) m
ORDER BY metric,period,platform,stage;
