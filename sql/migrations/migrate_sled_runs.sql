create table if not exists public.sled_runs (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users on delete cascade,
  session_id text,
  client_id text,
  is_guest boolean,
  variant text,
  platform text,
  run_date date,
  run_id uuid not null,
  outcome text not null,
  abandon_stage text,
  time_ms integer,
  flags_passed smallint,
  penalty_ms integer,
  rewarded boolean,
  coins integer,
  splits jsonb,
  boosts_at jsonb,
  hits jsonb,
  steer_left_ms integer,
  steer_right_ms integer,
  attempt_n integer,
  days_since_unlock integer,
  best_before_ms integer,
  acorns_available smallint,
  acorns_collected smallint,
  climb_ms integer,
  input text,
  orientation text,
  fps_avg real,
  course_v smallint not null,
  phys_v smallint not null,
  ease real,
  arm smallint,
  dda real,
  probe_v smallint,
  created_at timestamptz not null default now(),
  constraint sled_runs_run_id_key unique (run_id),
  constraint sled_runs_outcome check (outcome in ('finish', 'abandon')),
  constraint sled_runs_platform check (platform is null or platform in ('web', 'toss', 'itch', 'android', 'ios')),
  constraint sled_runs_json_size check (
    coalesce(pg_column_size(splits), 0) + coalesce(pg_column_size(boosts_at), 0) + coalesce(pg_column_size(hits), 0) < 8192
  )
);

create index if not exists sled_runs_user_idx on public.sled_runs (user_id);
create index if not exists sled_runs_date_idx on public.sled_runs (run_date);
create index if not exists sled_runs_board_idx on public.sled_runs (run_date, outcome, time_ms);
create index if not exists sled_runs_created_idx on public.sled_runs (created_at);

create or replace function public.sled_runs_min_time() returns trigger
language plpgsql as $$
begin
  if new.outcome = 'finish' and new.course_v = 1 and (new.time_ms is null or new.time_ms < 13750) then
    raise exception 'sled time below theoretical minimum';
  end if;
  return new;
end $$;

drop trigger if exists sled_runs_min_time on public.sled_runs;
create trigger sled_runs_min_time before insert on public.sled_runs
  for each row execute function public.sled_runs_min_time();

alter table public.sled_runs enable row level security;
drop policy if exists sled_runs_select_own on public.sled_runs;
create policy sled_runs_select_own on public.sled_runs
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists sled_runs_insert_own on public.sled_runs;
create policy sled_runs_insert_own on public.sled_runs
  for insert to authenticated with check ((select auth.uid()) = user_id);
