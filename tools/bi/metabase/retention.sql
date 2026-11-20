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
c as (select d.device, d.first_day from devices_real d where d.first_day between {{from}} and {{to}}),
act as (select distinct e.device, e.day - c.first_day as k from events_real e join c using (device) where e.day - c.first_day between 1 and 30),
lim as (select max(day) as last_day from events_real),
r as (
  select date_trunc('week', c.first_day)::date as wk, g.grp, c.device, max(c.first_day) over (partition by date_trunc('week', c.first_day), g.grp) as wk_last,
         exists (select 1 from act a where a.device = c.device and a.k = 1) as d1,
         exists (select 1 from act a where a.device = c.device and a.k = 3) as d3,
         exists (select 1 from act a where a.device = c.device and a.k = 7) as d7,
         exists (select 1 from act a where a.device = c.device and a.k = 14) as d14,
         exists (select 1 from act a where a.device = c.device and a.k between 1 and 7) as w1
  from c join g using (device)
)
select wk as "첫 방문 주(월요일 시작)", grp as "나눠 보기", count(*) as "기기 수",
       case when max(wk_last) + 1 <= (select last_day from lim) then round(100.0 * count(*) filter (where d1) / count(*), 1) end as "D1 %",
       case when max(wk_last) + 3 <= (select last_day from lim) then round(100.0 * count(*) filter (where d3) / count(*), 1) end as "D3 %",
       case when max(wk_last) + 7 <= (select last_day from lim) then round(100.0 * count(*) filter (where d7) / count(*), 1) end as "D7 %",
       case when max(wk_last) + 14 <= (select last_day from lim) then round(100.0 * count(*) filter (where d14) / count(*), 1) end as "D14 %",
       case when max(wk_last) + 7 <= (select last_day from lim) then round(100.0 * count(*) filter (where w1) / count(*), 1) end as "7일 안 재방문 %"
from r group by wk, grp order by wk, grp
