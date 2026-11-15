WITH ev AS (
 SELECT user_pseudo_id, event_name, event_timestamp ts,
  (SELECT value.string_value FROM UNNEST(event_params) WHERE key='method') method,
  (SELECT value.string_value FROM UNNEST(event_params) WHERE key='result') result,
  (SELECT value.string_value FROM UNNEST(event_params) WHERE key='source') src,
  (SELECT value.string_value FROM UNNEST(event_params) WHERE key='page_location') loc
 FROM `calm-forest.analytics_547127440.events_*`
 WHERE _TABLE_SUFFIX BETWEEN '20261028' AND '20261111'
   AND event_timestamp >= UNIX_MICROS(TIMESTAMP '2026-10-28 08:35:44')
), u AS (
 SELECT user_pseudo_id,
  MIN(IF(event_name='login' AND method IN ('anonymous','guest_deferred','offline'), ts, NULL)) guest_ts,
  MIN(IF(event_name='login_nudge', ts, NULL)) nudge_ts,
  MAX(IF(event_name='login_nudge_click',1,0)) clicked,
  MIN(IF(event_name='login' AND method NOT IN ('anonymous','guest_deferred','offline'), ts, NULL)) real_ts,
  MAX(IF(event_name='signup_gift_claim' AND result='new',1,0)) gift_new,
  MAX(IF(event_name='session_start' AND src='meta',1,0)) meta,
  MAX(IF(REGEXP_CONTAINS(IFNULL(loc,''), r'^https?://(localhost|127\.0\.0\.1)'),1,0)) dev
 FROM ev GROUP BY 1
)
SELECT IF(meta=1,'meta','other') src,
 COUNTIF(guest_ts IS NOT NULL) guests,
 COUNTIF(guest_ts IS NOT NULL AND nudge_ts IS NOT NULL) nudged,
 COUNTIF(guest_ts IS NOT NULL AND nudge_ts IS NOT NULL AND clicked=1) clicked,
 COUNTIF(guest_ts IS NOT NULL AND real_ts > guest_ts) converted_any,
 COUNTIF(guest_ts IS NOT NULL AND gift_new=1) gift_claimed
FROM u WHERE dev=0
GROUP BY 1 ORDER BY 1
