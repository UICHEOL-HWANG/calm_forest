WITH ev AS (
 SELECT user_pseudo_id, event_name, event_timestamp ts,
  (SELECT value.string_value FROM UNNEST(event_params) WHERE key='method') method,
  (SELECT value.string_value FROM UNNEST(event_params) WHERE key='source') src,
  (SELECT value.string_value FROM UNNEST(event_params) WHERE key='reason') reason,
  (SELECT value.int_value FROM UNNEST(event_params) WHERE key='attempt') attempt
 FROM `calm-forest.analytics_547127440.events_*`
 WHERE _TABLE_SUFFIX BETWEEN '20261028' AND '20261111'
   AND event_timestamp >= UNIX_MICROS(TIMESTAMP '2026-10-28 08:35:44')
), meta AS (SELECT DISTINCT user_pseudo_id FROM ev WHERE event_name='session_start' AND src='meta'),
clk AS (SELECT user_pseudo_id, MIN(ts) cts FROM ev WHERE event_name='login_nudge_click' AND user_pseudo_id IN (SELECT * FROM meta) GROUP BY 1)
SELECT SUBSTR(e.user_pseudo_id,1,6) u,
 STRING_AGG(FORMAT('%s%s@%ds', e.event_name, IFNULL(CONCAT('(',COALESCE(e.method,e.reason,CAST(e.attempt AS STRING)),')'),''), CAST((e.ts-clk.cts)/1e6 AS INT64)), ' > ' ORDER BY e.ts) tl
FROM clk JOIN ev e USING(user_pseudo_id)
WHERE e.ts BETWEEN clk.cts-30000000 AND clk.cts+600000000
 AND e.event_name IN ('login_nudge','login_nudge_click','inapp_nudge_email','save_failed','login','login_screen','signup_gift_claim')
GROUP BY 1
