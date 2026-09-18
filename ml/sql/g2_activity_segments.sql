-- G2: stable first-touch segments for each GA4 device. Sparse cells are
-- rolled into '기타' after total segment size is measured.
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
activity AS (
  SELECT DISTINCT activity_day, user_pseudo_id
  FROM base
),
profile AS (
  SELECT
    user_pseudo_id,
    ARRAY_AGG(
      STRUCT(activity_day AS first_day, device_category, country, source, medium)
      ORDER BY event_timestamp LIMIT 1
    )[OFFSET(0)] AS p
  FROM base
  GROUP BY 1
),
long_segments AS (
  SELECT a.activity_day, a.user_pseudo_id, segment_type, segment_value
  FROM activity a
  JOIN profile USING (user_pseudo_id)
  CROSS JOIN UNNEST([
    STRUCT('device' AS segment_type, p.device_category AS segment_value),
    STRUCT('country' AS segment_type, p.country AS segment_value),
    STRUCT('acquisition' AS segment_type, CONCAT(p.source, ' / ', p.medium) AS segment_value)
  ])
),
segment_sizes AS (
  SELECT segment_type, segment_value, COUNT(DISTINCT user_pseudo_id) AS devices
  FROM long_segments
  GROUP BY 1, 2
),
rolled AS (
  SELECT
    l.activity_day,
    l.user_pseudo_id,
    l.segment_type,
    IF(s.devices < 30, '기타 (<30)', l.segment_value) AS segment_value
  FROM long_segments l
  JOIN segment_sizes s USING (segment_type, segment_value)
)
SELECT
  activity_day,
  segment_type,
  segment_value,
  COUNT(DISTINCT user_pseudo_id) AS dau
FROM rolled
GROUP BY 1, 2, 3
ORDER BY 1, 2, 4 DESC;
