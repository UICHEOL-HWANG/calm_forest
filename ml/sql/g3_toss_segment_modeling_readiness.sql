-- G3 aggregate segment readiness audit for the Toss early/later candidate label.
-- This query wraps g3_toss_device_feature_candidate.sql conceptually, but is
-- kept standalone so BigQuery can run it directly from a file.
-- Output is aggregate only: no raw identifiers, no exact timestamps.
WITH device_rows AS (
  -- Keep this CTE in sync with ml/sql/g3_toss_device_feature_candidate.sql.
  WITH actions AS (
    SELECT action_name, area FROM UNNEST([
      STRUCT('chop_tree' AS action_name, 'nature' AS area),
      ('first_chop', 'nature'), ('plant_seed', 'nature'), ('water_crop', 'nature'),
      ('harvest_crop', 'nature'), ('forage_pick', 'nature'), ('mine_ore', 'nature'),
      ('fishing_cast', 'fishing_sea'), ('fishing_catch', 'fishing_sea'),
      ('fishing_miss', 'fishing_sea'), ('sea_cast', 'fishing_sea'),
      ('sea_catch', 'fishing_sea'), ('boat_start', 'fishing_sea'),
      ('npc_talk', 'quest_social'), ('quest_accept', 'quest_social'),
      ('quest_complete', 'quest_social'), ('gift_give', 'quest_social'),
      ('shop_sell', 'craft_home'), ('shop_buy', 'craft_home'),
      ('craft_item', 'craft_home'), ('place_decor', 'craft_home'),
      ('house_complete', 'craft_home'), ('house_expand', 'craft_home'),
      ('cooking_start', 'craft_home'), ('carve_start', 'craft_home'),
      ('mist_purify_start', 'advanced'), ('firefly_swing', 'advanced'),
      ('coop_build', 'advanced'), ('coop_feed', 'advanced'),
      ('coop_collect', 'advanced'), ('cafe_serve', 'advanced'),
      ('photo_capture', 'advanced'), ('dex_open', 'advanced'),
      ('album_open', 'advanced'), ('leaderboard_open', 'advanced')
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
      COUNTIF(window_name = 'feature' AND event_name = 'tutorial_complete') AS early_tutorial_complete,
      COUNTIF(window_name = 'label' AND event_name IN (SELECT action_name FROM actions)) AS later_actions,
      MAX(IF(window_name = 'feature' AND event_name IN (SELECT action_name FROM actions), ts, NULL)) AS last_feature_action_ts,
      MIN(IF(window_name = 'label' AND event_name IN (SELECT action_name FROM actions), ts, NULL)) AS first_label_action_ts
    FROM events
    GROUP BY 1, 2, 3
  )
  SELECT
    user_pseudo_id,
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
    early_tutorial_complete,
    later_actions,
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
    IF(last_feature_action_ts >= TIMESTAMP_ADD(first_ts, INTERVAL 10 MINUTE), 1, 0) AS feature_boundary_violations,
    IF(first_label_action_ts < TIMESTAMP_ADD(first_ts, INTERVAL 10 MINUTE), 1, 0) AS label_boundary_violations
  FROM features
),
segments AS (
  SELECT '전체' AS segment_axis, '전체' AS segment_value, later_active,
    early_actions, later_actions, feature_boundary_violations, label_boundary_violations
  FROM device_rows
  UNION ALL
  SELECT '첫 토스 관측일', CAST(first_toss_day AS STRING), later_active,
    early_actions, later_actions, feature_boundary_violations, label_boundary_violations
  FROM device_rows
  UNION ALL
  SELECT '기기', device, later_active,
    early_actions, later_actions, feature_boundary_violations, label_boundary_violations
  FROM device_rows
  UNION ALL
  SELECT '국가', country_group, later_active,
    early_actions, later_actions, feature_boundary_violations, label_boundary_violations
  FROM device_rows
  UNION ALL
  SELECT '초반 행동량', early_action_segment, later_active,
    early_actions, later_actions, feature_boundary_violations, label_boundary_violations
  FROM device_rows
  UNION ALL
  SELECT '초반 영역 수', early_area_segment, later_active,
    early_actions, later_actions, feature_boundary_violations, label_boundary_violations
  FROM device_rows
  UNION ALL
  SELECT '초반 연결 상태', early_connection_segment, later_active,
    early_actions, later_actions, feature_boundary_violations, label_boundary_violations
  FROM device_rows
  UNION ALL
  SELECT '초반 토스 로그인', IF(early_toss_login > 0, '있음', '없음'), later_active,
    early_actions, later_actions, feature_boundary_violations, label_boundary_violations
  FROM device_rows
  UNION ALL
  SELECT '초반 로그인 화면', IF(early_login_screen > 0, '있음', '없음'), later_active,
    early_actions, later_actions, feature_boundary_violations, label_boundary_violations
  FROM device_rows
  UNION ALL
  SELECT '초반 튜토리얼 완료', IF(early_tutorial_complete > 0, '있음', '없음'), later_active,
    early_actions, later_actions, feature_boundary_violations, label_boundary_violations
  FROM device_rows
  UNION ALL
  SELECT '자연·채집 초반 도달', IF(early_nature_events > 0, '있음', '없음'), later_active,
    early_actions, later_actions, feature_boundary_violations, label_boundary_violations
  FROM device_rows
  UNION ALL
  SELECT '낚시·바다 초반 도달', IF(early_fishing_sea_events > 0, '있음', '없음'), later_active,
    early_actions, later_actions, feature_boundary_violations, label_boundary_violations
  FROM device_rows
  UNION ALL
  SELECT '퀘스트·교류 초반 도달', IF(early_quest_social_events > 0, '있음', '없음'), later_active,
    early_actions, later_actions, feature_boundary_violations, label_boundary_violations
  FROM device_rows
)
SELECT
  segment_axis,
  segment_value,
  COUNT(*) AS devices,
  COUNTIF(later_active) AS later_active_devices,
  COUNTIF(NOT later_active) AS later_inactive_devices,
  SAFE_DIVIDE(COUNTIF(later_active), COUNT(*)) AS later_active_rate,
  LEAST(COUNTIF(later_active), COUNTIF(NOT later_active)) AS minority_class_devices,
  SUM(early_actions) AS early_action_events,
  SUM(later_actions) AS later_action_events,
  SUM(feature_boundary_violations) AS feature_boundary_violations,
  SUM(label_boundary_violations) AS label_boundary_violations,
  CASE
    WHEN COUNT(*) < 30 THEN 'n<30'
    WHEN LEAST(COUNTIF(later_active), COUNTIF(NOT later_active)) < 10 THEN 'minority<10'
    ELSE 'ok_for_baseline_check'
  END AS modeling_readiness_flag
FROM segments
GROUP BY 1, 2
ORDER BY
  CASE segment_axis
    WHEN '전체' THEN 0
    WHEN '초반 행동량' THEN 1
    WHEN '초반 영역 수' THEN 2
    WHEN '초반 연결 상태' THEN 3
    WHEN '초반 토스 로그인' THEN 4
    WHEN '초반 로그인 화면' THEN 5
    WHEN '초반 튜토리얼 완료' THEN 6
    WHEN '자연·채집 초반 도달' THEN 7
    WHEN '낚시·바다 초반 도달' THEN 8
    WHEN '퀘스트·교류 초반 도달' THEN 9
    WHEN '기기' THEN 10
    WHEN '국가' THEN 11
    WHEN '첫 토스 관측일' THEN 12
    ELSE 99
  END,
  devices DESC,
  segment_value;
