-- G2 spike-day event fingerprint. Only audited deliberate actions are included.
WITH base AS (
  SELECT
    DATE(TIMESTAMP_MICROS(event_timestamp), 'Asia/Seoul') AS activity_day,
    user_pseudo_id,
    event_name
  FROM `calm-forest.analytics_547127440.events_*`
  WHERE user_pseudo_id IS NOT NULL
    AND _TABLE_SUFFIX NOT LIKE 'intraday_%'
    AND DATE(TIMESTAMP_MICROS(event_timestamp), 'Asia/Seoul') <= DATE '2026-09-11'
),
first_seen AS (
  SELECT user_pseudo_id, MIN(activity_day) AS first_day
  FROM base
  GROUP BY 1
),
cohorts AS (
  SELECT
    b.user_pseudo_id,
    b.event_name,
    CASE
      WHEN f.first_day = DATE '2026-08-15' THEN '08/15 spike'
      WHEN f.first_day = DATE '2026-09-04' THEN '09/04 spike'
      WHEN f.first_day = DATE '2026-09-10' THEN '09/10 spike'
      ELSE 'non-spike'
    END AS cohort
  FROM base b
  JOIN first_seen f USING (user_pseudo_id)
  WHERE b.activity_day = f.first_day
    AND b.event_name IN (
      'chop_tree','first_chop','plant_seed','water_crop','harvest_crop','forage_pick',
      'mine_ore','fishing_cast','fishing_catch','fishing_miss','sea_cast','sea_catch',
      'shop_sell','shop_buy','craft_item','place_decor','house_complete','house_expand',
      'npc_talk','quest_accept','quest_complete','gift_give','cooking_start','carve_start',
      'boat_start','mist_purify_start','firefly_swing','coop_build','coop_feed','coop_collect',
      'cafe_serve','photo_capture','dex_open','album_open','leaderboard_open'
    )
),
sizes AS (
  SELECT
    CASE
      WHEN first_day = DATE '2026-08-15' THEN '08/15 spike'
      WHEN first_day = DATE '2026-09-04' THEN '09/04 spike'
      WHEN first_day = DATE '2026-09-10' THEN '09/10 spike'
      ELSE 'non-spike'
    END AS cohort,
    COUNT(*) AS cohort_devices
  FROM first_seen
  GROUP BY 1
)
SELECT
  c.cohort,
  c.event_name,
  COUNT(*) AS events,
  COUNT(DISTINCT c.user_pseudo_id) AS devices,
  s.cohort_devices,
  ROUND(100 * SAFE_DIVIDE(COUNT(DISTINCT c.user_pseudo_id), s.cohort_devices), 1) AS reach_pct
FROM cohorts c
JOIN sizes s USING (cohort)
GROUP BY 1, 2, 5
ORDER BY 1, 4 DESC, 2;
