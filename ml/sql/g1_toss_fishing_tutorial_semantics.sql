-- G1 정정 확인: tutorial_skip은 환영 모달 건너뛰기와 코치 중단에 공용이다.
-- 완전 GA4 일별 export 2026-09-04~12(KST), toss 이벤트, 표시 beta_A/B 제외.
WITH events AS (
  SELECT
    event_name, user_pseudo_id,
    (SELECT ep.value.string_value FROM UNNEST(event_params) ep
      WHERE ep.key='platform' LIMIT 1) AS platform,
    (SELECT up.value.string_value FROM UNNEST(user_properties) up
      WHERE up.key='ab_variant' LIMIT 1) AS ab_variant,
    (SELECT COALESCE(ep.value.string_value, CAST(ep.value.int_value AS STRING))
      FROM UNNEST(event_params) ep WHERE ep.key='at' LIMIT 1) AS at_value
  FROM `calm-forest.analytics_547127440.events_*`
  WHERE _TABLE_SUFFIX BETWEEN '20260904' AND '20260912'
)
SELECT event_name, COALESCE(at_value,'(없음)') AS at_value,
  COUNT(*) AS event_rows, COUNT(DISTINCT user_pseudo_id) AS devices
FROM events
WHERE platform='toss'
  AND NOT REGEXP_CONTAINS(COALESCE(ab_variant,''), r'^beta_[AB]$')
  AND event_name IN ('tutorial_complete','tutorial_skip')
GROUP BY event_name, at_value
ORDER BY event_name, event_rows DESC;
