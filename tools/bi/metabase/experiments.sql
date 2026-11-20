with c as (select d.* from devices_real d where d.first_day between {{from}} and {{to}}),
lim as (select max(day) as last_day from events_real),
x as (
  select 'E3 공간 연결' as exp, exp_space as arm, c.* from c where exp_space is not null
  union all select 'E5 로그인 화면', exp_login, c.* from c where exp_login is not null
  union all select 'E6 안내 개편', exp_guide, c.* from c where exp_guide is not null
  union all select 'E7 이름 미리 채움', exp_name, c.* from c where exp_name is not null
)
select exp as "실험", arm as "무리", count(*) as "기기 수",
       round(100.0 * count(*) filter (where day0_name_screen) / count(*), 1) as "첫날 이름 화면 %",
       round(100.0 * count(*) filter (where day0_character) / count(*), 1) as "첫날 캐릭터 선택 %",
       round(100.0 * count(*) filter (where day0_first_action) / count(*), 1) as "첫날 첫 행동 %",
       round(100.0 * count(*) filter (where day0_house1) / count(*), 1) as "첫날 집 기초 %",
       round(100.0 * count(*) filter (where day0_house3) / count(*), 1) as "첫날 집 지붕 %",
       round(100.0 * count(*) filter (where d1 and first_day + 1 <= (select last_day from lim)) / nullif(count(*) filter (where first_day + 1 <= (select last_day from lim)), 0), 1) as "D1 %"
from x group by exp, arm order by exp, arm
