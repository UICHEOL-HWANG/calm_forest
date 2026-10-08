-- metric: checks/shadow_ga4
-- definition: 로그인 계정 기준 SL↔GA4 획득한 (유저×날) 일치율이 95% 미만 2주 연속이면 계측 점검
-- grain: week × platform|all
-- source: SL|GA4
-- caveats: GA4는 게스트 로그인 여부를 몰라 혼합 키 복원 불가; 일치율 분모는 GA4 로그인 계정 획득한 날
-- Run after _filters.sql in the same BigQuery script (see run.py).
WITH ga_days AS (SELECT population_variant variant,scope platform,d,
 IF(user_id IN (SELECT user_id FROM metric_sessions WHERE is_guest=FALSE AND user_id IS NOT NULL AND population_variant=metric_ga.population_variant),CONCAT('u:',user_id),CONCAT('g:',user_pseudo_id)) person,
 user_id FROM metric_ga CROSS JOIN UNNEST([platform,'all']) scope
 WHERE event_name IN (SELECT action FROM metric_actions) AND d BETWEEN @start_date AND @end_date GROUP BY 1,2,3,4,5),
 shadow AS (SELECT DATE_TRUNC(d,WEEK(MONDAY)) period,platform,variant,COUNT(*) n FROM (SELECT DISTINCT variant,platform,d,person FROM ga_days) GROUP BY 1,2,3),
 sl_logged AS (SELECT DISTINCT population_variant variant,scope platform,d,user_id
 FROM metric_sessions CROSS JOIN UNNEST([COALESCE(platform,'(none)'),'all']) scope
 WHERE is_guest=FALSE AND user_id IS NOT NULL AND (farm OR catch OR make OR village)),
 ga_logged AS (SELECT g.* FROM ga_days g WHERE user_id IN (SELECT user_id FROM metric_sessions WHERE is_guest=FALSE AND user_id IS NOT NULL AND population_variant=g.variant)),
 agreement AS (SELECT DATE_TRUNC(g.d,WEEK(MONDAY)) period,g.platform,g.variant,COUNT(*) AS denominator,COUNTIF(s.user_id IS NOT NULL) numerator FROM ga_logged g LEFT JOIN sl_logged s USING(variant,platform,d,user_id) GROUP BY 1,2,3),
 rates AS (SELECT w.period,w.platform,w.variant,COALESCE(sh.n,0) shadow_days,COALESCE(a.numerator,0) matched,COALESCE(a.denominator,0) ga_logged_days,SAFE_DIVIDE(a.numerator,a.denominator) rate FROM metric_weekly w LEFT JOIN shadow sh USING(period,platform,variant) LEFT JOIN agreement a USING(period,platform,variant))
SELECT period,platform,variant,m.metric,m.value,m.numerator,m.denominator,
 alert_two_weeks
FROM (SELECT *,rate<0.95 AND LAG(rate<0.95) OVER(PARTITION BY platform,variant ORDER BY period) alert_two_weeks FROM rates) CROSS JOIN UNNEST([
 STRUCT('ga4_shadow_daily_hcc' AS metric,shadow_days/7.0 AS value,shadow_days AS numerator,7 AS denominator),
 STRUCT('logged_account_agreement',rate,matched,ga_logged_days)]) m
ORDER BY 1,2,3,4;
