-- G2: weekday pattern. Calendar labels are kept in SQL so notebook reruns
-- cannot silently change the mapping.
WITH daily AS (
  SELECT
    DATE(TIMESTAMP_MICROS(event_timestamp), 'Asia/Seoul') AS day,
    COUNT(DISTINCT user_pseudo_id) AS dau
  FROM `calm-forest.analytics_547127440.events_*`
  WHERE user_pseudo_id IS NOT NULL
    AND _TABLE_SUFFIX NOT LIKE 'intraday_%'
    AND DATE(TIMESTAMP_MICROS(event_timestamp), 'Asia/Seoul')
        <= DATE_SUB(CURRENT_DATE('Asia/Seoul'), INTERVAL 1 DAY)
  GROUP BY 1
)
SELECT
  EXTRACT(DAYOFWEEK FROM day) AS weekday_num,
  FORMAT_DATE('%a', day) AS weekday,
  COUNT(*) AS observed_days,
  ROUND(AVG(dau), 2) AS mean_dau,
  APPROX_QUANTILES(dau, 100)[OFFSET(50)] AS median_dau,
  MIN(dau) AS min_dau,
  MAX(dau) AS max_dau
FROM daily
GROUP BY 1, 2
ORDER BY 1;
