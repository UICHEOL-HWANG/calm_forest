-- G1: 과거 로그로 복원 가능한 퍼널의 최대 범위를 확인한다.
-- 이 표는 적격자나 실험 결과가 아니다. 호숫가 위치·도구 상태·진짜 첫 세션은 미계측.
-- 완전 GA4 일별 export 2026-09-04~12(KST), platform=toss, 표시 beta_A/B 제외.
WITH events AS (
  SELECT
    user_pseudo_id, event_name, event_timestamp,
    (SELECT ep.value.string_value FROM UNNEST(event_params) ep
      WHERE ep.key='platform' LIMIT 1) AS platform,
    (SELECT up.value.string_value FROM UNNEST(user_properties) up
      WHERE up.key='ab_variant' LIMIT 1) AS ab_variant
  FROM `calm-forest.analytics_547127440.events_*`
  WHERE _TABLE_SUFFIX BETWEEN '20260904' AND '20260912'
), toss AS (
  SELECT * FROM events
  WHERE platform='toss' AND user_pseudo_id IS NOT NULL
    AND NOT REGEXP_CONTAINS(COALESCE(ab_variant,''), r'^beta_[AB]$')
), per_device AS (
  SELECT
    user_pseudo_id,
    MIN(event_timestamp) AS first_toss_ts,
    MIN(IF(event_name IN ('tutorial_complete','tutorial_skip'), event_timestamp, NULL)) AS tutorial_end_ts,
    MIN(IF(event_name='fishing_cast', event_timestamp, NULL)) AS first_cast_ts,
    MIN(IF(event_name='fishing_catch', event_timestamp, NULL)) AS first_catch_ts,
    COUNTIF(event_name='churn_score') AS score_rows
  FROM toss GROUP BY user_pseudo_id
)
SELECT
  COUNT(*) AS toss_devices,
  COUNTIF(tutorial_end_ts IS NOT NULL) AS tutorial_end_devices,
  COUNTIF(first_cast_ts IS NOT NULL) AS cast_devices,
  COUNTIF(first_catch_ts IS NOT NULL) AS catch_devices,
  COUNTIF(tutorial_end_ts IS NOT NULL AND first_cast_ts IS NOT NULL
    AND first_cast_ts >= tutorial_end_ts) AS cast_after_tutorial_devices,
  COUNTIF(tutorial_end_ts IS NOT NULL AND first_cast_ts BETWEEN tutorial_end_ts
    AND tutorial_end_ts + 10*60*1000000) AS cast_within_10m_of_tutorial_devices,
  COUNTIF(score_rows > 0) AS scored_devices
FROM per_device;
