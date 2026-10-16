CREATE SCHEMA IF NOT EXISTS `calm-forest.ads` OPTIONS (location = 'asia-northeast3');

CREATE OR REPLACE TABLE `calm-forest.ads.funnel_user` AS
WITH ev AS (
  SELECT
    user_pseudo_id, user_id, event_name, event_timestamp,
    PARSE_DATE('%Y%m%d', event_date) AS d,
    device.operating_system AS dev_os,
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'source') AS src,
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'campaign') AS campaign,
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'content') AS content,
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'platform') AS plat,
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'os') AS b_os,
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'jid') AS jid,
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'page_location') AS loc
  FROM `calm-forest.analytics_547127440.events_*`
  WHERE _TABLE_SUFFIX BETWEEN FORMAT_DATE('%Y%m%d', @start) AND FORMAT_DATE('%Y%m%d', @end)
),
land AS (
  SELECT user_pseudo_id,
    ARRAY_AGG(STRUCT(d, campaign, content, dev_os, event_timestamp AS ts) ORDER BY event_timestamp LIMIT 1)[OFFSET(0)] AS l
  FROM ev
  WHERE event_name = 'session_start' AND src = @src AND d <= @land_end
  GROUP BY 1
),
web AS (
  SELECT
    land.user_pseudo_id,
    land.l.d AS d,
    land.l.ts AS land_ts,
    IFNULL(land.l.campaign, '') AS campaign,
    IFNULL(land.l.content, '') AS content,
    CASE land.l.dev_os WHEN 'Android' THEN 'android' WHEN 'iOS' THEN 'ios' ELSE 'other' END AS os,
    MAX(e.user_id) AS uid,
    MAX(IF(e.event_name IN ('login', 'deferred_guest') AND e.plat = 'web', 1, 0)) AS first_play,
    MAX(IF(e.event_name = 'harvest_crop' AND e.plat = 'web', 1, 0)) AS harvest,
    MAX(IF(e.event_name = 'app_banner_shown' AND e.b_os = 'android', 1, 0)) AS shown_aos,
    MAX(IF(e.event_name = 'app_banner_shown' AND e.b_os = 'ios', 1, 0)) AS shown_ios,
    MAX(IF(e.event_name = 'app_banner_holdout', 1, 0)) AS holdout,
    MAX(IF(e.event_name = 'app_banner_click' AND e.b_os = 'android', 1, 0)) AS click_aos,
    MAX(IF(e.event_name = 'app_banner_click' AND e.b_os = 'ios', 1, 0)) AS click_ios,
    ARRAY_AGG(IF(e.event_name = 'app_banner_click' AND e.jid != '', e.jid, NULL) IGNORE NULLS ORDER BY e.event_timestamp DESC LIMIT 1)[SAFE_OFFSET(0)] AS jid,
    MAX(IF(REGEXP_CONTAINS(IFNULL(e.loc, ''), r'^https?://(localhost|127\.0\.0\.1)'), 1, 0)) AS dev
  FROM land JOIN ev e USING (user_pseudo_id)
  WHERE e.event_timestamp >= land.l.ts
  GROUP BY 1, 2, 3, 4, 5, 6
),
inst AS (
  SELECT jid, MAX(user_id) AS user_id
  FROM ev
  WHERE event_name = 'install_attribution' AND plat = 'android' AND IFNULL(jid, '') != ''
  GROUP BY 1
),
sl AS (
  SELECT user_id, platform, is_guest, started_at, DATE(started_at, 'Asia/Seoul') AS d
  FROM `calm-forest.calm_forest_raw.session_logs`
  WHERE platform IN ('android', 'ios') AND user_id IS NOT NULL
  QUALIFY ROW_NUMBER() OVER (PARTITION BY session_id ORDER BY updated_at DESC) = 1
),
linked AS (
  SELECT w.*, inst.jid IS NOT NULL AS jid_hit, COALESCE(inst.user_id, w.uid) AS app_uid
  FROM web w LEFT JOIN inst ON inst.jid = w.jid
),
app AS (
  SELECT k.user_pseudo_id,
    MAX(IF(k.jid_hit OR s.platform = 'android', 1, 0)) AS open_aos,
    MAX(IF(s.platform = 'ios', 1, 0)) AS open_ios,
    MAX(IF(s.is_guest = FALSE, 1, 0)) AS app_login,
    MIN(s.d) AS app_d0
  FROM linked k LEFT JOIN sl s ON s.user_id = k.app_uid AND s.started_at >= TIMESTAMP_MICROS(k.land_ts)
  GROUP BY 1
),
d1 AS (
  SELECT a.user_pseudo_id, 1 AS app_d1
  FROM app a JOIN linked k USING (user_pseudo_id)
  JOIN sl s ON s.user_id = k.app_uid AND s.d = DATE_ADD(a.app_d0, INTERVAL 1 DAY)
  GROUP BY 1
)
SELECT k.* EXCEPT (uid, jid, app_uid, jid_hit, land_ts),
  IFNULL(a.open_aos, 0) AS open_aos, IFNULL(a.open_ios, 0) AS open_ios,
  IFNULL(a.app_login, 0) AS app_login, IFNULL(d1.app_d1, 0) AS app_d1,
  CURRENT_TIMESTAMP() AS built_at
FROM linked k
LEFT JOIN app a USING (user_pseudo_id)
LEFT JOIN d1 USING (user_pseudo_id);

CREATE OR REPLACE TABLE `calm-forest.ads.funnel_daily` AS
SELECT d,
  COUNT(*) AS landed, SUM(first_play) AS first_play, SUM(harvest) AS harvest,
  SUM(shown_aos) AS shown_aos, SUM(shown_ios) AS shown_ios, SUM(holdout) AS holdout,
  SUM(click_aos) AS click_aos, SUM(click_ios) AS click_ios,
  SUM(open_aos) AS open_aos, SUM(open_ios) AS open_ios,
  SUM(app_login) AS app_login, SUM(app_d1) AS app_d1,
  COUNTIF(campaign = '') AS no_campaign,
  CURRENT_TIMESTAMP() AS built_at
FROM `calm-forest.ads.funnel_user`
WHERE dev = 0
GROUP BY d;

CREATE OR REPLACE TABLE `calm-forest.ads.creative_daily` AS
SELECT d, campaign, content, os,
  COUNT(*) AS landed, SUM(first_play) AS first_play, SUM(harvest) AS harvest,
  SUM(click_aos) + SUM(click_ios) AS banner_click,
  SUM(open_aos) + SUM(open_ios) AS app_open, SUM(app_d1) AS app_d1,
  CURRENT_TIMESTAMP() AS built_at
FROM `calm-forest.ads.funnel_user`
WHERE dev = 0
GROUP BY d, campaign, content, os;
