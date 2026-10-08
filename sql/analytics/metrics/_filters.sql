-- metric: _filters
-- definition: 공식 = 페르소나·개발자 제외, 베타테스터는 베타 기간(9/9~9/15)만 제외 · 원본 = 필터 없음. 항상 나란히 표시
-- grain: week × platform|all
-- source: SL|EC|GA4
-- caveats: GA4 베타 배정 속성은 README 및 codex-questions.md 참조; raw는 플랫폼을 포함해 제외 필터 없음
-- Run after _filters.sql in the same BigQuery script (see run.py).
-- Parameters: @start_date, @end_date, @cohort_start, @cohort_end (DATE),
-- @persona_user_ids (ARRAY<STRING>, must be supplied; no production heuristic).
ASSERT @start_date<=@end_date AND EXTRACT(DAYOFWEEK FROM @start_date)=2 AND EXTRACT(DAYOFWEEK FROM @end_date)=1
 AS 'Weekly reports require complete Monday-Sunday weeks';
ASSERT @cohort_start<=@cohort_end AS 'Cohort dates must be ordered';
CREATE TEMP TABLE metric_actions AS SELECT action FROM UNNEST(['harvest_crop', 'coop_collect', 'honey_collect', 'fishing_catch', 'sea_catch', 'firefly_catch', 'forage_pick', 'mine_ore', 'craft_item', 'craft_claim', 'cooking_result', 'cafe_serve', 'carve_result', 'quest_complete', 'star_result', 'duel_result']) action;
CREATE TEMP TABLE latest_sessions AS
SELECT *, DATE(started_at, 'Asia/Seoul') d
FROM `calm-forest.calm_forest_raw.session_logs`
QUALIFY ROW_NUMBER() OVER(PARTITION BY session_id ORDER BY updated_at DESC)=1;
CREATE TEMP TABLE developer_devices AS
SELECT DISTINCT client_id FROM `calm-forest.calm_forest_raw.churn_events`
WHERE client_id IS NOT NULL AND (origin LIKE 'http://localhost%' OR origin LIKE 'http://127.0.0.1%');
CREATE TEMP TABLE developer_users AS
SELECT DISTINCT user_id FROM `calm-forest.calm_forest_raw.session_logs`
WHERE client_id IN (SELECT client_id FROM developer_devices) AND user_id IS NOT NULL;
CREATE TEMP TABLE metric_sessions AS
WITH population AS (
 SELECT s.*, v AS population_variant FROM latest_sessions s CROSS JOIN UNNEST(['official','raw']) v
 WHERE v='raw' OR (platform IN ('web','toss')
 AND NOT EXISTS(SELECT 1 FROM UNNEST(@persona_user_ids) p WHERE p=s.user_id)
 AND NOT EXISTS(SELECT 1 FROM developer_devices x WHERE x.client_id=s.client_id)
 AND NOT (COALESCE(variant,'') IN ('beta_A','beta_B') AND d BETWEEN '2026-09-09' AND '2026-09-15'))
), accounts AS (
 SELECT population_variant, client_id, COUNT(DISTINCT user_id) AS n, MIN(user_id) account
 FROM population WHERE is_guest=FALSE AND user_id IS NOT NULL GROUP BY 1,2
)
SELECT p.*, CASE WHEN is_guest=FALSE AND user_id IS NOT NULL THEN CONCAT('u:',user_id)
 WHEN a.n=1 THEN CONCAT('u:',a.account) ELSE CONCAT('c:',p.client_id) END person,
 (COALESCE(SAFE_CAST(JSON_VALUE(counts, '$.harvest_crop') AS FLOAT64), 0) > 0 OR COALESCE(SAFE_CAST(JSON_VALUE(counts, '$.coop_collect') AS FLOAT64), 0) > 0 OR COALESCE(SAFE_CAST(JSON_VALUE(counts, '$.honey_collect') AS FLOAT64), 0) > 0) farm, (COALESCE(SAFE_CAST(JSON_VALUE(counts, '$.fishing_catch') AS FLOAT64), 0) > 0 OR COALESCE(SAFE_CAST(JSON_VALUE(counts, '$.sea_catch') AS FLOAT64), 0) > 0 OR COALESCE(SAFE_CAST(JSON_VALUE(counts, '$.firefly_catch') AS FLOAT64), 0) > 0 OR COALESCE(SAFE_CAST(JSON_VALUE(counts, '$.forage_pick') AS FLOAT64), 0) > 0 OR COALESCE(SAFE_CAST(JSON_VALUE(counts, '$.mine_ore') AS FLOAT64), 0) > 0) catch, (COALESCE(SAFE_CAST(JSON_VALUE(counts, '$.craft_item') AS FLOAT64), 0) > 0 OR COALESCE(SAFE_CAST(JSON_VALUE(counts, '$.craft_claim') AS FLOAT64), 0) > 0 OR COALESCE(SAFE_CAST(JSON_VALUE(counts, '$.cooking_result') AS FLOAT64), 0) > 0 OR COALESCE(SAFE_CAST(JSON_VALUE(counts, '$.cafe_serve') AS FLOAT64), 0) > 0 OR COALESCE(SAFE_CAST(JSON_VALUE(counts, '$.carve_result') AS FLOAT64), 0) > 0) make, (COALESCE(SAFE_CAST(JSON_VALUE(counts, '$.quest_complete') AS FLOAT64), 0) > 0 OR COALESCE(SAFE_CAST(JSON_VALUE(counts, '$.star_result') AS FLOAT64), 0) > 0 OR COALESCE(SAFE_CAST(JSON_VALUE(counts, '$.duel_result') AS FLOAT64), 0) > 0) village
