-- =============================================================
--  🧯 클라이언트 오류 로그 (dev/active/client-logs)
--  ------------------------------------------------------------
--  client_errors       — 원본. /api/logs(Worker, service role)만 쓴다. 최대 이틀치만 머문다:
--                        매일 새벽 DAG client_logs_daily 가 어제치를 OCI 버킷 파일 1개로 묶어 올린 뒤 지운다.
--  client_error_daily  — 날짜 × 오류 서명 요약. DAG 가 채운다. 관리자 페이지·경보가 읽는다.
--  ingest_client_errors(jsonb) — Worker 가 부르는 적재 함수.
--    🛟 쿠션: 하루 상한(50,000행)을 넘으면 조용히 버린다(누가 /api/logs 를 두드려도 DB 가 안 찬다),
--            id 중복(재전송)은 무시, 모든 열에 길이 CHECK.
--  RLS: 일반 유저는 아무것도 못 본다. 관리자(cf_is_admin)만 읽는다.
-- =============================================================

begin;

create table if not exists public.client_errors (
  id           uuid primary key,                        -- 기기가 만든 event_id — 재전송 중복 제거
  received_at  timestamptz not null default now(),
  ts           timestamptz,                             -- 기기 시각(틀릴 수 있다)
  kind         text not null check (kind in ('error','resource','rejection','console','http','network')),
  msg          text not null check (length(msg) <= 600),
  stack        text check (length(stack) <= 1100),
  url          text check (length(url) <= 320),
  status       int  check (status between 0 and 999),
  platform     text check (platform in ('web','toss','itch','android','ios')),
  uid8         text check (uid8 ~ '^[0-9a-f]{8}$'),     -- 유저 UUID 앞 8자만
  path         text check (length(path) <= 120),
  suppressed   int  not null default 0 check (suppressed between 0 and 100000)   -- 같은 묶음에서 반복이라 뺀 건수
);
create index if not exists client_errors_received_idx on public.client_errors (received_at);

create table if not exists public.client_error_daily (
  day        date not null,
  sig        text not null check (length(sig) <= 300),  -- kind | msg 앞 200자 | status
  kind       text not null,
  sample_msg text not null check (length(sample_msg) <= 600),
  n          int  not null check (n >= 0),
  users      int  not null check (users >= 0),
  platforms  jsonb not null default '{}'::jsonb check (pg_column_size(platforms) <= 2048),
  file_key   text check (length(file_key) <= 200),      -- OCI 버킷 원본 파일
  primary key (day, sig)
);

alter table public.client_errors      enable row level security;
alter table public.client_error_daily enable row level security;

drop policy if exists client_errors_admin_read on public.client_errors;
create policy client_errors_admin_read on public.client_errors
  for select to authenticated using ((select public.cf_is_admin()));
drop policy if exists client_error_daily_admin_read on public.client_error_daily;
create policy client_error_daily_admin_read on public.client_error_daily
  for select to authenticated using ((select public.cf_is_admin()));

create or replace function public.ingest_client_errors(rows jsonb)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  today_count int;
  inserted int;
begin
  if jsonb_typeof(rows) <> 'array' or jsonb_array_length(rows) > 20 then
    return 0;
  end if;
  select count(*) into today_count from public.client_errors where received_at >= date_trunc('day', now());
  if today_count >= 50000 then
    return 0;                                   -- 🛟 하루 상한 — 넘치면 버린다(Workers Logs 에는 남는다)
  end if;
  insert into public.client_errors (id, ts, kind, msg, stack, url, status, platform, uid8, path, suppressed)
  select (r->>'id')::uuid,
         to_timestamp((r->>'ts')::double precision / 1000),
         r->>'kind', r->>'msg', r->>'stack', r->>'url',
         (r->>'status')::int, r->>'platform', r->>'uid8', r->>'path',
         coalesce((r->>'suppressed')::int, 0)
    from jsonb_array_elements(rows) r
  on conflict (id) do nothing;
  get diagnostics inserted = row_count;
  return inserted;
end;
$$;
revoke all on function public.ingest_client_errors(jsonb) from public, anon, authenticated;
grant execute on function public.ingest_client_errors(jsonb) to service_role;

commit;

-- 확인:
--   select count(*) from client_errors;                          -- 0
--   select has_function_privilege('anon', 'public.ingest_client_errors(jsonb)', 'execute');   -- false
