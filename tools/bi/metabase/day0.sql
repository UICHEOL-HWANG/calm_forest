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
c as (select d.* from devices_real d where d.first_day between {{from}} and {{to}}),
x as (
  select g.grp, count(*) as n,
         count(*) filter (where c.day0_login_screen) as a1, count(*) filter (where c.day0_name_screen) as a2,
         count(*) filter (where c.day0_character) as a3, count(*) filter (where c.day0_first_action) as a4,
         count(*) filter (where c.day0_harvest) as a5, count(*) filter (where c.day0_house1) as a6,
         count(*) filter (where c.day0_house3) as a7
  from c join g using (device) group by g.grp
)
select x.grp as "나눠 보기", v.step as "순서", v.label as "첫날 도달 단계", v.k as "기기 수", round(100.0 * v.k / x.n, 1) as "첫 방문 대비 %"
from x cross join lateral (values (0, '첫 방문', x.n), (1, '로그인 화면', x.a1), (2, '이름 화면', x.a2), (3, '캐릭터 선택', x.a3),
                                   (4, '첫 행동', x.a4), (5, '첫 수확', x.a5), (6, '집 기초', x.a6), (7, '집 지붕', x.a7)) v(step, label, k)
order by x.grp, v.step
