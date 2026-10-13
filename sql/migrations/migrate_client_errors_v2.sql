-- =============================================================
--  🧯 클라이언트 오류 로그 v2 — 리뷰 반영(2026-10-13). migrate_client_errors.sql 다음에 실행.
--  ------------------------------------------------------------
--  ① search_path = '' (security definer 하드닝 — 테이블·함수는 전부 스키마를 붙여 쓴다)
--  ② 하루 상한 50,000 → 20,000 행
--  ③ 스스로 정리: DAG 가 며칠 멈춰도 DB 가 차지 않게, 호출 50번에 한 번꼴로 3일 지난 행을 최대 5,000개 지운다
--  ④ ts 범위 보호: 지금 ±1년 밖이면 null(to_timestamp 범위 오류로 묶음 전체가 실패하지 않게 — Worker 도 거른다)
-- =============================================================

begin;

create or replace function public.ingest_client_errors(rows jsonb)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  today_count int;
  inserted int;
  now_ms double precision := extract(epoch from now()) * 1000;
begin
  if jsonb_typeof(rows) <> 'array' or jsonb_array_length(rows) > 20 then
    return 0;
  end if;

  if random() < 0.02 then                                   -- ③
    delete from public.client_errors
     where ctid in (select ctid from public.client_errors
                     where received_at < now() - interval '3 days' limit 5000);
  end if;

  select count(*) into today_count from public.client_errors where received_at >= pg_catalog.date_trunc('day', now());
  if today_count >= 20000 then                              -- ②
    return 0;
  end if;

  insert into public.client_errors (id, ts, kind, msg, stack, url, status, platform, uid8, path, suppressed)
  select (r->>'id')::uuid,
         case when (r->>'ts') ~ '^-?[0-9]+(\.[0-9]+)?$'
                   and abs((r->>'ts')::double precision - now_ms) < 31536000000
              then pg_catalog.to_timestamp((r->>'ts')::double precision / 1000) end,   -- ④
         r->>'kind', r->>'msg', r->>'stack', r->>'url',
         (r->>'status')::int, r->>'platform', r->>'uid8', r->>'path',
         coalesce((r->>'suppressed')::int, 0)
    from pg_catalog.jsonb_array_elements(rows) r
  on conflict (id) do nothing;
  get diagnostics inserted = row_count;
  return inserted;
end;
$$;
revoke all on function public.ingest_client_errors(jsonb) from public, anon, authenticated;
grant execute on function public.ingest_client_errors(jsonb) to service_role;

commit;
