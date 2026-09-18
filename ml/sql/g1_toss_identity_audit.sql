-- Toss is the in-app platform, not GA4 traffic_source.source='toss'.
-- Audit both independent platform markers and beta_A/beta_B markers before
-- defining a non-beta Toss cohort. No personal identifiers leave this query.
WITH ga4 AS (
  SELECT
    DATE(TIMESTAMP_MICROS(event_timestamp), 'Asia/Seoul') AS day,
    user_pseudo_id,
    event_name,
    (SELECT ep.value.string_value FROM UNNEST(event_params) ep
      WHERE ep.key = 'platform' LIMIT 1) AS event_platform,
    (SELECT up.value.string_value FROM UNNEST(user_properties) up
      WHERE up.key = 'platform' LIMIT 1) AS user_platform,
    (SELECT up.value.string_value FROM UNNEST(user_properties) up
      WHERE up.key = 'ab_variant' LIMIT 1) AS ab_variant,
    traffic_source.source AS acquisition_source
  FROM `calm-forest.analytics_547127440.events_*`
  WHERE _TABLE_SUFFIX NOT LIKE 'intraday_%'
    AND DATE(TIMESTAMP_MICROS(event_timestamp), 'Asia/Seoul')
        BETWEEN DATE '2026-09-04' AND DATE '2026-09-13'
),
raw_sessions AS (
  SELECT
    DATE(started_at, 'Asia/Seoul') AS day,
    client_id,
    platform,
    variant
  FROM `calm-forest.calm_forest_raw.session_logs`
  WHERE DATE(started_at, 'Asia/Seoul')
        BETWEEN DATE '2026-09-04' AND DATE '2026-09-13'
  QUALIFY ROW_NUMBER() OVER (
    PARTITION BY session_id ORDER BY updated_at DESC
  ) = 1
)
SELECT
  'GA4 events' AS source, day,
  COUNT(*) AS record_count,
  COUNT(DISTINCT user_pseudo_id) AS devices,
  COUNTIF(event_platform = 'toss') AS toss_rows,
  COUNT(DISTINCT IF(event_platform = 'toss', user_pseudo_id, NULL)) AS toss_devices,
  COUNTIF(event_platform IS NULL) AS missing_event_platform_rows,
  COUNTIF(user_platform = 'toss') AS toss_user_property_rows,
  COUNTIF(REGEXP_CONTAINS(COALESCE(ab_variant, ''), r'^beta_[AB]$')) AS beta_rows,
  COUNTIF(event_platform = 'toss' AND REGEXP_CONTAINS(
    COALESCE(ab_variant, ''), r'^beta_[AB]$')) AS toss_beta_rows,
  COUNTIF(LOWER(COALESCE(acquisition_source, '')) = 'toss') AS toss_source_rows
FROM ga4
GROUP BY day
UNION ALL
SELECT
  'deduped sessions' AS source, day,
  COUNT(*) AS record_count,
  COUNT(DISTINCT client_id) AS devices,
  COUNTIF(platform = 'toss') AS toss_rows,
  COUNT(DISTINCT IF(platform = 'toss', client_id, NULL)) AS toss_devices,
  COUNTIF(platform IS NULL) AS missing_event_platform_rows,
  CAST(NULL AS INT64) AS toss_user_property_rows,
  COUNTIF(REGEXP_CONTAINS(COALESCE(variant, ''), r'^beta_[AB]$')) AS beta_rows,
  COUNTIF(platform = 'toss' AND REGEXP_CONTAINS(
    COALESCE(variant, ''), r'^beta_[AB]$')) AS toss_beta_rows,
  CAST(NULL AS INT64) AS toss_source_rows
FROM raw_sessions
GROUP BY day
ORDER BY day, source;
