-- G3 later-target candidate audit, NOT a model.
-- Goal: split the 10m-to-24h candidate label into intervention-relevant targets.
-- Cohort and time windows match g3_toss_device_feature_candidate.sql.
-- Raw GA4 device IDs are used only inside the query; output uses D001 labels.
WITH actions AS (
  SELECT action_name, area FROM UNNEST([
    STRUCT('chop_tree' AS action_name, 'nature' AS area),
    ('first_chop', 'nature'),
    ('plant_seed', 'nature'),
    ('water_crop', 'nature'),
    ('harvest_crop', 'nature'),
    ('forage_pick', 'nature'),
    ('mine_ore', 'nature'),
    ('fishing_cast', 'fishing_sea'),
    ('fishing_catch', 'fishing_sea'),
    ('fishing_miss', 'fishing_sea'),
    ('sea_cast', 'fishing_sea'),
    ('sea_catch', 'fishing_sea'),
    ('boat_start', 'fishing_sea'),
    ('npc_talk', 'quest_social'),
    ('quest_accept', 'quest_social'),
    ('quest_complete', 'quest_social'),
    ('gift_give', 'quest_social'),
    ('shop_sell', 'craft_home'),
    ('shop_buy', 'craft_home'),
    ('craft_item', 'craft_home'),
    ('place_decor', 'craft_home'),
    ('house_complete', 'craft_home'),
    ('house_expand', 'craft_home'),
    ('cooking_start', 'craft_home'),
    ('carve_start', 'craft_home'),
    ('mist_purify_start', 'advanced'),
    ('firefly_swing', 'advanced'),
    ('coop_build', 'advanced'),
    ('coop_feed', 'advanced'),
    ('coop_collect', 'advanced'),
    ('cafe_serve', 'advanced'),
    ('photo_capture', 'advanced'),
    ('dex_open', 'advanced'),
    ('album_open', 'advanced'),
    ('leaderboard_open', 'advanced')
  ])
),
base AS (
  SELECT
    user_pseudo_id,
    TIMESTAMP_MICROS(event_timestamp) AS ts,
    DATE(TIMESTAMP_MICROS(event_timestamp), 'Asia/Seoul') AS day,
    event_name,
    device.category AS device,
    geo.country AS country,
    traffic_source.source AS acquisition_source,
    (SELECT ep.value.string_value FROM UNNEST(event_params) ep
      WHERE ep.key = 'platform' LIMIT 1) AS platform,
    (SELECT ep.value.string_value FROM UNNEST(event_params) ep
      WHERE ep.key = 'method' LIMIT 1) AS login_method,
    (SELECT ep.value.string_value FROM UNNEST(event_params) ep
      WHERE ep.key = 'result' LIMIT 1) AS connect_result,
    (SELECT up.value.string_value FROM UNNEST(user_properties) up
      WHERE up.key = 'ab_variant' LIMIT 1) AS ab_variant
  FROM `calm-forest.analytics_547127440.events_*`
  WHERE _TABLE_SUFFIX NOT LIKE 'intraday_%'
    AND _TABLE_SUFFIX BETWEEN '20260904' AND '20260912'
    AND user_pseudo_id IS NOT NULL
),
toss AS (
  SELECT * FROM base WHERE platform = 'toss'
),
first_seen AS (
  SELECT
    user_pseudo_id,
    MIN(ts) AS first_ts,
    MIN(day) AS first_toss_day,
    LOGICAL_OR(REGEXP_CONTAINS(COALESCE(ab_variant, ''), r'^beta_[AB]$')) AS beta_marked
  FROM toss
  GROUP BY 1
),
eligible AS (
  SELECT *
  FROM first_seen
  WHERE NOT beta_marked
    AND first_ts < TIMESTAMP_SUB(TIMESTAMP('2026-09-13 00:00:00', 'Asia/Seoul'), INTERVAL 24 HOUR)
),
windowed AS (
  SELECT
    t.*,
    e.first_ts,
    e.first_toss_day,
    a.area,
    CASE
      WHEN t.ts >= e.first_ts
       AND t.ts < TIMESTAMP_ADD(e.first_ts, INTERVAL 10 MINUTE) THEN 'feature'
      WHEN t.ts >= TIMESTAMP_ADD(e.first_ts, INTERVAL 10 MINUTE)
       AND t.ts < TIMESTAMP_ADD(e.first_ts, INTERVAL 24 HOUR) THEN 'label'
      ELSE 'outside'
    END AS window_name
  FROM toss t
  JOIN eligible e USING (user_pseudo_id)
  LEFT JOIN actions a ON t.event_name = a.action_name
),
device AS (
  SELECT
    user_pseudo_id,
    first_ts,
    first_toss_day,
    ARRAY_AGG(STRUCT(
      COALESCE(device, '(unknown)') AS device,
      CASE
        WHEN country = 'South Korea' THEN 'South Korea'
        WHEN country = 'United States' THEN 'United States'
        WHEN country IS NULL THEN '(unknown)'
        ELSE 'Other'
      END AS country_group,
      COALESCE(acquisition_source, '(direct)') AS acquisition_source
    ) ORDER BY ts LIMIT 1)[OFFSET(0)] AS profile,
    COUNTIF(window_name = 'feature' AND area IS NOT NULL) AS early_actions,
    COUNT(DISTINCT IF(window_name = 'feature' AND area IS NOT NULL, event_name, NULL)) AS early_action_kinds,
    COUNT(DISTINCT IF(window_name = 'feature' AND area IS NOT NULL, area, NULL)) AS early_area_count,
    COUNTIF(window_name = 'feature' AND area = 'nature') AS early_nature_events,
    COUNTIF(window_name = 'feature' AND area = 'fishing_sea') AS early_fishing_sea_events,
    COUNTIF(window_name = 'feature' AND area = 'quest_social') AS early_quest_social_events,
    COUNTIF(window_name = 'feature' AND area = 'craft_home') AS early_craft_home_events,
    COUNTIF(window_name = 'feature' AND area = 'advanced') AS early_advanced_events,
    COUNTIF(window_name = 'feature' AND event_name = 'toss_connect' AND connect_result = 'fail') AS early_connect_fail,
    COUNTIF(window_name = 'feature' AND event_name = 'toss_connect' AND connect_result = 'ok') AS early_connect_ok,
    COUNTIF(window_name = 'feature' AND event_name = 'login' AND login_method = 'toss') AS early_toss_login,
    COUNTIF(window_name = 'feature' AND event_name = 'login_screen') AS early_login_screen,
    COUNTIF(window_name = 'label' AND area IS NOT NULL) AS later_actions,
    COUNT(DISTINCT IF(window_name = 'label' AND area IS NOT NULL, event_name, NULL)) AS later_action_kinds,
    COUNT(DISTINCT IF(window_name = 'label' AND area IS NOT NULL, area, NULL)) AS later_area_count,
    COUNTIF(window_name = 'label' AND area = 'nature') AS later_nature_events,
    COUNTIF(window_name = 'label' AND area = 'fishing_sea') AS later_fishing_sea_events,
    COUNTIF(window_name = 'label' AND area = 'quest_social') AS later_quest_social_events,
    COUNTIF(window_name = 'label' AND area = 'craft_home') AS later_craft_home_events,
    COUNTIF(window_name = 'label' AND area = 'advanced') AS later_advanced_events,
    COUNTIF(window_name = 'label' AND area = 'nature' AND NOT EXISTS (
      SELECT 1 FROM windowed w2
      WHERE w2.user_pseudo_id = windowed.user_pseudo_id
        AND w2.window_name = 'feature' AND w2.area = 'nature'
    )) AS later_new_nature_events,
    COUNTIF(window_name = 'label' AND area = 'fishing_sea' AND NOT EXISTS (
      SELECT 1 FROM windowed w2
      WHERE w2.user_pseudo_id = windowed.user_pseudo_id
        AND w2.window_name = 'feature' AND w2.area = 'fishing_sea'
    )) AS later_new_fishing_sea_events,
    COUNTIF(window_name = 'label' AND area = 'quest_social' AND NOT EXISTS (
      SELECT 1 FROM windowed w2
      WHERE w2.user_pseudo_id = windowed.user_pseudo_id
        AND w2.window_name = 'feature' AND w2.area = 'quest_social'
    )) AS later_new_quest_social_events,
    COUNTIF(window_name = 'label' AND area = 'craft_home' AND NOT EXISTS (
      SELECT 1 FROM windowed w2
      WHERE w2.user_pseudo_id = windowed.user_pseudo_id
        AND w2.window_name = 'feature' AND w2.area = 'craft_home'
    )) AS later_new_craft_home_events,
    COUNTIF(window_name = 'label' AND area = 'advanced' AND NOT EXISTS (
      SELECT 1 FROM windowed w2
      WHERE w2.user_pseudo_id = windowed.user_pseudo_id
        AND w2.window_name = 'feature' AND w2.area = 'advanced'
    )) AS later_new_advanced_events,
    MAX(IF(window_name = 'feature' AND area IS NOT NULL, ts, NULL)) AS last_feature_action_ts,
    MIN(IF(window_name = 'label' AND area IS NOT NULL, ts, NULL)) AS first_label_action_ts
  FROM windowed
  GROUP BY 1, 2, 3
)
SELECT
  FORMAT('D%03d', ROW_NUMBER() OVER (ORDER BY FARM_FINGERPRINT(user_pseudo_id))) AS device_label,
  first_toss_day,
  profile.device AS device,
  profile.country_group AS country_group,
  profile.acquisition_source AS acquisition_source,
  early_actions,
  early_action_kinds,
  early_area_count,
  early_nature_events,
  early_fishing_sea_events,
  early_quest_social_events,
  early_craft_home_events,
  early_advanced_events,
  early_connect_fail,
  early_connect_ok,
  early_toss_login,
  early_login_screen,
  later_actions,
  later_action_kinds,
  later_area_count,
  later_nature_events,
  later_fishing_sea_events,
  later_quest_social_events,
  later_craft_home_events,
  later_advanced_events,
  later_new_nature_events,
  later_new_fishing_sea_events,
  later_new_quest_social_events,
  later_new_craft_home_events,
  later_new_advanced_events,
  later_actions > 0 AS later_active,
  (
    later_new_nature_events
    + later_new_fishing_sea_events
    + later_new_quest_social_events
    + later_new_craft_home_events
    + later_new_advanced_events
  ) > 0 AS later_new_area,
  later_quest_social_events > 0 AS later_quest_social,
  later_fishing_sea_events > 0 AS later_fishing_sea,
  later_nature_events > 0 AS later_nature,
  CASE WHEN early_actions = 0 THEN '0회'
       WHEN early_actions BETWEEN 1 AND 5 THEN '1~5회'
       ELSE '6회 이상' END AS early_action_segment,
  CASE WHEN early_area_count = 0 THEN '0개'
       WHEN early_area_count = 1 THEN '1개'
       ELSE '2개 이상' END AS early_area_segment,
  CASE
    WHEN early_connect_fail > 0 THEN '연결 실패 기록'
    WHEN early_connect_ok > 0 THEN '연결 성공만 기록'
    ELSE '연결 이벤트 없음'
  END AS early_connection_segment,
  IF(last_feature_action_ts >= TIMESTAMP_ADD(first_ts, INTERVAL 10 MINUTE), 1, 0) AS feature_boundary_violations,
  IF(first_label_action_ts < TIMESTAMP_ADD(first_ts, INTERVAL 10 MINUTE), 1, 0) AS label_boundary_violations
FROM device
ORDER BY device_label;
