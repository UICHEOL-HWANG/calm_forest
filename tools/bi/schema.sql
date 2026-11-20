create table if not exists events (
  ga_day date not null,
  day date not null,
  ts timestamptz not null,
  device text not null,
  user_id text,
  event text not null,
  session_id bigint,
  host text,
  country text,
  os text,
  device_cat text,
  platform text, stage text, result text, kind text, item text, reason text, arm text, step text,
  slot text, via text, src text, npc text, mode text, quest_id text,
  params jsonb not null default '{}',
  uprops jsonb not null default '{}',
  is_test boolean not null default false
);
create index if not exists events_day on events (day);
create index if not exists events_ga_day on events (ga_day);
create index if not exists events_event_day on events (event, day);
create index if not exists events_device_ts on events (device, ts);

create table if not exists sync_log (
  day date primary key,
  rows integer not null,
  loaded_at timestamptz not null default now()
);

create table if not exists event_dict (
  event text primary key,
  label text,
  area text,
  description text,
  hidden boolean not null default false
);

create table if not exists devices (device text primary key);

create or replace view events_real as select * from events where not is_test;

create or replace function refresh_devices() returns void language plpgsql as $$
begin
  drop table if exists devices_next;
  create table devices_next as
  with first_ev as (
    select distinct on (device) device, day as first_day, platform as first_platform, host as first_host,
           country, os, device_cat, params->>'page_location' as landing
    from events order by device, ts
  ),
  agg as (
    select device,
           bool_or(is_test) as is_test,
           max(day) as last_day,
           count(distinct day) as active_days,
           count(*) as events,
           max(uprops->>'exp_login') as exp_login,
           max(uprops->>'exp_guide') as exp_guide,
           max(uprops->>'exp_name') as exp_name,
           max(uprops->>'exp_space') as exp_space,
           max(uprops->>'exp_arm') as exp_arm,
           max(uprops->>'install_source') as install_source,
           max(uprops->>'install_campaign') as install_campaign,
           max(uprops->>'heard_from') as heard_from
    from events group by device
  ),
  d0 as (
    select e.device,
           bool_or(e.event = 'login_screen') as day0_login_screen,
           bool_or(e.event = 'login') as day0_login,
           bool_or(e.event = 'nickname_step' and e.step = 'view') as day0_name_screen,
           bool_or(e.event = 'character_select') as day0_character,
           bool_or(e.event in ('chop_tree', 'plant_seed', 'harvest_crop')) as day0_first_action,
           bool_or(e.event = 'harvest_crop') as day0_harvest,
           bool_or(e.event = 'house_build' and e.stage ~ '^\d+$' and e.stage::int >= 1) as day0_house1,
           bool_or(e.event = 'house_build' and e.stage ~ '^\d+$' and e.stage::int >= 3) as day0_house3
    from events e join first_ev f using (device) where e.day = f.first_day group by e.device
  ),
  ret as (
    select f.device,
           bool_or(e.day = f.first_day + 1) as d1,
           bool_or(e.day = f.first_day + 7) as d7,
           bool_or(e.day between f.first_day + 1 and f.first_day + 7) as w1
    from first_ev f join events e using (device) group by f.device
  )
  select f.device, f.first_day, f.first_platform, f.first_host, f.country, f.os, f.device_cat,
         substring(f.landing from '[?&]utm_source=([^&#]+)') as utm_source,
         substring(f.landing from '[?&]utm_campaign=([^&#]+)') as utm_campaign,
         substring(f.landing from '[?&]utm_content=([^&#]+)') as utm_content,
         a.exp_login, a.exp_guide, a.exp_name, a.exp_space, a.exp_arm, a.install_source, a.install_campaign, a.heard_from,
         d0.day0_login_screen, d0.day0_login, d0.day0_name_screen, d0.day0_character, d0.day0_first_action,
         d0.day0_harvest, d0.day0_house1, d0.day0_house3,
         r.d1, r.d7, r.w1, a.last_day, a.active_days, a.events, a.is_test
  from first_ev f join agg a using (device) left join d0 using (device) left join ret r using (device);
  alter table devices_next add primary key (device);
  drop table devices cascade;
  alter table devices_next rename to devices;
  create view devices_real as select * from devices where not is_test;
end
$$;
