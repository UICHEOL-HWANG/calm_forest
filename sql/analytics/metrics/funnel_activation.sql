-- metric: funnel_activation
-- definition: 방문 중 user_id 생긴 기기 · 진입 중 character_select · 진입 중 7일 안에 획득 행동 1회 이상
-- grain: cohort_week × platform|all
-- source: GA4
-- caveats: 기기 단위; 다른 기기에서 만든 사람은 캐릭터 선택 없이 획득 가능; 첫 7일 내 처음 기록된 비어 있지 않은 플랫폼으로 귀속; 확인 질문 참조
-- Run after _filters.sql in the same BigQuery script (see run.py).
WITH first AS (SELECT user_pseudo_id,MIN(d) d0 FROM ga_events WHERE event_name='first_visit' AND user_pseudo_id IS NOT NULL GROUP BY 1 HAVING d0 BETWEEN @cohort_start AND @cohort_end),
 cohort_platform AS (SELECT f.user_pseudo_id,f.d0,
 COALESCE(ARRAY_AGG(e.platform_property IGNORE NULLS ORDER BY e.event_at,e.platform_property LIMIT 1)[SAFE_OFFSET(0)],'web') platform
 FROM first f JOIN ga_events e ON e.user_pseudo_id=f.user_pseudo_id
 AND e.d BETWEEN f.d0 AND DATE_ADD(f.d0,INTERVAL 6 DAY)
 GROUP BY 1,2),
 cohort AS (SELECT f.user_pseudo_id,f.d0,e.population_variant variant,f.platform,
 LOGICAL_OR(e.user_id IS NOT NULL) entered,LOGICAL_OR(e.event_name='character_select') onboarded,
 LOGICAL_OR(e.event_name IN (SELECT action FROM metric_actions)) activated
 FROM cohort_platform f JOIN metric_ga e USING(user_pseudo_id) WHERE e.d BETWEEN f.d0 AND DATE_ADD(f.d0,INTERVAL 6 DAY) AND (e.population_variant='raw' OR f.platform IN ('web','toss')) GROUP BY 1,2,3,4),
 counts AS (SELECT DATE_TRUNC(d0,WEEK(MONDAY)) period,scope platform,variant,COUNT(*) visits,COUNTIF(entered) entered,COUNTIF(entered AND onboarded) onboarded,COUNTIF(entered AND activated) activated
 FROM cohort CROSS JOIN UNNEST([platform,'all']) scope GROUP BY 1,2,3)
SELECT period,platform,variant,m.metric,m.value,m.numerator,m.denominator FROM counts
CROSS JOIN UNNEST([
 STRUCT('visits' AS metric,CAST(visits AS FLOAT64) AS value,visits AS numerator,1 AS denominator),
 STRUCT('entry_share',SAFE_DIVIDE(entered,visits),entered,visits),
 STRUCT('character_select_share',SAFE_DIVIDE(onboarded,entered),onboarded,entered),
 STRUCT('first_acquisition_share',SAFE_DIVIDE(activated,entered),activated,entered)]) m ORDER BY 1,2,3,4;
