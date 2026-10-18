create table if not exists public.cf_session_zones (
  session_id text    not null,
  day        date    not null,
  persona    boolean not null default false,
  uid        text,
  path       text[]  not null,
  dwell      jsonb   not null default '{}'::jsonb,
  primary key (session_id, day)
);
create index if not exists cf_session_zones_day_idx on public.cf_session_zones (day);
alter table public.cf_session_zones enable row level security;
revoke all on public.cf_session_zones from anon, authenticated;

create or replace function public.cf_zone_of(x double precision, z double precision)
returns text
language sql
immutable
as $$
  select coalesce(
    case when abs(x) <= 46 and abs(z) <= 46 then coalesce(
      (select v.k from (values
        ('spawn', 0, 0, 4), ('stop', 16, 17, 2.5), ('neighbor_gate', -4, 25, 2.5),
        ('house', -8, -8, 5), ('bench', 5.5, -5.5, 3.5), ('shop', -17.5, -4, 4),
        ('market', 11, 2.5, 4.5), ('lake', 16, 9, 7), ('farm_gate', 0, 7, 3),
        ('coop', -4.5, 11.5, 3), ('cafe_gate', 4, 14, 3), ('glade', 7, 26, 7),
        ('light_workshop', 16.5, 33.5, 4), ('forest', -18, 23, 9), ('mine_gate', -14, 3, 3),
        ('museum_gate', -26, 5, 3.5), ('observatory_gate', 25, 22, 3.5), ('dock', 0, -18, 6),
        ('sea_gate', 14.5, -12.5, 3), ('mountain_gate', -15, -32, 5), ('mist_gate', -21, -20, 3),
        ('orchard_gate', 33, 7, 3)
      ) v(k, cx, cz, r)
      where (x - v.cx) ^ 2 + (z - v.cz) ^ 2 <= v.r ^ 2
      limit 1), 'road') end,
    (select s.k from (values
        ('house_in', 0, 52, 14), ('farm', 0, 84, 30), ('orchard', 0, 160, 40), ('mine', 0, 250, 20),
        ('cafe', 0, 320, 16), ('museum', 0, 360, 30), ('kitchen', 0, 420, 20), ('carving', 0, 460, 15),
        ('prologue', 0, 480, 15), ('observatory', 0, 540, 12), ('neighbor', 0, 700, 40),
        ('neighbor_in', 0, 780, 14), ('mist', 0, -250, 60), ('sea', 400, 0, 80), ('mountain', 0, -1000, 90)
      ) s(k, cx, cz, r)
      where (x - s.cx) ^ 2 + (z - s.cz) ^ 2 <= s.r ^ 2
      order by (x - s.cx) ^ 2 + (z - s.cz) ^ 2
      limit 1),
    'unknown')
$$;
revoke all on function public.cf_zone_of(double precision, double precision) from public, anon, authenticated;
