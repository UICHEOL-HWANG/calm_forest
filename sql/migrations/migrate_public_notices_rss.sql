-- =============================================================
--  /rss.xml 용 전체 공지 읽기 함수 (dev/archive/seo-basics)
--  notices RLS 는 authenticated 만 읽게 돼 있어 anon 키를 쓰는 Worker 가 못 읽는다.
--  전체 공지(target_user_id is null, reply_to is null)만 돌려주는 security definer 함수로 연다.
--  개인 답장은 절대 나가지 않는다.
-- =============================================================
begin;

create or replace function public.public_notices(n int default 20)
returns table (id bigint, title text, body text, created_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select id, title, body, created_at
  from public.notices
  where target_user_id is null and reply_to is null
  order by id desc
  limit least(greatest(coalesce(n, 20), 1), 50)
$$;

revoke all on function public.public_notices(int) from public;
grant execute on function public.public_notices(int) to anon, authenticated;

commit;
