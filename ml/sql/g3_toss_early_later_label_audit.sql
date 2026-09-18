-- G3 candidate audit, NOT a model or live experiment.
-- Cohort: GA4 device with platform='toss', first seen 2026-09-04..09-11 KST,
-- beta_A/B marker absent. Device ID is used only inside the query.
-- Feature window [first_toss_ts, +10m); candidate label [+10m, +24h).
-- Exclude devices without a full 24h of complete daily-export observation.
-- Only aggregate rows leave BigQuery. Automatic/login/bookkeeping events excluded.
WITH actions AS (
  SELECT action_name FROM UNNEST([
    'chop_tree','first_chop','plant_seed','water_crop','harvest_crop','forage_pick',
    'mine_ore','fishing_cast','fishing_catch','fishing_miss','sea_cast','sea_catch',
    'shop_sell','shop_buy','craft_item','place_decor','house_complete','house_expand',
    'npc_talk','quest_accept','quest_complete','gift_give','cooking_start','carve_start',
    'boat_start','mist_purify_start','firefly_swing','coop_build','coop_feed',
    'coop_collect','cafe_serve','photo_capture','dex_open','album_open',
    'leaderboard_open'
  ]) AS action_name
), base AS (
  SELECT user_pseudo_id, TIMESTAMP_MICROS(event_timestamp) AS ts, event_name,
    (SELECT ep.value.string_value FROM UNNEST(event_params) ep
      WHERE ep.key = 'platform' LIMIT 1) AS platform,
    (SELECT up.value.string_value FROM UNNEST(user_properties) up
      WHERE up.key = 'ab_variant' LIMIT 1) AS ab_variant
  FROM `calm-forest.analytics_547127440.events_*`
  WHERE _TABLE_SUFFIX BETWEEN '20260904' AND '20260912'
    AND user_pseudo_id IS NOT NULL
), toss AS (
  SELECT * FROM base WHERE platform = 'toss'
), first_seen AS (
  SELECT user_pseudo_id, MIN(ts) AS first_ts,
    LOGICAL_OR(REGEXP_CONTAINS(COALESCE(ab_variant,''), r'^beta_[AB]$')) AS beta_marked
  FROM toss GROUP BY 1
), devices AS (
  SELECT t.user_pseudo_id, f.first_ts,
    COUNTIF(t.ts < TIMESTAMP_ADD(f.first_ts, INTERVAL 10 MINUTE)
      AND t.event_name IN (SELECT action_name FROM actions)) AS early_actions,
    COUNTIF(t.ts >= TIMESTAMP_ADD(f.first_ts, INTERVAL 10 MINUTE)
      AND t.ts < TIMESTAMP_ADD(f.first_ts, INTERVAL 24 HOUR)
      AND t.event_name IN (SELECT action_name FROM actions)) AS later_actions,
    MAX(IF(t.ts < TIMESTAMP_ADD(f.first_ts, INTERVAL 10 MINUTE)
      AND t.event_name IN (SELECT action_name FROM actions), t.ts, NULL)) AS last_feature_ts,
    MIN(IF(t.ts >= TIMESTAMP_ADD(f.first_ts, INTERVAL 10 MINUTE)
      AND t.ts < TIMESTAMP_ADD(f.first_ts, INTERVAL 24 HOUR)
      AND t.event_name IN (SELECT action_name FROM actions), t.ts, NULL)) AS first_label_ts
  FROM toss t JOIN first_seen f USING (user_pseudo_id)
  WHERE NOT f.beta_marked
    AND f.first_ts < TIMESTAMP_SUB(TIMESTAMP('2026-09-13 00:00:00','Asia/Seoul'), INTERVAL 24 HOUR)
  GROUP BY 1,2
)
SELECT
  CASE WHEN early_actions = 0 THEN '0회'
       WHEN early_actions BETWEEN 1 AND 5 THEN '1~5회'
       ELSE '6회 이상' END AS early_segment,
  COUNT(*) AS devices,
  COUNTIF(later_actions > 0) AS later_active_devices,
  COUNTIF(later_actions = 0) AS later_inactive_devices,
  SUM(early_actions) AS early_action_events,
  SUM(later_actions) AS later_action_events,
  COUNTIF(last_feature_ts >= TIMESTAMP_ADD(first_ts, INTERVAL 10 MINUTE)) AS feature_boundary_violations,
  COUNTIF(first_label_ts < TIMESTAMP_ADD(first_ts, INTERVAL 10 MINUTE)) AS label_boundary_violations
FROM devices
GROUP BY 1
ORDER BY CASE early_segment WHEN '0회' THEN 0 WHEN '1~5회' THEN 1 ELSE 2 END;
