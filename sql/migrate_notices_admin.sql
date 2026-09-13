-- =============================================================
--  📮 소식함 관리자 페이지(dashboards/notices_admin.html) 권한 — 2026-09-13
--  ------------------------------------------------------------
--  페이지가 API 없이 브라우저에서 supabase-js 로 notices 를 직접 insert/update/delete 한다.
--  그래서 "누가 써도 되는가"는 전적으로 RLS 가 정한다 — 관리자 이메일 허용목록 하나로 잠근다.
--
--  · cf_is_admin(): 호출자 JWT 의 이메일이 허용목록에 있으면 true.
--      admin_analytics.sql / migrate_beta_diary_q7.sql 의 admins 배열과 같은 명단을 유지할 것.
--  · notices: 관리자는 전체 읽기(답장 포함)·쓰기·수정·삭제. 일반 유저는 기존 select 정책 그대로.
--  · feedback: 관리자는 전체 읽기(답장 대상 고르기용). 일반 유저는 기존 정책(본인 insert/select) 그대로.
--
--  적용: Supabase SQL Editor 에서 1회 실행. (이 저장소의 supabase MCP 는 read-only)
--  검증: 관리자 계정으로 페이지 열기 → 게이트 통과 · 비관리자 계정 → "관리자 계정이 아닙니다".
-- =============================================================

begin;

create or replace function public.cf_is_admin()
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select lower(coalesce(auth.jwt() ->> 'email', ''))
         = any (array['icuchoel@gmail.com', 'cheorish.hw@gmail.com']);   -- ★ 관리자 이메일(소문자)
$$;
grant execute on function public.cf_is_admin() to authenticated;

-- notices: 관리자 전권. (select ...) 로 감싸 InitPlan 1회 평가(migrate_struct_01 규칙)
drop policy if exists notices_admin_select on public.notices;
create policy notices_admin_select on public.notices
  for select to authenticated using ((select public.cf_is_admin()));

drop policy if exists notices_admin_insert on public.notices;
create policy notices_admin_insert on public.notices
  for insert to authenticated with check ((select public.cf_is_admin()));

drop policy if exists notices_admin_update on public.notices;
create policy notices_admin_update on public.notices
  for update to authenticated
  using ((select public.cf_is_admin())) with check ((select public.cf_is_admin()));

drop policy if exists notices_admin_delete on public.notices;
create policy notices_admin_delete on public.notices
  for delete to authenticated using ((select public.cf_is_admin()));

-- feedback: 관리자는 전체 읽기(답장할 원문 고르기)
drop policy if exists feedback_admin_select on public.feedback;
create policy feedback_admin_select on public.feedback
  for select to authenticated using ((select public.cf_is_admin()));

commit;
