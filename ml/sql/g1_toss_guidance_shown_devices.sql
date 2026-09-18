-- G1 follow-up: distinct Toss devices with scored/shown churn banners.
-- Same window and platform/beta filters as measurement audit.
WITH score_events AS (
  SELECT
    user_pseudo_id,
    (SELECT ep.value.string_value FROM UNNEST(event_params) ep
      WHERE ep.key='arm' LIMIT 1) AS arm,
    (SELECT ep.value.int_value FROM UNNEST(event_params) ep
      WHERE ep.key='shown' LIMIT 1) AS shown_int,
    (SELECT ep.value.string_value FROM UNNEST(event_params) ep
      WHERE ep.key='shown' LIMIT 1) AS shown_string
  FROM `calm-forest.analytics_547127440.events_*`
  WHERE _TABLE_SUFFIX NOT LIKE 'intraday_%'
    AND event_name='churn_score'
    AND user_pseudo_id IS NOT NULL
    AND DATE(TIMESTAMP_MICROS(event_timestamp),'Asia/Seoul')
        BETWEEN DATE '2026-09-04' AND DATE '2026-09-12'
    AND (SELECT ep.value.string_value FROM UNNEST(event_params) ep
      WHERE ep.key='platform' LIMIT 1)='toss'
    AND NOT REGEXP_CONTAINS(COALESCE((
      SELECT up.value.string_value FROM UNNEST(user_properties) up
      WHERE up.key='ab_variant' LIMIT 1),''),r'^beta_[AB]$')
)
SELECT
  arm,
  COUNT(*) AS score_rows,
  COUNT(DISTINCT user_pseudo_id) AS scored_devices,
  COUNTIF(COALESCE(shown_int,IF(LOWER(shown_string)='true',1,0))=1) AS shown_rows,
  COUNT(DISTINCT IF(COALESCE(shown_int,IF(LOWER(shown_string)='true',1,0))=1,
      user_pseudo_id,NULL)) AS shown_devices
FROM score_events
GROUP BY arm
ORDER BY arm;
