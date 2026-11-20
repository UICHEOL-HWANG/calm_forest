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
cg as (select g.grp, count(*) as n from c join g using (device) group by g.grp)
select ed.area as "영역", g.grp as "나눠 보기", count(distinct e.device) as "도달 기기",
       max(cg.n) as "새 기기", round(100.0 * count(distinct e.device) / max(cg.n), 1) as "도달 %"
from c join g using (device)
join events_real e on e.device = c.device and e.day between c.first_day and c.first_day + 6
join event_dict ed on ed.event = e.event and not ed.hidden and ed.area not in ('GA4 자동', '시스템·오류', '실험·계측')
join cg on cg.grp = g.grp
group by ed.area, g.grp order by g.grp, 5 desc
