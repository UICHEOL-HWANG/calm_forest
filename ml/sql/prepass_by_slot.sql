DECLARE d_from STRING DEFAULT '20261112';
DECLARE d_to STRING DEFAULT FORMAT_DATE('%Y%m%d', CURRENT_DATE('Asia/Seoul'));

WITH ev AS (
  SELECT
    user_pseudo_id AS id,
    event_name AS e,
    TIMESTAMP_MICROS(event_timestamp) AS ts,
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'slot') AS slot,
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'arm') AS arm,
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'result') AS result,
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'branch') AS branch,
    (SELECT COALESCE(value.int_value, CAST(value.double_value AS INT64), SAFE_CAST(value.string_value AS INT64)) FROM UNNEST(event_params) WHERE key = 'stage') AS stage,
    COALESCE(
      (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'platform'),
      (SELECT value.string_value FROM UNNEST(user_properties) WHERE key = 'platform')
    ) AS platform
  FROM `calm-forest.analytics_547127440.events_*`
  WHERE _TABLE_SUFFIX BETWEEN d_from AND d_to
    AND user_pseudo_id IS NOT NULL
    AND event_name IN ('prepass_eligible', 'prepass_ad_result', 'house_build', 'bridge_repaired', 'farm_expand', 'tree_deco_place', 'cafe_serve')
),
first_seen AS (
  SELECT id, slot, ANY_VALUE(arm) AS arm, ANY_VALUE(platform) AS platform, MIN(ts) AS t0
  FROM ev
  WHERE e = 'prepass_eligible' AND slot IS NOT NULL
  GROUP BY id, slot
),
shaped AS (
  SELECT
    f.*,
    CASE
      WHEN REGEXP_CONTAINS(slot, r'^house\d+$') THEN 'house'
      WHEN slot = 'bridge' THEN 'bridge'
      WHEN REGEXP_CONTAINS(slot, r'^farm\d+$') THEN 'farm'
      WHEN STARTS_WITH(slot, 'branch_') THEN 'branch'
      WHEN slot = 'cafe_order' THEN 'cafe'
      ELSE 'repeat'
    END AS place,
    SAFE_CAST(REGEXP_EXTRACT(slot, r'(\d+)$') AS INT64) AS need_stage,
    REGEXP_EXTRACT(slot, r'^branch_(.+)$') AS need_branch,
    IF(REGEXP_CONTAINS(slot, r'^farm\d+$'), 72, 24) AS win_h
  FROM first_seen f
),
judged AS (
  SELECT
    s.id, s.slot, s.place, s.arm, s.platform,
    LOGICAL_OR(v.e = 'prepass_ad_result') AS ad_tried,
    LOGICAL_OR(v.e = 'prepass_ad_result' AND v.result = 'complete') AS ad_done,
    IF(s.place = 'repeat', NULL, LOGICAL_OR(
      v.ts BETWEEN s.t0 AND TIMESTAMP_ADD(s.t0, INTERVAL s.win_h HOUR) AND (
        (s.place = 'house' AND v.e = 'house_build' AND v.stage >= s.need_stage) OR
        (s.place = 'bridge' AND v.e = 'bridge_repaired') OR
        (s.place = 'farm' AND v.e = 'farm_expand' AND v.stage >= s.need_stage) OR
        (s.place = 'branch' AND v.e = 'tree_deco_place' AND v.branch = s.need_branch) OR
        (s.place = 'cafe' AND v.e = 'cafe_serve')
      )
    )) AS passed
  FROM shaped s
  LEFT JOIN ev v
    ON v.id = s.id AND v.ts >= s.t0
    AND (v.e <> 'prepass_ad_result' OR v.slot = s.slot)
  GROUP BY s.id, s.slot, s.place, s.arm, s.platform
)
SELECT
  place,
  slot,
  arm,
  COUNT(*) AS devices,
  COUNTIF(ad_tried) AS ad_tried,
  COUNTIF(ad_done) AS ad_done,
  COUNTIF(passed) AS passed,
  ROUND(SAFE_DIVIDE(COUNTIF(passed), COUNTIF(passed IS NOT NULL)), 3) AS pass_rate
FROM judged
GROUP BY GROUPING SETS ((place, slot, arm), (place, arm), (arm))
ORDER BY place, slot, arm;
