-- G2: GA4 device activity in KST. The current day is excluded because the
-- daily export is incomplete. user_id is intentionally not used: anonymous
-- auth IDs rotate and inflate the population.
WITH activity AS (
  SELECT DISTINCT
    DATE(TIMESTAMP_MICROS(event_timestamp), 'Asia/Seoul') AS activity_day,
    user_pseudo_id
  FROM `calm-forest.analytics_547127440.events_*`
  WHERE user_pseudo_id IS NOT NULL
    AND _TABLE_SUFFIX NOT LIKE 'intraday_%'
    AND DATE(TIMESTAMP_MICROS(event_timestamp), 'Asia/Seoul')
        <= DATE_SUB(CURRENT_DATE('Asia/Seoul'), INTERVAL 1 DAY)
),
first_seen AS (
  SELECT user_pseudo_id, MIN(activity_day) AS first_day
  FROM activity
  GROUP BY 1
),
days AS (
  SELECT day
  FROM UNNEST(GENERATE_DATE_ARRAY(
    (SELECT MIN(activity_day) FROM activity),
    (SELECT MAX(activity_day) FROM activity)
  )) AS day
)
SELECT
  d.day,
  COUNT(DISTINCT IF(a.activity_day = d.day, a.user_pseudo_id, NULL)) AS dau,
  COUNT(DISTINCT IF(
    a.activity_day BETWEEN DATE_SUB(d.day, INTERVAL 6 DAY) AND d.day,
    a.user_pseudo_id, NULL
  )) AS wau,
  COUNT(DISTINCT IF(
    a.activity_day BETWEEN DATE_SUB(d.day, INTERVAL 27 DAY) AND d.day,
    a.user_pseudo_id, NULL
  )) AS mau_28d,
  COUNT(DISTINCT IF(
    a.activity_day = d.day AND f.first_day = d.day,
    a.user_pseudo_id, NULL
  )) AS new_dau,
  COUNT(DISTINCT IF(
    a.activity_day = d.day AND f.first_day < d.day,
    a.user_pseudo_id, NULL
  )) AS returning_dau,
  d.day >= DATE_ADD((SELECT MIN(activity_day) FROM activity), INTERVAL 27 DAY)
    AS complete_28d
FROM days d
LEFT JOIN activity a
  ON a.activity_day BETWEEN DATE_SUB(d.day, INTERVAL 27 DAY) AND d.day
LEFT JOIN first_seen f USING (user_pseudo_id)
GROUP BY d.day
ORDER BY d.day;
