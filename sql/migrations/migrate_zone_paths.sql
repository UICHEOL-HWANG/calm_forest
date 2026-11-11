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
language plpgsql
immutable
parallel safe
as $fn$
declare
  d double precision;
  best double precision;
  k text;
begin
  if abs(x) <= 46 and abs(z) <= 46 then
    if (x - (0))^2 + (z - (0))^2 <= 16 then return 'spawn'; end if;
    if (x - (16))^2 + (z - (17))^2 <= 6.25 then return 'stop'; end if;
    if (x - (-4))^2 + (z - (25))^2 <= 6.25 then return 'neighbor_gate'; end if;
    if (x - (-8))^2 + (z - (-8))^2 <= 25 then return 'house'; end if;
    if (x - (5.5))^2 + (z - (-5.5))^2 <= 12.25 then return 'bench'; end if;
    if (x - (-17.5))^2 + (z - (-4))^2 <= 16 then return 'shop'; end if;
    if (x - (11))^2 + (z - (2.5))^2 <= 20.25 then return 'market'; end if;
    if (x - (16))^2 + (z - (9))^2 <= 49 then return 'lake'; end if;
    if (x - (0))^2 + (z - (7))^2 <= 9 then return 'farm_gate'; end if;
    if (x - (-4.5))^2 + (z - (11.5))^2 <= 9 then return 'coop'; end if;
    if (x - (4))^2 + (z - (14))^2 <= 9 then return 'cafe_gate'; end if;
    if (x - (7))^2 + (z - (26))^2 <= 49 then return 'glade'; end if;
    if (x - (16.5))^2 + (z - (33.5))^2 <= 16 then return 'light_workshop'; end if;
    if (x - (-18))^2 + (z - (23))^2 <= 81 then return 'forest'; end if;
    if (x - (-14))^2 + (z - (3))^2 <= 9 then return 'mine_gate'; end if;
    if (x - (-26))^2 + (z - (5))^2 <= 12.25 then return 'museum_gate'; end if;
    if (x - (25))^2 + (z - (22))^2 <= 12.25 then return 'observatory_gate'; end if;
    if (x - (0))^2 + (z - (-18))^2 <= 36 then return 'dock'; end if;
    if (x - (10.5))^2 + (z - (-15))^2 <= 20.25 then return 'auction'; end if;
    if (x - (19.5))^2 + (z - (-12.5))^2 <= 9 then return 'sea_gate'; end if;
    if (x - (-15))^2 + (z - (-32))^2 <= 25 then return 'mountain_gate'; end if;
    if (x - (-21))^2 + (z - (-20))^2 <= 9 then return 'mist_gate'; end if;
    if (x - (33))^2 + (z - (7))^2 <= 9 then return 'orchard_gate'; end if;
    return 'road';
  end if;
  d := (x - (0))^2 + (z - (52))^2;
  if d <= 196 and (best is null or d < best) then best := d; k := 'house_in'; end if;
  d := (x - (0))^2 + (z - (84))^2;
  if d <= 900 and (best is null or d < best) then best := d; k := 'farm'; end if;
  d := (x - (0))^2 + (z - (160))^2;
  if d <= 1600 and (best is null or d < best) then best := d; k := 'orchard'; end if;
  d := (x - (0))^2 + (z - (250))^2;
  if d <= 400 and (best is null or d < best) then best := d; k := 'mine'; end if;
  d := (x - (0))^2 + (z - (320))^2;
  if d <= 256 and (best is null or d < best) then best := d; k := 'cafe'; end if;
  d := (x - (0))^2 + (z - (360))^2;
  if d <= 900 and (best is null or d < best) then best := d; k := 'museum'; end if;
  d := (x - (0))^2 + (z - (420))^2;
  if d <= 400 and (best is null or d < best) then best := d; k := 'kitchen'; end if;
  d := (x - (0))^2 + (z - (460))^2;
  if d <= 225 and (best is null or d < best) then best := d; k := 'carving'; end if;
  d := (x - (0))^2 + (z - (480))^2;
  if d <= 225 and (best is null or d < best) then best := d; k := 'prologue'; end if;
  d := (x - (0))^2 + (z - (540))^2;
  if d <= 144 and (best is null or d < best) then best := d; k := 'observatory'; end if;
  d := (x - (0))^2 + (z - (700))^2;
  if d <= 1600 and (best is null or d < best) then best := d; k := 'neighbor'; end if;
  d := (x - (0))^2 + (z - (780))^2;
  if d <= 196 and (best is null or d < best) then best := d; k := 'neighbor_in'; end if;
  d := (x - (0))^2 + (z - (-250))^2;
  if d <= 3600 and (best is null or d < best) then best := d; k := 'mist'; end if;
  d := (x - (400))^2 + (z - (0))^2;
  if d <= 6400 and (best is null or d < best) then best := d; k := 'sea'; end if;
  d := (x - (0))^2 + (z - (-1000))^2;
  if d <= 8100 and (best is null or d < best) then best := d; k := 'mountain'; end if;
  return coalesce(k, 'unknown');
end
$fn$;
revoke all on function public.cf_zone_of(double precision, double precision) from public, anon, authenticated;
