-- G2: which deliberate actions the 10 deepest Toss-observed devices repeated
-- on their first Toss-observed day, 2026-09-04..09-12 KST.
-- Deep = >=31 deliberate events (bin fixed in notebook 08 before this query).
-- Toss uses event parameter platform='toss'; GA4 traffic source is not used.
-- Exclude beta_A/beta_B marked devices. Automatic events, login, onboarding,
-- economy bookkeeping, and tutorial_skip are not deliberate actions.
-- user_pseudo_id is only an internal grouping key; no ID, exact timestamp,
-- account data, or raw event row is returned.
WITH toss_events AS (
  SELECT
    user_pseudo_id,
    DATE(TIMESTAMP_MICROS(event_timestamp), 'Asia/Seoul') AS day,
    event_name,
    (SELECT ep.value.int_value FROM UNNEST(event_params) ep
      WHERE ep.key = 'ga_session_id' LIMIT 1) AS ga_session_id,
    (SELECT up.value.string_value FROM UNNEST(user_properties) up
      WHERE up.key = 'ab_variant' LIMIT 1) AS ab_variant
  FROM `calm-forest.analytics_547127440.events_*`
  WHERE _TABLE_SUFFIX NOT LIKE 'intraday_%'
    AND user_pseudo_id IS NOT NULL
    AND DATE(TIMESTAMP_MICROS(event_timestamp), 'Asia/Seoul')
        BETWEEN DATE '2026-09-04' AND DATE '2026-09-12'
    AND (SELECT ep.value.string_value FROM UNNEST(event_params) ep
         WHERE ep.key = 'platform' LIMIT 1) = 'toss'
),
first_toss AS (
  SELECT user_pseudo_id, MIN(day) AS first_toss_day
  FROM toss_events GROUP BY 1
),
first_day AS (
  SELECT e.*
  FROM toss_events e JOIN first_toss f USING (user_pseudo_id)
  WHERE e.day = f.first_toss_day
),
allowed AS (
  SELECT action_name FROM UNNEST([
    'chop_tree','first_chop','plant_seed','water_crop','harvest_crop','forage_pick',
    'mine_ore','fishing_cast','fishing_catch','fishing_miss','sea_cast','sea_catch',
    'shop_sell','shop_buy','craft_item','place_decor','house_complete','house_expand',
    'npc_talk','quest_accept','quest_complete','gift_give','cooking_start','carve_start',
    'boat_start','mist_purify_start','firefly_swing','coop_build','coop_feed','coop_collect',
    'cafe_serve','photo_capture','dex_open','album_open','leaderboard_open'
  ]) AS action_name
),
device_totals AS (
  SELECT
    user_pseudo_id,
    COUNTIF(event_name IN (SELECT action_name FROM allowed)) AS action_events,
    COUNT(DISTINCT IF(event_name IN (SELECT action_name FROM allowed),
                      event_name, NULL)) AS action_kinds,
    COUNT(DISTINCT ga_session_id) AS observed_ga_sessions,
    LOGICAL_OR(REGEXP_CONTAINS(COALESCE(ab_variant,''),r'^beta_[AB]$')) AS beta_marked
  FROM first_day GROUP BY 1
),
ranked AS (
  SELECT
    user_pseudo_id,
    action_events,
    action_kinds,
    observed_ga_sessions,
    ROW_NUMBER() OVER (ORDER BY action_events DESC, user_pseudo_id) AS depth_rank
  FROM device_totals
  WHERE NOT beta_marked
),
action_counts AS (
  SELECT
    user_pseudo_id, event_name, COUNT(*) AS event_count
  FROM first_day
  WHERE event_name IN (SELECT action_name FROM allowed)
  GROUP BY 1,2
)
SELECT
  FORMAT('T%02d', r.depth_rank) AS device_label,
  r.action_events,
  r.action_kinds,
  r.observed_ga_sessions,
  a.event_name,
  a.event_count
FROM ranked r
JOIN action_counts a USING (user_pseudo_id)
WHERE r.action_events >= 31
ORDER BY r.depth_rank, a.event_count DESC, a.event_name;
