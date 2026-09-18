-- G2 spike-day behavior: one anonymous feature row per first-seen GA4 device.
-- The device identifier is used inside CTEs for joins and removed from output.
-- Deliberate actions use the allowlist already audited in 02_churn_where.ipynb;
-- automatic collection, login, ledger, and passive UI events are not actions.
WITH base AS (
  SELECT
    DATE(TIMESTAMP_MICROS(event_timestamp), 'Asia/Seoul') AS activity_day,
    event_timestamp,
    user_pseudo_id,
    event_name,
    COALESCE(device.category, '(unknown)') AS device,
    COALESCE(geo.country, '(unknown)') AS country,
    COALESCE(traffic_source.source, '(direct)') AS source,
    COALESCE(traffic_source.medium, '(none)') AS medium
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
profile AS (
  SELECT
    b.user_pseudo_id,
    ARRAY_AGG(
      STRUCT(b.device AS device, b.country AS country, b.source AS source, b.medium AS medium)
      ORDER BY b.event_timestamp LIMIT 1
    )[OFFSET(0)] AS p
  FROM base b
  GROUP BY 1
),
first_day_events AS (
  SELECT b.*, f.first_day
  FROM base b
  JOIN first_seen f USING (user_pseudo_id)
  WHERE b.activity_day = f.first_day
),
returns AS (
  SELECT
    f.user_pseudo_id,
    LOGICAL_OR(b.activity_day = DATE_ADD(f.first_day, INTERVAL 1 DAY)) AS returned_d1,
    LOGICAL_OR(b.activity_day = DATE_ADD(f.first_day, INTERVAL 7 DAY)) AS returned_d7
  FROM first_seen f
  JOIN base b USING (user_pseudo_id)
  GROUP BY 1
),
features AS (
  SELECT
    e.user_pseudo_id,
    e.first_day,
    CASE
      WHEN e.first_day = DATE '2026-08-15' THEN '08/15 spike'
      WHEN e.first_day = DATE '2026-09-04' THEN '09/04 spike'
      WHEN e.first_day = DATE '2026-09-10' THEN '09/10 spike'
      ELSE 'non-spike'
    END AS cohort,
    p.p.device AS device,
    CASE
      WHEN p.p.country = 'South Korea' THEN 'South Korea'
      WHEN p.p.country = 'United States' THEN 'United States'
      ELSE 'Other'
    END AS country_group,
    CASE
      WHEN LOWER(p.p.source) IN ('(direct)', 'direct')
       AND LOWER(p.p.medium) IN ('(none)', 'none') THEN 'direct / none'
      ELSE 'other acquisition'
    END AS acquisition_group,
    COUNT(*) AS ga4_events,
    TIMESTAMP_DIFF(
      TIMESTAMP_MICROS(MAX(e.event_timestamp)),
      TIMESTAMP_MICROS(MIN(e.event_timestamp)), SECOND
    ) AS observed_span_sec,
    COUNTIF(e.event_name IN (
      'chop_tree','first_chop','plant_seed','water_crop','harvest_crop','forage_pick',
      'mine_ore','fishing_cast','fishing_catch','fishing_miss','sea_cast','sea_catch',
      'shop_sell','shop_buy','craft_item','place_decor','house_complete','house_expand',
      'npc_talk','quest_accept','quest_complete','gift_give','cooking_start','carve_start',
      'boat_start','mist_purify_start','firefly_swing','coop_build','coop_feed','coop_collect',
      'cafe_serve','photo_capture','dex_open','album_open','leaderboard_open'
    )) AS deliberate_events,
    COUNT(DISTINCT IF(e.event_name IN (
      'chop_tree','first_chop','plant_seed','water_crop','harvest_crop','forage_pick',
      'mine_ore','fishing_cast','fishing_catch','fishing_miss','sea_cast','sea_catch',
      'shop_sell','shop_buy','craft_item','place_decor','house_complete','house_expand',
      'npc_talk','quest_accept','quest_complete','gift_give','cooking_start','carve_start',
      'boat_start','mist_purify_start','firefly_swing','coop_build','coop_feed','coop_collect',
      'cafe_serve','photo_capture','dex_open','album_open','leaderboard_open'
    ), e.event_name, NULL)) AS deliberate_kinds,
    COUNTIF(e.event_name IN (
      'character_select','nickname_set','intro_start','intro_complete','intro_skip',
      'tutorial_start','tutorial_step','tutorial_complete'
    )) AS onboarding_events,
    COUNTIF(e.event_name IN (
      'chop_tree','first_chop','plant_seed','water_crop','harvest_crop','forage_pick','mine_ore'
    )) AS nature_events,
    COUNTIF(e.event_name IN (
      'fishing_cast','fishing_catch','fishing_miss','sea_cast','sea_catch','boat_start'
    )) AS fishing_sea_events,
    COUNTIF(e.event_name IN (
      'npc_talk','quest_accept','quest_complete','gift_give'
    )) AS quest_social_events,
    COUNTIF(e.event_name IN (
      'shop_sell','shop_buy','craft_item','place_decor','house_complete','house_expand',
      'cooking_start','carve_start'
    )) AS craft_home_events,
    COUNTIF(e.event_name IN (
      'mist_purify_start','firefly_swing','coop_build','coop_feed','coop_collect',
      'cafe_serve','photo_capture','dex_open','album_open','leaderboard_open'
    )) AS advanced_events
  FROM first_day_events e
  JOIN profile p USING (user_pseudo_id)
  GROUP BY 1, 2, 3, 4, 5, 6
)
SELECT
  f.* EXCEPT(user_pseudo_id),
  f.first_day <= DATE_SUB(DATE '2026-09-11', INTERVAL 1 DAY) AS d1_eligible,
  IF(f.first_day <= DATE_SUB(DATE '2026-09-11', INTERVAL 1 DAY), r.returned_d1, NULL)
    AS returned_d1,
  f.first_day <= DATE_SUB(DATE '2026-09-11', INTERVAL 7 DAY) AS d7_eligible,
  IF(f.first_day <= DATE_SUB(DATE '2026-09-11', INTERVAL 7 DAY), r.returned_d7, NULL)
    AS returned_d7
FROM features f
JOIN returns r USING (user_pseudo_id)
ORDER BY first_day, cohort;
