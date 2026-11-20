with g as (
  select d.device,
         case {{split}}
           when '플랫폼' then coalesce(d.first_platform, '(없음)')
           when '기기 종류' then coalesce(d.device_cat, '(없음)')
           when '유입 소스' then coalesce(d.utm_source, '(없음)')
           when 'E5 로그인' then coalesce(d.exp_login, '(미배정)')
           when 'E6 안내' then coalesce(d.exp_guide, '(미배정)')
           when 'E7 이름' then coalesce(d.exp_name, '(미배정)')
           when 'E3 공간' then coalesce(d.exp_space, '(미배정)')
           else '전체' end as grp
  from devices_real d
),
s1 as (
  select e.device, min(e.ts) as t from events_real e
  where e.event in (select event from event_dict where label = {{s1}} or event = {{s1}})
    and e.day between {{from}} and {{to}}
  group by e.device
),
s2 as (
  select s1.device, min(e.ts) as t from s1 join events_real e on e.device = s1.device
  where e.event in (select event from event_dict where label = {{s2}} or event = {{s2}})
    and e.ts >= s1.t and e.ts <= s1.t + make_interval(hours => {{hours}})
  group by s1.device
)
[[, s3 as (
  select s2.device, min(e.ts) as t from s2 join s1 using (device) join events_real e on e.device = s2.device
  where e.event in (select event from event_dict where label = {{s3}} or event = {{s3}})
    and e.ts >= s2.t and e.ts <= s1.t + make_interval(hours => {{hours}})
  group by s2.device
)]]
[[, s4 as (
  select s3.device, min(e.ts) as t from s3 join s1 using (device) join events_real e on e.device = s3.device
  where e.event in (select event from event_dict where label = {{s4}} or event = {{s4}})
    and e.ts >= s3.t and e.ts <= s1.t + make_interval(hours => {{hours}})
  group by s3.device
)]]
[[, s5 as (
  select s4.device, min(e.ts) as t from s4 join s1 using (device) join events_real e on e.device = s4.device
  where e.event in (select event from event_dict where label = {{s5}} or event = {{s5}})
    and e.ts >= s4.t and e.ts <= s1.t + make_interval(hours => {{hours}})
  group by s4.device
)]],
steps as (
  select device, 1 as step from s1
  union all select device, 2 from s2
  [[union all select device, 3 from s3 where {{s3}} is not null]]
  [[union all select device, 4 from s4 where {{s4}} is not null]]
  [[union all select device, 5 from s5 where {{s5}} is not null]]
),
n as (
  select g.grp, steps.step, count(*) as devices from steps join g using (device) group by g.grp, steps.step
)
select grp as "나눠 보기", step as "단계", devices as "기기 수",
       round(100.0 * devices / first_value(devices) over (partition by grp order by step), 1) as "1단계 대비 %",
       round(100.0 * devices / lag(devices) over (partition by grp order by step), 1) as "이전 단계 대비 %"
from n order by grp, step
