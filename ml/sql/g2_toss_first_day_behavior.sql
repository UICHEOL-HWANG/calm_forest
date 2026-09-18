-- G2: first observed Toss-platform day per GA4 device, through the last
-- available complete daily export (2026-09-12 KST). Toss means event param
-- platform='toss', NOT traffic_source.source='toss'.
-- Keep no-action devices in the denominator; drop marked beta_A/beta_B devices.
-- Automatic GA4 events, login, economy bookkeeping and tutorial_skip are not
-- deliberate play. No device/user identifier is returned or uploaded to W&B.
WITH base AS (
  SELECT
    DATE(TIMESTAMP_MICROS(event_timestamp), 'Asia/Seoul') AS day,
    event_timestamp,
    user_pseudo_id,
    event_name,
    device.category AS device,
    geo.country AS country,
    traffic_source.source AS acquisition_source,
    (SELECT ep.value.string_value FROM UNNEST(event_params) ep
      WHERE ep.key = 'platform' LIMIT 1) AS event_platform,
    (SELECT ep.value.string_value FROM UNNEST(event_params) ep
      WHERE ep.key = 'method' LIMIT 1) AS login_method,
    (SELECT ep.value.string_value FROM UNNEST(event_params) ep
      WHERE ep.key = 'result' LIMIT 1) AS connect_result,
    (SELECT up.value.string_value FROM UNNEST(user_properties) up
      WHERE up.key = 'ab_variant' LIMIT 1) AS ab_variant
  FROM `calm-forest.analytics_547127440.events_*`
  WHERE _TABLE_SUFFIX NOT LIKE 'intraday_%'
    AND user_pseudo_id IS NOT NULL
    AND DATE(TIMESTAMP_MICROS(event_timestamp), 'Asia/Seoul')
        BETWEEN DATE '2026-09-04' AND DATE '2026-09-12'
),
toss AS (
  SELECT * FROM base WHERE event_platform = 'toss'
),
first_toss AS (
  SELECT user_pseudo_id, MIN(day) AS first_toss_day
  FROM toss GROUP BY 1
),
first_day AS (
  SELECT t.*, f.first_toss_day
  FROM toss t JOIN first_toss f USING (user_pseudo_id)
  WHERE t.day = f.first_toss_day
),
features AS (
  SELECT
    user_pseudo_id,
    first_toss_day,
    ARRAY_AGG(STRUCT(COALESCE(device, '(unknown)') AS device,
                     COALESCE(country, '(unknown)') AS country,
                     COALESCE(acquisition_source, '(direct)') AS acquisition_source)
              ORDER BY event_timestamp LIMIT 1)[OFFSET(0)] AS profile,
    LOGICAL_OR(REGEXP_CONTAINS(COALESCE(ab_variant, ''), r'^beta_[AB]$')) AS beta_marked,
    COUNT(*) AS tracked_events,
    COUNTIF(event_name = 'toss_connect' AND connect_result = 'ok') AS connect_ok,
    COUNTIF(event_name = 'toss_connect' AND connect_result = 'fail') AS connect_fail,
    COUNTIF(event_name = 'login' AND login_method = 'toss') AS toss_login,
    COUNTIF(event_name = 'login_screen') AS login_screen,
    COUNTIF(event_name = 'tutorial_start') AS tutorial_start,
    COUNTIF(event_name = 'tutorial_complete') AS tutorial_complete,
    COUNTIF(event_name IN (
      'chop_tree','first_chop','plant_seed','water_crop','harvest_crop','forage_pick',
      'mine_ore','fishing_cast','fishing_catch','fishing_miss','sea_cast','sea_catch',
      'shop_sell','shop_buy','craft_item','place_decor','house_complete','house_expand',
      'npc_talk','quest_accept','quest_complete','gift_give','cooking_start','carve_start',
      'boat_start','mist_purify_start','firefly_swing','coop_build','coop_feed','coop_collect',
      'cafe_serve','photo_capture','dex_open','album_open','leaderboard_open'
    )) AS deliberate_events,
    COUNT(DISTINCT IF(event_name IN (
      'chop_tree','first_chop','plant_seed','water_crop','harvest_crop','forage_pick',
      'mine_ore','fishing_cast','fishing_catch','fishing_miss','sea_cast','sea_catch',
      'shop_sell','shop_buy','craft_item','place_decor','house_complete','house_expand',
      'npc_talk','quest_accept','quest_complete','gift_give','cooking_start','carve_start',
      'boat_start','mist_purify_start','firefly_swing','coop_build','coop_feed','coop_collect',
      'cafe_serve','photo_capture','dex_open','album_open','leaderboard_open'
    ), event_name, NULL)) AS deliberate_kinds,
    COUNTIF(event_name IN (
      'chop_tree','first_chop','plant_seed','water_crop','harvest_crop','forage_pick','mine_ore'
    )) AS nature_events,
    COUNTIF(event_name IN (
      'fishing_cast','fishing_catch','fishing_miss','sea_cast','sea_catch','boat_start'
    )) AS fishing_sea_events,
    COUNTIF(event_name IN (
      'npc_talk','quest_accept','quest_complete','gift_give'
    )) AS quest_social_events,
    COUNTIF(event_name IN (
      'shop_sell','shop_buy','craft_item','place_decor','house_complete','house_expand',
      'cooking_start','carve_start'
    )) AS craft_home_events,
    COUNTIF(event_name IN (
      'mist_purify_start','firefly_swing','coop_build','coop_feed','coop_collect',
      'cafe_serve','photo_capture','dex_open','album_open','leaderboard_open'
    )) AS advanced_events,
    ARRAY_AGG(DISTINCT IF(event_name IN (
      'chop_tree','first_chop','plant_seed','water_crop','harvest_crop','forage_pick',
      'mine_ore','fishing_cast','fishing_catch','fishing_miss','sea_cast','sea_catch',
      'shop_sell','shop_buy','craft_item','place_decor','house_complete','house_expand',
      'npc_talk','quest_accept','quest_complete','gift_give','cooking_start','carve_start',
      'boat_start','mist_purify_start','firefly_swing','coop_build','coop_feed','coop_collect',
      'cafe_serve','photo_capture','dex_open','album_open','leaderboard_open'
    ), event_name, NULL) IGNORE NULLS) AS reached_actions
  FROM first_day
  GROUP BY user_pseudo_id, first_toss_day
)
SELECT
  first_toss_day, profile.device AS device, profile.country AS country,
  profile.acquisition_source AS acquisition_source,
  beta_marked, tracked_events, connect_ok, connect_fail, toss_login,
  login_screen, tutorial_start, tutorial_complete,
  deliberate_events, deliberate_kinds, nature_events, fishing_sea_events,
  quest_social_events, craft_home_events, advanced_events, reached_actions
FROM features
WHERE NOT beta_marked
ORDER BY first_toss_day;
