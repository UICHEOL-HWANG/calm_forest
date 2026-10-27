create table if not exists public.forage_runs (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users on delete cascade,
  session_id text,
  client_id text,
  is_guest boolean,
  variant text,
  platform text,
  run_date date,
  run_id uuid not null,
  mode text not null,
  logic_v smallint not null,
  outcome text not null,
  abandon_stage text,
  end_reason text,
  duration_ms integer,
  items smallint,
  coins integer,
  sell_value integer,
  rare_count smallint,
  good smallint,
  bad smallint,
  bag jsonb,
  attempt_n integer,
  first_time boolean,
  entry text,
  prev_mode text,
  night boolean,
  weather text,
  season text,
  input text,
  orientation text,
  fps_avg real,
  coins_before integer,
  ease real,
  arm smallint,
  dda real,
  probe_v smallint,
  win real,
  breath_s real,
  tide_s real,
  acts jsonb,
  lost_tide smallint,
  lost_miss smallint,
  idle_ms integer,
  dives jsonb,
  picks jsonb,
  created_at timestamptz not null default now(),
  constraint forage_runs_run_id_key unique (run_id),
  constraint forage_runs_mode check (mode in ('mudflat', 'dive')),
  constraint forage_runs_logic_v check (logic_v in (1)),
  constraint forage_runs_outcome check (outcome in ('finish', 'abandon')),
  constraint forage_runs_end_reason check (end_reason is null or end_reason in ('tide', 'dives', 'exit')),
  constraint forage_runs_entry check (entry is null or entry in ('pick', 'again')),
  constraint forage_runs_prev_mode check (prev_mode is null or prev_mode in ('fish', 'mudflat', 'dive')),
  constraint forage_runs_platform check (platform is null or platform in ('web', 'toss', 'itch', 'android', 'ios')),
  constraint forage_runs_json_size check (
    coalesce(octet_length(bag::text), 0) + coalesce(octet_length(acts::text), 0)
    + coalesce(octet_length(dives::text), 0) + coalesce(octet_length(picks::text), 0) <= 16384
  ),
  constraint forage_runs_text_len check (
    char_length(coalesce(session_id, '')) <= 64 and char_length(coalesce(client_id, '')) <= 64
    and char_length(coalesce(variant, '')) <= 32 and char_length(coalesce(abandon_stage, '')) <= 32
    and char_length(coalesce(weather, '')) <= 16 and char_length(coalesce(season, '')) <= 16
    and char_length(coalesce(input, '')) <= 16 and char_length(coalesce(orientation, '')) <= 16
  ),
  constraint forage_runs_caps check (
    (items is null or items <= 1000) and (good is null or good <= 1000) and (bad is null or bad <= 1000)
    and (rare_count is null or rare_count <= 1000) and (lost_tide is null or lost_tide <= 1000) and (lost_miss is null or lost_miss <= 1000)
  ),
  constraint forage_runs_nonneg check (
    (duration_ms is null or duration_ms >= 0) and (items is null or items >= 0) and (coins is null or coins >= 0)
    and (sell_value is null or sell_value >= 0) and (rare_count is null or rare_count >= 0)
    and (good is null or good >= 0) and (bad is null or bad >= 0) and (attempt_n is null or attempt_n >= 0)
    and (lost_tide is null or lost_tide >= 0) and (lost_miss is null or lost_miss >= 0) and (idle_ms is null or idle_ms >= 0)
  )
);

create index if not exists forage_runs_user_idx on public.forage_runs (user_id);
create index if not exists forage_runs_date_mode_idx on public.forage_runs (run_date, mode);

create or replace function public.forage_runs_kst_date() returns trigger
language plpgsql set search_path = public as $$
begin
  new.run_date := (now() at time zone 'Asia/Seoul')::date;
  return new;
end $$;

drop trigger if exists forage_runs_kst_date on public.forage_runs;
create trigger forage_runs_kst_date before insert on public.forage_runs
  for each row execute function public.forage_runs_kst_date();

alter table public.forage_runs enable row level security;
drop policy if exists forage_runs_select_own on public.forage_runs;
create policy forage_runs_select_own on public.forage_runs
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists forage_runs_insert_own on public.forage_runs;
create policy forage_runs_insert_own on public.forage_runs
  for insert to authenticated with check ((select auth.uid()) = user_id);
