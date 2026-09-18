-- G3 candidate device-level table for offline modeling readiness, NOT a model.
-- Cohort: GA4 devices with platform='toss', first seen 2026-09-04..09-11 KST,
-- beta_A/B marker absent, and a complete 24h label window in daily exports.
-- Feature window: [first_toss_ts, +10m). Candidate label: [+10m, +24h).
-- Only anonymous row labels leave BigQuery; user_pseudo_id is an internal key.
-- Automatic GA4 events, login bookkeeping, economy bookkeeping, and tutorial_skip
-- are not deliberate play actions.
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
events AS (
  SELECT
    t.*,
    e.first_ts,
    e.first_toss_day,
    CASE
      WHEN t.ts >= e.first_ts
       AND t.ts < TIMESTAMP_ADD(e.first_ts, INTERVAL 10 MINUTE) THEN 'feature'
      WHEN t.ts >= TIMESTAMP_ADD(e.first_ts, INTERVAL 10 MINUTE)
       AND t.ts < TIMESTAMP_ADD(e.first_ts, INTERVAL 24 HOUR) THEN 'label'
      ELSE 'outside'
    END AS window_name
  FROM toss t
  JOIN eligible e USING (user_pseudo_id)
),
features AS (
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
    COUNTIF(window_name = 'feature') AS early_tracked_events,
    COUNTIF(window_name = 'feature' AND event_name IN (SELECT action_name FROM actions)) AS early_actions,
    COUNT(DISTINCT IF(window_name = 'feature' AND event_name IN (SELECT action_name FROM actions),
      event_name, NULL)) AS early_action_kinds,
    COUNT(DISTINCT IF(window_name = 'feature' AND event_name IN (SELECT action_name FROM actions),
      (SELECT area FROM actions WHERE action_name = event_name), NULL)) AS early_area_count,
    COUNTIF(window_name = 'feature' AND event_name IN (
      SELECT action_name FROM actions WHERE area = 'nature'
    )) AS early_nature_events,
    COUNTIF(window_name = 'feature' AND event_name IN (
      SELECT action_name FROM actions WHERE area = 'fishing_sea'
    )) AS early_fishing_sea_events,
    COUNTIF(window_name = 'feature' AND event_name IN (
      SELECT action_name FROM actions WHERE area = 'quest_social'
    )) AS early_quest_social_events,
    COUNTIF(window_name = 'feature' AND event_name IN (
      SELECT action_name FROM actions WHERE area = 'craft_home'
    )) AS early_craft_home_events,
    COUNTIF(window_name = 'feature' AND event_name IN (
      SELECT action_name FROM actions WHERE area = 'advanced'
    )) AS early_advanced_events,
    COUNTIF(window_name = 'feature' AND event_name = 'toss_connect' AND connect_result = 'fail') AS early_connect_fail,
    COUNTIF(window_name = 'feature' AND event_name = 'toss_connect' AND connect_result = 'ok') AS early_connect_ok,
    COUNTIF(window_name = 'feature' AND event_name = 'login' AND login_method = 'toss') AS early_toss_login,
    COUNTIF(window_name = 'feature' AND event_name = 'login_screen') AS early_login_screen,
    COUNTIF(window_name = 'feature' AND event_name = 'tutorial_start') AS early_tutorial_start,
    COUNTIF(window_name = 'feature' AND event_name = 'tutorial_complete') AS early_tutorial_complete,
    COUNTIF(window_name = 'label' AND event_name IN (SELECT action_name FROM actions)) AS later_actions,
    COUNT(DISTINCT IF(window_name = 'label' AND event_name IN (SELECT action_name FROM actions),
      event_name, NULL)) AS later_action_kinds,
    COUNT(DISTINCT IF(window_name = 'label' AND event_name IN (SELECT action_name FROM actions),
      (SELECT area FROM actions WHERE action_name = event_name), NULL)) AS later_area_count,
    MAX(IF(window_name = 'feature' AND event_name IN (SELECT action_name FROM actions), ts, NULL)) AS last_feature_action_ts,
    MIN(IF(window_name = 'label' AND event_name IN (SELECT action_name FROM actions), ts, NULL)) AS first_label_action_ts
  FROM events
  GROUP BY 1, 2, 3
)
SELECT
  FORMAT('D%03d', ROW_NUMBER() OVER (ORDER BY FARM_FINGERPRINT(user_pseudo_id))) AS device_label,
  first_toss_day,
  profile.device AS device,
  profile.country_group AS country_group,
  profile.acquisition_source AS acquisition_source,
  early_tracked_events,
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
  early_tutorial_start,
  early_tutorial_complete,
  later_actions,
  later_action_kinds,
  later_area_count,
  later_actions > 0 AS later_active,
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
  COUNTIF(last_feature_action_ts >= TIMESTAMP_ADD(first_ts, INTERVAL 10 MINUTE)) AS feature_boundary_violations,
  COUNTIF(first_label_action_ts < TIMESTAMP_ADD(first_ts, INTERVAL 10 MINUTE)) AS label_boundary_violations
FROM features
GROUP BY
  user_pseudo_id, first_toss_day, device, country_group, acquisition_source,
  early_tracked_events, early_actions, early_action_kinds, early_area_count,
  early_nature_events, early_fishing_sea_events, early_quest_social_events,
  early_craft_home_events, early_advanced_events, early_connect_fail,
  early_connect_ok, early_toss_login, early_login_screen, early_tutorial_start,
  early_tutorial_complete, later_actions, later_action_kinds, later_area_count,
  later_active, early_action_segment, early_area_segment, early_connection_segment
ORDER BY device_label;
