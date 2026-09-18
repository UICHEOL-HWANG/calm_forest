-- G1 data reliability: event taxonomy actually present in GA4.
select
  event_name,
  count(*) as events,
  count(distinct user_pseudo_id) as devices,
  min(parse_date('%Y%m%d', event_date)) as first_day,
  max(parse_date('%Y%m%d', event_date)) as last_day,
  round(100 * safe_divide(countif(user_pseudo_id is null), count(*)), 2) as missing_device_pct
from `calm-forest.analytics_547127440.events_*`
where regexp_contains(_table_suffix, r'^\d{8}$')
  and parse_date('%Y%m%d', event_date) <= current_date('Asia/Seoul')
group by event_name
order by events desc;
