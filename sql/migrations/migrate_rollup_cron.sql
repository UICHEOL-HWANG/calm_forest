create extension if not exists pg_cron with schema pg_catalog;

create or replace function public.cf_rollup_recent()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  today date := (now() at time zone 'Asia/Seoul')::date;
begin
  if pg_try_advisory_xact_lock(hashtext('cf_rollup')) then
    perform public.cf_rollup(today - 1, today);
  end if;
end
$$;

revoke all on function public.cf_rollup_recent() from public, anon, authenticated;

select cron.unschedule(jobid) from cron.job where jobname = 'cf_rollup_recent';

select cron.schedule('cf_rollup_recent', '*/10 * * * *', $$select public.cf_rollup_recent()$$);
