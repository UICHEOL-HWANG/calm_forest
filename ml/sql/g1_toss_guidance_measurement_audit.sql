-- G1: can existing Toss GA4 logs measure an optional area recommendation?
-- Toss = event parameter platform='toss', not acquisition source.
-- Window: complete GA4 daily exports 2026-09-04..09-12 KST.
-- Exclude beta_A/B-marked rows; prior audit found zero marked Toss rows.
-- Only aggregate event/parameter coverage; no identifiers leave the query.
WITH base AS (
  SELECT
    user_pseudo_id,
    event_name,
    event_params,
    (SELECT ep.value.string_value FROM UNNEST(event_params) ep
      WHERE ep.key = 'platform' LIMIT 1) AS platform,
    (SELECT up.value.string_value FROM UNNEST(user_properties) up
      WHERE up.key = 'ab_variant' LIMIT 1) AS ab_variant
  FROM `calm-forest.analytics_547127440.events_*`
  WHERE _TABLE_SUFFIX NOT LIKE 'intraday_%'
    AND user_pseudo_id IS NOT NULL
    AND DATE(TIMESTAMP_MICROS(event_timestamp), 'Asia/Seoul')
        BETWEEN DATE '2026-09-04' AND DATE '2026-09-12'
),
toss AS (
  SELECT * FROM base
  WHERE platform = 'toss'
    AND NOT REGEXP_CONTAINS(COALESCE(ab_variant, ''), r'^beta_[AB]$')
),
relevant AS (
  SELECT
    user_pseudo_id,
    event_name,
    (SELECT ep.value.string_value FROM UNNEST(event_params) ep
      WHERE ep.key = 'arm' LIMIT 1) AS arm,
    (SELECT ep.value.string_value FROM UNNEST(event_params) ep
      WHERE ep.key = 'trigger' LIMIT 1) AS trigger_kind,
    (SELECT ep.value.string_value FROM UNNEST(event_params) ep
      WHERE ep.key = 'skipped' LIMIT 1) AS skipped,
    (SELECT ep.value.string_value FROM UNNEST(event_params) ep
      WHERE ep.key = 'cue' LIMIT 1) AS cue,
    (SELECT ep.value.string_value FROM UNNEST(event_params) ep
      WHERE ep.key = 'target_area' LIMIT 1) AS target_area,
    (SELECT ep.value.string_value FROM UNNEST(event_params) ep
      WHERE ep.key = 'recommendation_id' LIMIT 1) AS recommendation_id,
    (SELECT ep.value.string_value FROM UNNEST(event_params) ep
      WHERE ep.key = 'zone' LIMIT 1) AS zone,
    (SELECT ep.value.int_value FROM UNNEST(event_params) ep
      WHERE ep.key = 'shown' LIMIT 1) AS shown_int,
    (SELECT ep.value.string_value FROM UNNEST(event_params) ep
      WHERE ep.key = 'shown' LIMIT 1) AS shown_string
  FROM toss
  WHERE event_name IN (
    'churn_score', 'hint_banner_show', 'hint_banner_click',
    'recommendation_shown', 'recommendation_click', 'recommendation_arrive',
    'zone_enter', 'map_opened', 'map_locked', 'guide_open'
  )
)
SELECT
  event_name,
  COUNT(*) AS event_rows,
  COUNT(DISTINCT user_pseudo_id) AS devices,
  COUNTIF(arm = 'treat') AS treat_rows,
  COUNTIF(arm = 'control') AS control_rows,
  COUNTIF(trigger_kind IS NOT NULL) AS trigger_rows,
  COUNTIF(skipped IS NOT NULL) AS skipped_rows,
  COUNTIF(cue IS NOT NULL) AS cue_rows,
  COUNTIF(COALESCE(shown_int, IF(shown_string = 'true', 1, 0)) = 1) AS shown_rows,
  COUNTIF(target_area IS NOT NULL) AS target_area_rows,
  COUNTIF(recommendation_id IS NOT NULL) AS recommendation_id_rows,
  COUNTIF(zone IS NOT NULL) AS zone_rows
FROM relevant
GROUP BY event_name
ORDER BY event_rows DESC, event_name;
