-- G2: first-touch segment composition and simple observed-return descriptor.
-- This is descriptive only; it does not control for different acquisition dates.
WITH base AS (
  SELECT
    DATE(TIMESTAMP_MICROS(event_timestamp), 'Asia/Seoul') AS activity_day,
    event_timestamp,
    user_pseudo_id,
    COALESCE(device.category, '(미상)') AS device_category,
    COALESCE(geo.country, '(미상)') AS country,
    COALESCE(traffic_source.source, '(direct)') AS source,
    COALESCE(traffic_source.medium, '(none)') AS medium
  FROM `calm-forest.analytics_547127440.events_*`
  WHERE user_pseudo_id IS NOT NULL
    AND _TABLE_SUFFIX NOT LIKE 'intraday_%'
    AND DATE(TIMESTAMP_MICROS(event_timestamp), 'Asia/Seoul')
        <= DATE_SUB(CURRENT_DATE('Asia/Seoul'), INTERVAL 1 DAY)
),
profile AS (
  SELECT
    user_pseudo_id,
    COUNT(DISTINCT activity_day) AS active_days,
    MIN(activity_day) AS first_day,
    MAX(activity_day) AS last_day,
    ARRAY_AGG(
      STRUCT(device_category, country, source, medium)
      ORDER BY event_timestamp LIMIT 1
    )[OFFSET(0)] AS p
  FROM base
  GROUP BY 1
),
long_segments AS (
  SELECT
    user_pseudo_id,
    active_days,
    DATE_DIFF(last_day, first_day, DAY) AS observed_span_days,
    segment_type,
    segment_value
  FROM profile
  CROSS JOIN UNNEST([
    STRUCT('device' AS segment_type, p.device_category AS segment_value),
    STRUCT('country' AS segment_type, p.country AS segment_value),
    STRUCT('acquisition' AS segment_type, CONCAT(p.source, ' / ', p.medium) AS segment_value)
  ])
),
segment_sizes AS (
  SELECT segment_type, segment_value, COUNT(*) AS devices
  FROM long_segments
  GROUP BY 1, 2
),
rolled AS (
  SELECT
    l.user_pseudo_id,
    l.active_days,
    l.observed_span_days,
    l.segment_type,
    IF(s.devices < 30, '기타 (<30)', l.segment_value) AS segment_value
  FROM long_segments l
  JOIN segment_sizes s USING (segment_type, segment_value)
)
SELECT
  segment_type,
  segment_value,
  COUNT(*) AS devices,
  COUNTIF(active_days >= 2) AS returned_devices,
  ROUND(100 * SAFE_DIVIDE(COUNTIF(active_days >= 2), COUNT(*)), 1) AS observed_return_pct,
  APPROX_QUANTILES(active_days, 100)[OFFSET(50)] AS median_active_days,
  APPROX_QUANTILES(observed_span_days, 100)[OFFSET(50)] AS median_span_days
FROM rolled
GROUP BY 1, 2
ORDER BY 1, 3 DESC;
