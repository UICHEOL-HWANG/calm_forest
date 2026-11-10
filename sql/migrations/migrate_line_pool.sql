create table if not exists public.line_pool (
  id bigint generated always as identity primary key,
  kind text not null check (kind in ('auction', 'port')),
  key text not null check (char_length(key) between 1 and 40),
  slot text not null check (char_length(slot) between 1 and 20),
  lang text not null check (lang in ('ko', 'en')),
  text text not null check (char_length(text) between 1 and 200),
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index if not exists line_pool_uniq on public.line_pool (kind, key, slot, lang, text);
create index if not exists line_pool_cell on public.line_pool (kind, key, slot, lang) where not hidden;

create table if not exists public.line_picks (
  date date not null,
  kind text not null,
  key text not null,
  slot text not null,
  lang text not null,
  line_id bigint not null references public.line_pool (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (date, kind, key, slot, lang, line_id)
);

create table if not exists public.line_pool_runs (
  id bigint generated always as identity primary key,
  ran_at timestamptz not null default now(),
  source text not null check (source in ('cron', 'seed')),
  requested int not null default 0,
  inserted int not null default 0,
  failed int not null default 0,
  calls int not null default 0,
  rate_limited boolean not null default false,
  error text,
  duration_ms int
);

alter table public.line_pool       enable row level security;
alter table public.line_picks      enable row level security;
alter table public.line_pool_runs  enable row level security;

create or replace function public.line_pick_many(p_kind text, p_keys text[], p_lang text, p_seed text, p_n int)
returns table (key text, slot text, id bigint, text text)
language sql stable security definer set search_path = public as $$
  select s.key, s.slot, s.id, s.text from (
    select p.key, p.slot, p.id, p.text,
      row_number() over (partition by p.key, p.slot order by md5(p_seed || '/' || p.key || '/' || p.id::text)) as rn
    from public.line_pool p
    where p.kind = p_kind and p.key = any(p_keys) and p.lang = p_lang and not p.hidden
  ) s
  where s.rn <= greatest(least(p_n, 10), 0)
$$;

create or replace function public.line_pool_counts()
returns table (kind text, key text, slot text, lang text, n bigint)
language sql stable security definer set search_path = public as $$
  select p.kind, p.key, p.slot, p.lang, count(*) from public.line_pool p where not p.hidden group by 1, 2, 3, 4
$$;

revoke all on function public.line_pick_many(text, text[], text, text, int) from public, anon, authenticated;
revoke all on function public.line_pool_counts() from public, anon, authenticated;
grant execute on function public.line_pick_many(text, text[], text, text, int) to service_role;
grant execute on function public.line_pool_counts() to service_role;
