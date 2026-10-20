create table if not exists public.push_register_log (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null check (platform in ('android','ios')),
  result text not null check (result in ('granted','denied','error','dismissed','skipped')),
  stage text check (stage in ('permission','register','post','exception')),
  via text check (via in ('card','settings','refresh')),
  reason text check (char_length(reason) <= 200),
  created_at timestamptz not null default now()
);

create index if not exists push_register_log_created_idx on public.push_register_log (created_at desc);
create index if not exists push_register_log_user_idx on public.push_register_log (user_id);

alter table public.push_register_log enable row level security;
revoke all on public.push_register_log from anon, authenticated;

do $$
declare uid uuid; n int;
begin
  select id into uid from auth.users order by created_at limit 1;
  insert into public.push_register_log (user_id, platform, result, stage, via, reason)
    values (uid, 'ios', 'error', 'register', 'card', 'selftest');
  begin
    insert into public.push_register_log (user_id, platform, result) values (uid, 'web', 'granted');
    raise exception 'platform check missing';
  exception when check_violation then null;
  end;
  begin
    insert into public.push_register_log (user_id, platform, result) values (uid, 'ios', 'hacked');
    raise exception 'result check missing';
  exception when check_violation then null;
  end;
  if has_table_privilege('anon', 'public.push_register_log', 'select')
     or has_table_privilege('authenticated', 'public.push_register_log', 'insert') then
    raise exception 'client roles must not touch push_register_log';
  end if;
  delete from public.push_register_log where reason = 'selftest' and created_at >= now();
  select count(*) into n from public.push_register_log where reason = 'selftest';
  if n <> 0 then raise exception 'selftest rows left: %', n; end if;
  raise notice 'push_register_log selftest ok';
end $$;
