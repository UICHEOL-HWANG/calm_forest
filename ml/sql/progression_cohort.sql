-- Canonical cohort for the 2026-10-24..11-05 progression study.
-- Existing churn_sample.sql serves a different, session-level predictive task.
-- Parameters: excluded_accounts, cohort_start, cohort_end, observation_end.
WITH sessions AS (
 SELECT * FROM `calm-forest.calm_forest_raw.session_logs`
 WHERE started_at < TIMESTAMP(DATE_ADD(@observation_end, INTERVAL 1 DAY),'Asia/Seoul')
 QUALIFY ROW_NUMBER() OVER(PARTITION BY session_id ORDER BY updated_at DESC)=1
),
points AS (
 SELECT client_id,user_id,platform,MIN(created_at) AS entered_at
 FROM `calm-forest.calm_forest_raw.game_logs`
 WHERE created_at < TIMESTAMP(DATE_ADD(@observation_end, INTERVAL 1 DAY),'Asia/Seoul')
 GROUP BY client_id,user_id,platform
),
entry_evidence AS (
 SELECT client_id,user_id,platform,started_at AS entered_at FROM sessions
 UNION ALL
 SELECT client_id,user_id,platform,entered_at FROM points
),
raw_devices AS (
 SELECT client_id,MIN(entered_at) AS first_entry,
 ARRAY_AGG(STRUCT(platform,entered_at) ORDER BY entered_at,platform LIMIT 1)[OFFSET(0)].platform AS platform,
 LOGICAL_OR(IFNULL(user_id IN UNNEST(@excluded_accounts),FALSE)) AS excluded
 FROM entry_evidence WHERE NULLIF(client_id,'') IS NOT NULL GROUP BY client_id
),
raw_ids AS (
 SELECT DISTINCT client_id,user_id FROM entry_evidence
 WHERE NULLIF(client_id,'') IS NOT NULL AND user_id IS NOT NULL
),
ga AS (
 SELECT user_pseudo_id,user_id,event_name,event_timestamp,event_params,user_properties,
 DATE(TIMESTAMP_MICROS(event_timestamp),'Asia/Seoul') AS event_day,
 COALESCE((SELECT value.string_value FROM UNNEST(event_params) WHERE key='platform'),
 (SELECT value.string_value FROM UNNEST(user_properties) WHERE key='platform')) AS platform,
 traffic_source.source AS first_source,traffic_source.medium AS first_medium,
 (SELECT value.int_value FROM UNNEST(event_params) WHERE key='ga_session_id') AS sid
 FROM `calm-forest.analytics_547127440.events_*`
 WHERE _TABLE_SUFFIX BETWEEN '20260727' AND FORMAT_DATE('%Y%m%d',@observation_end)
 AND TIMESTAMP_MICROS(event_timestamp)<TIMESTAMP(DATE_ADD(@observation_end,INTERVAL 1 DAY),'Asia/Seoul')
),
link_pairs AS (
 SELECT DISTINCT g.user_pseudo_id,r.client_id
 FROM (SELECT DISTINCT user_pseudo_id,user_id FROM ga WHERE user_id IS NOT NULL) g
 JOIN raw_ids r USING(user_id)
 UNION DISTINCT
 SELECT DISTINCT user_pseudo_id,client_id FROM ga JOIN raw_devices ON user_pseudo_id=client_id
),
link_status AS (
 SELECT user_pseudo_id,COUNT(DISTINCT client_id) AS n_clients,MIN(client_id) AS client_id
 FROM link_pairs GROUP BY user_pseudo_id
),
safe_links AS (
 SELECT user_pseudo_id,client_id FROM link_status WHERE n_clients=1
),
cohort_candidates AS (
 SELECT *,DATE(first_entry,'Asia/Seoul') AS d0
 FROM raw_devices
 WHERE DATE(first_entry,'Asia/Seoul') BETWEEN @cohort_start AND @cohort_end
),
known_returning AS (
 SELECT DISTINCT r.client_id
 FROM raw_ids r
 JOIN raw_devices d ON d.client_id=r.client_id
 JOIN raw_ids r2 ON r2.user_id=r.user_id AND r2.client_id!=r.client_id
 JOIN raw_devices d2 ON d2.client_id=r2.client_id
 WHERE d2.first_entry<d.first_entry
),
cohort AS (
 SELECT * FROM cohort_candidates
 WHERE NOT excluded AND client_id NOT IN (SELECT client_id FROM known_returning)
),
cohort_ga AS (
 SELECT c.client_id,c.d0,g.*
 FROM cohort c JOIN safe_links l USING(client_id) JOIN ga g USING(user_pseudo_id)
),
first_day_ga AS (
 SELECT * FROM cohort_ga WHERE event_day=d0
)
