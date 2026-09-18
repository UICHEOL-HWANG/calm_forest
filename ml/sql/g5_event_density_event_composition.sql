-- G5 event-density composition audit, NOT a model and NOT an A/B read.
-- Question: does the strong early_tracked_events signal come from real play
-- actions, or from automatic/session/entry/connect event volume?
-- Cohort: GA4 devices whose first observed event in the full export history is
-- 2026-09-04..2026-09-11 KST, with a complete 24h label window available.
-- Exclude marked beta tester devices (ab_variant beta_A/beta_B).
-- Do not segment or draw conclusions by A/B arm.
-- Feature window: [first_ts, +10m). Label: [+10m, +24h).
-- Raw GA4 device IDs stay inside the query; output is aggregate only.
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
    (SELECT ep.value.string_value FROM UNNEST(event_params) ep
      WHERE ep.key = 'platform' LIMIT 1) AS platform,
    (SELECT ep.value.string_value FROM UNNEST(event_params) ep
      WHERE ep.key = 'result' LIMIT 1) AS connect_result,
    (SELECT up.value.string_value FROM UNNEST(user_properties) up
      WHERE up.key = 'ab_variant' LIMIT 1) AS ab_variant
  FROM `calm-forest.analytics_547127440.events_*`
  WHERE _TABLE_SUFFIX NOT LIKE 'intraday_%'
    AND _TABLE_SUFFIX BETWEEN '20260727' AND '20260912'
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
eligible AS (
  SELECT *
  FROM first_seen
  WHERE NOT beta_marked
    AND first_day BETWEEN DATE '2026-09-04' AND DATE '2026-09-11'
    AND first_ts < TIMESTAMP_SUB(TIMESTAMP('2026-09-13 00:00:00', 'Asia/Seoul'), INTERVAL 24 HOUR)
),
windowed AS (
  SELECT
    b.user_pseudo_id,
    b.ts,
    b.event_name,
    b.platform,
    b.connect_result,
    e.first_ts,
    a.area,
    CASE
      WHEN b.ts >= e.first_ts
       AND b.ts < TIMESTAMP_ADD(e.first_ts, INTERVAL 10 MINUTE) THEN 'feature'
      WHEN b.ts >= TIMESTAMP_ADD(e.first_ts, INTERVAL 10 MINUTE)
       AND b.ts < TIMESTAMP_ADD(e.first_ts, INTERVAL 24 HOUR) THEN 'label'
      ELSE 'outside'
    END AS window_name
  FROM base b
  JOIN eligible e USING (user_pseudo_id)
  LEFT JOIN actions a ON b.event_name = a.action_name
  WHERE b.ts >= e.first_ts
    AND b.ts < TIMESTAMP_ADD(e.first_ts, INTERVAL 24 HOUR)
),
device AS (
  SELECT
    user_pseudo_id,
    COUNTIF(window_name = 'feature') AS early_tracked_events,
    COUNTIF(window_name = 'feature' AND area IS NOT NULL) AS early_actions,
    COUNTIF(window_name = 'label' AND area IS NOT NULL) AS later_actions
  FROM windowed
  GROUP BY 1
),
event_rows AS (
  SELECT
    w.user_pseudo_id,
    w.event_name,
    CASE
      WHEN w.area IS NOT NULL THEN CONCAT('의도행동:', w.area)
      WHEN w.event_name IN ('first_visit', 'session_start', 'page_view', 'user_engagement', 'scroll') THEN 'GA4 자동·세션'
      WHEN w.event_name IN ('login', 'login_screen', 'tutorial_start', 'tutorial_complete') THEN '진입·로그인·튜토리얼'
      WHEN w.event_name = 'toss_connect' AND w.connect_result = 'ok' THEN '토스 연결 성공'
      WHEN w.event_name = 'toss_connect' AND w.connect_result = 'fail' THEN '토스 연결 실패'
      WHEN w.event_name = 'toss_connect' THEN '토스 연결 기타'
      ELSE '기타 추적'
    END AS event_category,
    CASE
      WHEN d.early_tracked_events >= 20 AND d.early_actions >= 6 THEN '고밀도+의도행동 많음'
      WHEN d.early_tracked_events >= 20 AND d.early_actions < 6 THEN '고밀도+의도행동 적음'
      WHEN d.early_tracked_events < 20 AND d.early_actions > 0 THEN '저밀도+의도행동 있음'
      ELSE '저밀도+의도행동 없음'
    END AS split_segment,
    d.later_actions > 0 AS later_active
  FROM windowed w
  JOIN device d USING (user_pseudo_id)
  WHERE w.window_name = 'feature'
),
group_totals AS (
  SELECT
    split_segment,
    later_active,
    COUNT(DISTINCT user_pseudo_id) AS devices_in_group,
    COUNT(*) AS total_early_events_in_group
  FROM event_rows
  GROUP BY 1, 2
),
event_composition AS (
  SELECT
    er.split_segment,
    er.later_active,
    er.event_category,
    er.event_name,
    COUNT(DISTINCT er.user_pseudo_id) AS devices_with_event,
    COUNT(*) AS event_count
  FROM event_rows er
  GROUP BY 1, 2, 3, 4
)
SELECT
  ec.split_segment,
  ec.later_active,
  gt.devices_in_group,
  gt.total_early_events_in_group,
  ec.event_category,
  ec.event_name,
  ec.devices_with_event,
  ec.event_count,
  SAFE_DIVIDE(ec.event_count, gt.total_early_events_in_group) AS event_share
FROM event_composition ec
JOIN group_totals gt USING (split_segment, later_active)
ORDER BY
  CASE ec.split_segment
    WHEN '저밀도+의도행동 없음' THEN 1
    WHEN '저밀도+의도행동 있음' THEN 2
    WHEN '고밀도+의도행동 적음' THEN 3
    WHEN '고밀도+의도행동 많음' THEN 4
    ELSE 5
  END,
  ec.later_active DESC,
  ec.event_count DESC,
  ec.event_name;