FROM population p LEFT JOIN accounts a USING(population_variant,client_id);
-- Platform rollups are rebuilt at person/day grain: all never sums platform counts.
CREATE TEMP TABLE metric_days AS
SELECT population_variant variant, scope platform, person, d,
 DATE_TRUNC(d,WEEK(MONDAY)) period,
 LOGICAL_OR(farm) farm, LOGICAL_OR(catch) catch,
 LOGICAL_OR(make) make, LOGICAL_OR(village) village,
 LOGICAL_OR(farm OR catch OR make OR village) acquired,
 ARRAY_AGG(STRUCT(last_place) ORDER BY started_at DESC,updated_at DESC,session_id DESC LIMIT 1)[OFFSET(0)].last_place last_place
FROM metric_sessions CROSS JOIN UNNEST([COALESCE(platform,'(none)'), 'all']) scope
GROUP BY 1,2,3,4;
CREATE TEMP TABLE metric_calendar AS
SELECT d period FROM UNNEST(GENERATE_DATE_ARRAY(DATE_TRUNC(@start_date,WEEK(MONDAY)),DATE_TRUNC(@end_date,WEEK(MONDAY)),INTERVAL 7 DAY)) d;
CREATE TEMP TABLE metric_scopes AS
SELECT variant,platform FROM UNNEST(['official','raw']) variant CROSS JOIN UNNEST(['all','web','toss']) platform
UNION DISTINCT SELECT DISTINCT variant,platform FROM metric_days;
CREATE TEMP TABLE metric_weekly AS
SELECT c.period,s.platform,s.variant,COUNT(DISTINCT d.person) visitors,COUNT(d.person) visit_days,
 COUNTIF(d.acquired) acquired_days,COUNTIF(NOT d.acquired) empty_days
FROM metric_calendar c CROSS JOIN metric_scopes s
LEFT JOIN metric_days d ON d.period=c.period AND d.platform=s.platform AND d.variant=s.variant
 AND d.d BETWEEN @start_date AND @end_date GROUP BY 1,2,3;
CREATE TEMP TABLE metric_economy AS
SELECT e.*, DATE(created_at,'Asia/Seoul') d, v population_variant
FROM `calm-forest.calm_forest_raw.econ_logs` e CROSS JOIN UNNEST(['official','raw']) v
WHERE v='raw' OR (platform IN ('web','toss')
 AND NOT EXISTS(SELECT 1 FROM UNNEST(@persona_user_ids) p WHERE p=e.user_id)
 AND NOT EXISTS(SELECT 1 FROM developer_devices x WHERE x.client_id=e.client_id)
 AND NOT (COALESCE(e.variant,'') IN ('beta_A','beta_B')
 AND DATE(e.created_at,'Asia/Seoul') BETWEEN '2026-09-09' AND '2026-09-15'));
CREATE TEMP TABLE ga_events AS
SELECT user_pseudo_id,user_id,event_name,TIMESTAMP_MICROS(event_timestamp) event_at,
 DATE(TIMESTAMP_MICROS(event_timestamp),'Asia/Seoul') d,
 NULLIF((SELECT value.string_value FROM UNNEST(user_properties) WHERE key='platform'),'') platform_property,
 COALESCE(NULLIF((SELECT value.string_value FROM UNNEST(user_properties) WHERE key='platform'),''),'web') platform,
 COALESCE((SELECT value.string_value FROM UNNEST(user_properties) WHERE key='ab_variant'),(SELECT value.string_value FROM UNNEST(event_params) WHERE key='variant')) experiment_variant,
 (SELECT value.int_value FROM UNNEST(event_params) WHERE key='ga_session_id') sid
FROM `calm-forest.analytics_547127440.events_*`
WHERE REGEXP_CONTAINS(_TABLE_SUFFIX,r'^\d{8}$');
CREATE TEMP TABLE ga_excluded_devices AS
SELECT DISTINCT user_pseudo_id FROM ga_events e
WHERE user_id IN UNNEST(@persona_user_ids) OR user_id IN (SELECT user_id FROM developer_users);
-- Beta is a session exclusion. Properties may appear only on later events:
-- propagate a known beta tag to that device/session/day, never to other dates.
CREATE TEMP TABLE ga_beta_sessions AS
SELECT DISTINCT user_pseudo_id,sid,d FROM ga_events
WHERE experiment_variant IN ('beta_A','beta_B')
AND d BETWEEN '2026-09-09' AND '2026-09-15' AND sid IS NOT NULL;
CREATE TEMP TABLE metric_ga AS
SELECT e.*,v population_variant FROM ga_events e CROSS JOIN UNNEST(['official','raw']) v
WHERE v='raw' OR (platform IN ('web','toss')
 AND NOT EXISTS(SELECT 1 FROM ga_excluded_devices x WHERE x.user_pseudo_id=e.user_pseudo_id)
 AND NOT (COALESCE(experiment_variant,'') IN ('beta_A','beta_B') AND d BETWEEN '2026-09-09' AND '2026-09-15')
 AND NOT EXISTS(SELECT 1 FROM ga_beta_sessions b WHERE b.user_pseudo_id=e.user_pseudo_id AND b.sid=e.sid AND b.d=e.d));
