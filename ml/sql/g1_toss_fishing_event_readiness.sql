-- G1: GA4가 토스 낚시 실험의 기기·튜토리얼·행동 시각을 연결할 수 있는지 감사.
-- 완전 일별 export 2026-09-04~12(KST)만 사용; intraday 제외.
-- event_params.platform='toss'만 토스로 간주하고, 표시된 beta_A/B 행은 제외.
-- 미표식 유급 테스터가 남을 수 있으며, ID 값은 집계 밖으로 내보내지 않는다.
WITH events AS (
  SELECT
    event_name, event_timestamp, user_pseudo_id,
    (SELECT ep.value.string_value FROM UNNEST(event_params) ep
      WHERE ep.key='platform' LIMIT 1) AS platform,
    (SELECT ep.value.string_value FROM UNNEST(event_params) ep
      WHERE ep.key='client_id' LIMIT 1) AS client_id_param,
    (SELECT ep.value.int_value FROM UNNEST(event_params) ep
      WHERE ep.key='ga_session_id' LIMIT 1) AS ga_session_id,
    (SELECT up.value.string_value FROM UNNEST(user_properties) up
      WHERE up.key='ab_variant' LIMIT 1) AS ab_variant,
    (SELECT ep.value.string_value FROM UNNEST(event_params) ep
      WHERE ep.key='arm' LIMIT 1) AS arm,
    (SELECT ep.value.int_value FROM UNNEST(event_params) ep
      WHERE ep.key='shown' LIMIT 1) AS shown_int,
    (SELECT ep.value.string_value FROM UNNEST(event_params) ep
      WHERE ep.key='shown' LIMIT 1) AS shown_string
  FROM `calm-forest.analytics_547127440.events_*`
  WHERE _TABLE_SUFFIX BETWEEN '20260904' AND '20260912'
), toss AS (
  SELECT * FROM events
  WHERE platform='toss'
    AND NOT REGEXP_CONTAINS(COALESCE(ab_variant,''), r'^beta_[AB]$')
)
SELECT
  event_name,
  COUNT(*) AS event_rows,
  COUNT(DISTINCT user_pseudo_id) AS devices,
  COUNTIF(user_pseudo_id IS NULL) AS missing_pseudo_rows,
  COUNTIF(ga_session_id IS NOT NULL) AS ga_session_rows,
  COUNTIF(client_id_param IS NOT NULL) AS client_id_rows,
  COUNTIF(arm IS NOT NULL) AS arm_rows,
  COUNTIF(shown_int IS NOT NULL OR shown_string IS NOT NULL) AS shown_param_rows
FROM toss
WHERE event_name IN (
  'tutorial_complete','tutorial_skip','fishing_cast','fishing_catch',
  'churn_score','zone_enter','recommendation_impression','experiment_assign'
)
GROUP BY event_name
ORDER BY event_rows DESC, event_name;
