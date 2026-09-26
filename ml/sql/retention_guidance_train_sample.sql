-- 🌿 리텐션 안내 모델 주간 재학습 표본 — g5_refined_retention_feature_table.sql 의 굴러가는 버전.
-- retention_guidance_train DAG(매주 월)가 읽는다. 피처·라벨 정의는 G5 원본과 같고, 다른 점은 셋:
--   1) 코호트: 2026-09-04 KST 이후 첫 관측 기기 누적. 라벨(+24h)이 GA4 일일 export 로 다 들어왔을
--      만큼 지난 기기만(first_ts < now − 72h). 매주 표본이 늘어난다.
--   2) 첫 관측 후 24h 안에 retention_guidance_show 가 찍힌 기기는 뺀다(피처 창 포함 — 배너는 3분에도 뜬다).
--      배너는 '나중에 또 하게' 만들려는 개입이라 본 기기의 라벨은 개입 효과가 섞인다(대조군 없음, 2026-09-26 결정).
--   3) 피처는 retention_guidance_* 이벤트를 세지 않는다 — 클라이언트 카운터(record())와 같게.
--      9/19 이전 기기엔 없던 이벤트라, 세면 이후 기기만 early_tracked_events 가 부풀려진다.
-- 피처 창 [first_ts, +10m) · 라벨 창 [+10m, +24h). 베타 표시 기기(ab_variant beta_A/beta_B) 제외,
-- 원시 기기 ID 는 쿼리 밖으로 안 나간다 — G5 와 같다.
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
    AND _TABLE_SUFFIX >= '20260727'
    AND user_pseudo_id IS NOT NULL
),
first_seen AS (
  SELECT
    user_pseudo_id,
    MIN(ts) AS first_ts,
    MIN(day) AS first_day,
    LOGICAL_OR(REGEXP_CONTAINS(COALESCE(ab_variant, ''), r'^beta_[AB]$')) AS beta_marked
  FROM base
  GROUP BY 1
),
banner_shown AS (
  SELECT DISTINCT b.user_pseudo_id
  FROM base b
  JOIN first_seen f USING (user_pseudo_id)
  WHERE b.event_name = 'retention_guidance_show'
    AND b.ts < TIMESTAMP_ADD(f.first_ts, INTERVAL 24 HOUR)
),
eligible AS (
  SELECT *
  FROM first_seen
  WHERE NOT beta_marked
    AND first_day >= DATE '2026-09-04'
    AND first_ts < TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 72 HOUR)
    AND user_pseudo_id NOT IN (SELECT user_pseudo_id FROM banner_shown)
),
windowed AS (
  SELECT
    b.*,
    e.first_ts,
    e.first_day,
    a.area,
    CASE
      WHEN b.ts >= e.first_ts
       AND b.ts < TIMESTAMP_ADD(e.first_ts, INTERVAL 10 MINUTE) THEN 'feature'
      WHEN b.ts >= TIMESTAMP_ADD(e.first_ts, INTERVAL 10 MINUTE)
       AND b.ts < TIMESTAMP_ADD(e.first_ts, INTERVAL 24 HOUR) THEN 'label'
      ELSE 'outside'
    END AS window_name,
    CASE
      WHEN a.area IS NOT NULL THEN 'deliberate'
      WHEN b.event_name IN ('first_visit', 'session_start', 'page_view', 'user_engagement', 'scroll') THEN 'ga_auto'
      WHEN b.event_name IN ('login', 'login_screen', 'tutorial_start', 'tutorial_complete') THEN 'entry_auth'
      WHEN b.event_name = 'toss_connect' AND b.connect_result = 'ok' THEN 'connect_ok'
      WHEN b.event_name = 'toss_connect' AND b.connect_result = 'fail' THEN 'connect_fail'
      WHEN b.event_name = 'toss_connect' THEN 'connect_other'
      ELSE 'other_tracking'
    END AS event_category
  FROM base b
  JOIN eligible e USING (user_pseudo_id)
  LEFT JOIN actions a ON b.event_name = a.action_name
  WHERE b.ts >= e.first_ts
    AND b.ts < TIMESTAMP_ADD(e.first_ts, INTERVAL 24 HOUR)
    AND NOT STARTS_WITH(b.event_name, 'retention_guidance_')
),
device_rollup AS (
  SELECT
    user_pseudo_id,
    first_ts,
    first_day,
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
    LOGICAL_OR(window_name = 'feature' AND platform = 'toss') AS toss_in_feature_window,
    COUNTIF(window_name = 'feature') AS early_tracked_events,
    COUNTIF(window_name = 'feature' AND event_category = 'deliberate') AS early_actions,
    COUNT(DISTINCT IF(window_name = 'feature' AND event_category = 'deliberate', event_name, NULL)) AS early_action_kinds,
    COUNT(DISTINCT IF(window_name = 'feature' AND event_category = 'deliberate', area, NULL)) AS early_area_count,
    COUNT(DISTINCT IF(window_name = 'feature', event_name, NULL)) AS early_event_name_count,
    COUNTIF(window_name = 'feature' AND event_category = 'ga_auto') AS early_ga_auto_events,
    COUNTIF(window_name = 'feature' AND event_category = 'entry_auth') AS early_entry_auth_events,
    COUNTIF(window_name = 'feature' AND event_category = 'connect_ok') AS early_connect_ok_events,
    COUNTIF(window_name = 'feature' AND event_category = 'connect_fail') AS early_connect_fail_events,
    COUNTIF(window_name = 'feature' AND event_category = 'connect_other') AS early_connect_other_events,
    COUNTIF(window_name = 'feature' AND event_category = 'other_tracking') AS early_other_tracking_events,
    COUNTIF(window_name = 'feature' AND area = 'nature') AS early_nature_events,
    COUNTIF(window_name = 'feature' AND area = 'fishing_sea') AS early_fishing_sea_events,
    COUNTIF(window_name = 'feature' AND area = 'quest_social') AS early_quest_social_events,
    COUNTIF(window_name = 'feature' AND area = 'craft_home') AS early_craft_home_events,
    COUNTIF(window_name = 'feature' AND area = 'advanced') AS early_advanced_events,
    COUNTIF(window_name = 'feature' AND event_name = 'chop_tree') AS early_chop_tree_events,
    COUNTIF(window_name = 'feature' AND event_name = 'mine_ore') AS early_mine_ore_events,
    COUNTIF(window_name = 'feature' AND event_name = 'npc_talk') AS early_npc_talk_events,
    COUNTIF(window_name = 'feature' AND event_name = 'tutorial_step') AS early_tutorial_step_events,
    COUNTIF(window_name = 'feature' AND event_name = 'quest_offered') AS early_quest_offered_events,
    COUNTIF(window_name = 'feature' AND event_name = 'churn_score') AS early_churn_score_events,
    COUNTIF(window_name = 'feature' AND event_name = 'session_summary') AS early_session_summary_events,
    COUNTIF(window_name = 'feature' AND event_name = 'session_time') AS early_session_time_events,
    COUNTIF(window_name = 'feature' AND event_name = 'econ_tx') AS early_econ_tx_events,
    COUNTIF(window_name = 'feature' AND event_name = 'zone_enter') AS early_zone_enter_events,
    COUNTIF(window_name = 'label' AND area IS NOT NULL) AS later_actions,
    COUNT(DISTINCT IF(window_name = 'label' AND area IS NOT NULL, event_name, NULL)) AS later_action_kinds,
    COUNT(DISTINCT IF(window_name = 'label' AND area IS NOT NULL, area, NULL)) AS later_area_count,
    COUNTIF(window_name = 'label' AND area = 'nature') AS later_nature_events,
    COUNTIF(window_name = 'label' AND area = 'fishing_sea') AS later_fishing_sea_events,
    COUNTIF(window_name = 'label' AND area = 'quest_social') AS later_quest_social_events,
    COUNTIF(window_name = 'label' AND area = 'craft_home') AS later_craft_home_events,
    COUNTIF(window_name = 'label' AND area = 'advanced') AS later_advanced_events,
    MAX(IF(window_name = 'feature' AND area IS NOT NULL, ts, NULL)) AS last_feature_action_ts,
    MIN(IF(window_name = 'label' AND area IS NOT NULL, ts, NULL)) AS first_label_action_ts
  FROM windowed
  GROUP BY 1, 2, 3
)
SELECT
  FORMAT('D%03d', ROW_NUMBER() OVER (ORDER BY FARM_FINGERPRINT(user_pseudo_id))) AS device_label,
  first_day,
  IF(toss_in_feature_window, '토스 관측', '메인·웹만') AS channel_segment,
  profile.device AS device,
  profile.country_group AS country_group,
  profile.acquisition_source AS acquisition_source,
  early_tracked_events,
  early_actions,
  SAFE_DIVIDE(early_actions, early_tracked_events) AS deliberate_share,
  early_action_kinds,
  early_area_count,
  early_event_name_count,
  early_ga_auto_events,
  early_entry_auth_events,
  early_connect_ok_events,
  early_connect_fail_events,
  early_connect_other_events,
  early_other_tracking_events,
  SAFE_DIVIDE(early_ga_auto_events, early_tracked_events) AS ga_auto_share,
  SAFE_DIVIDE(early_entry_auth_events, early_tracked_events) AS entry_auth_share,
  SAFE_DIVIDE(early_other_tracking_events, early_tracked_events) AS other_tracking_share,
  early_nature_events,
  early_fishing_sea_events,
  early_quest_social_events,
  early_craft_home_events,
  early_advanced_events,
  early_chop_tree_events,
  early_mine_ore_events,
  early_npc_talk_events,
  early_tutorial_step_events,
  early_quest_offered_events,
  early_churn_score_events,
  early_session_summary_events,
  early_session_time_events,
  early_econ_tx_events,
  early_zone_enter_events,
  later_actions,
  later_action_kinds,
  later_area_count,
  later_nature_events,
  later_fishing_sea_events,
  later_quest_social_events,
  later_craft_home_events,
  later_advanced_events,
  later_actions > 0 AS later_active,
  CASE
    WHEN early_tracked_events >= 20 AND early_actions >= 6 THEN '고밀도+의도행동 많음'
    WHEN early_tracked_events >= 20 AND early_actions < 6 THEN '고밀도+의도행동 적음'
    WHEN early_tracked_events < 20 AND early_actions > 0 THEN '저밀도+의도행동 있음'
    ELSE '저밀도+의도행동 없음'
  END AS split_segment,
  IF(last_feature_action_ts >= TIMESTAMP_ADD(first_ts, INTERVAL 10 MINUTE), 1, 0) AS feature_boundary_violations,
  IF(first_label_action_ts < TIMESTAMP_ADD(first_ts, INTERVAL 10 MINUTE), 1, 0) AS label_boundary_violations
FROM device_rollup
ORDER BY device_label;
